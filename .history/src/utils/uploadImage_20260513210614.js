// utils/uploadImage.js
// ─── Upload Cloudinary — Robuste, Mobile-first, Retry intelligent ─────────────
//
// Améliorations vs version précédente :
//  • Compression canvas avant upload (max 1200px, qualité adaptative)
//  • Détection réseau offline / connexion lente (Network Information API)
//  • Retry x3 avec backoff exponentiel + jitter anti-thundering-herd
//  • Timeout via AbortController (20s/30s/45s selon tentative)
//  • Messages d'erreur humains centralisés
//  • Progress via XMLHttpRequest (fetch n'expose pas le progress)
//  • Callbacks : onProgress, onStatus, onRetry pour l'UI

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dt3zluycp/image/upload';
const UPLOAD_PRESET  = 'magical_hand';
const MAX_RETRIES    = 3;
const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB après compression
const MAX_DIMENSION  = 1200;            // px max côté le plus long

// ─── Messages d'erreur humains ────────────────────────────────────────────────

export const UPLOAD_ERRORS = {
  OFFLINE:        '📶 Vous êtes hors ligne. Reconnectez-vous puis réessayez.',
  SLOW_NET:       '📶 Connexion instable détectée. Tentative en cours…',
  TOO_LARGE:      '❌ L\'image est trop lourde même après compression (max 3MB).',
  INVALID_TYPE:   '❌ Format non supporté. Utilisez JPG, PNG ou HEIC.',
  TIMEOUT:        '❌ Upload interrompu — connexion trop lente. Réessayez.',
  SERVER_ERROR:   '❌ Serveur temporairement indisponible. Réessayez dans quelques instants.',
  AUTH_ERROR:     '❌ Erreur de configuration upload. Contactez le support.',
  UNKNOWN:        '⚠️ Connexion instable, veuillez réessayer.',
  COMPRESSION:    '⚠️ Impossible de compresser l\'image. Tentative avec le fichier original.',
  RETRYING:       (n, max) => `🔁 Nouvelle tentative ${n}/${max} en cours…`,
  SUCCESS:        '✅ Preuve envoyée avec succès !',
};

// ─── Détection réseau ─────────────────────────────────────────────────────────

export function getNetworkStatus() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return {
    isOffline:   !navigator.onLine,
    isSlow:      conn ? ['slow-2g', '2g'].includes(conn.effectiveType) : false,
    effectiveType: conn?.effectiveType || 'unknown',
    downlink:    conn?.downlink || null,
  };
}

// ─── Compression canvas ───────────────────────────────────────────────────────

/**
 * Compresse une image via canvas.
 * Retourne un File JPEG optimisé.
 * @param {File} file
 * @param {function} [onStatus]  callback(message: string)
 * @returns {Promise<File>}
 */
export async function compressImage(file, onStatus) {
  // Validation type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const isValid = validTypes.includes(file.type.toLowerCase()) || file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i);
  if (!isValid) throw new Error(UPLOAD_ERRORS.INVALID_TYPE);

  onStatus?.('Compression de l\'image…');

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let { naturalWidth: w, naturalHeight: h } = img;

        // Redimensionnement proportionnel
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          if (w >= h) { h = Math.round((h * MAX_DIMENSION) / w); w = MAX_DIMENSION; }
          else        { w = Math.round((w * MAX_DIMENSION) / h); h = MAX_DIMENSION; }
        }

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        // Qualité adaptative selon taille originale
        const quality = file.size > 2_000_000 ? 0.75 : file.size > 1_000_000 ? 0.82 : 0.88;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) { reject(new Error(UPLOAD_ERRORS.COMPRESSION)); return; }

            // Si compression a rendu plus lourd (rare), on garde l'original
            const resultFile = blob.size < file.size
              ? new File([blob], 'preuve-paiement.jpg', { type: 'image/jpeg' })
              : new File([file], 'preuve-paiement.jpg', { type: 'image/jpeg' });

            if (resultFile.size > MAX_SIZE_BYTES) {
              reject(new Error(UPLOAD_ERRORS.TOO_LARGE));
              return;
            }

            resolve(resultFile);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        // Fallback : retourner le fichier original si canvas échoue
        console.warn('[compressImage] Fallback fichier original:', err.message);
        resolve(new File([file], 'preuve-paiement.jpg', { type: file.type || 'image/jpeg' }));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Sur iOS HEIC : l'image peut ne pas se charger dans img tag — fallback direct
      console.warn('[compressImage] img.onerror → fallback fichier original');
      resolve(new File([file], 'preuve-paiement.jpg', { type: 'image/jpeg' }));
    };

    img.src = objectUrl;
  });
}

// ─── Upload XHR (progress réel) ───────────────────────────────────────────────

/**
 * Upload via XMLHttpRequest pour avoir le progress réel.
 * @param {File} file
 * @param {number} attempt
 * @param {function} [onProgress]  callback(percent: number)
 * @param {function} [onStatus]    callback(message: string)
 * @returns {Promise<string>}  secure_url
 */
function uploadViaXHR(file, attempt, onProgress, onStatus) {
  return new Promise((resolve, reject) => {
    const timeoutMs = [20_000, 30_000, 45_000][attempt - 1] || 45_000;
    let timedOut = false;

    const xhr = new XMLHttpRequest();
    const timeoutId = setTimeout(() => {
      timedOut = true;
      xhr.abort();
      reject(new Error(UPLOAD_ERRORS.TIMEOUT));
    }, timeoutMs);

    // Progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress?.(percent);
      }
    });

    xhr.addEventListener('load', () => {
      clearTimeout(timeoutId);
      if (timedOut) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (!data?.secure_url) {
            reject(new Error('Réponse Cloudinary invalide : secure_url absent'));
          } else {
            onStatus?.('Validation…');
            resolve(data.secure_url);
          }
        } catch {
          reject(new Error(UPLOAD_ERRORS.SERVER_ERROR));
        }
      } else if (xhr.status >= 400 && xhr.status < 500) {
        // 4xx : erreur de config ou fichier invalide — pas de retry utile
        try {
          const err = JSON.parse(xhr.responseText);
          reject(Object.assign(new Error(err?.error?.message || UPLOAD_ERRORS.AUTH_ERROR), { is4xx: true }));
        } catch {
          reject(Object.assign(new Error(UPLOAD_ERRORS.AUTH_ERROR), { is4xx: true }));
        }
      } else {
        reject(new Error(UPLOAD_ERRORS.SERVER_ERROR));
      }
    });

    xhr.addEventListener('error', () => {
      clearTimeout(timeoutId);
      if (!timedOut) reject(new Error(UPLOAD_ERRORS.UNKNOWN));
    });

    xhr.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      if (!timedOut) reject(new Error(UPLOAD_ERRORS.TIMEOUT));
    });

    const formData = new FormData();
    formData.append('file',          file);
    formData.append('upload_preset', UPLOAD_PRESET);

    xhr.open('POST', CLOUDINARY_URL);
    // Ne pas ajouter Content-Type : le navigateur gère le boundary multipart
    xhr.send(formData);

    onStatus?.('Upload en cours…');
  });
}

// ─── Fonction principale : uploadImage ───────────────────────────────────────

/**
 * Upload complet avec compression + retry intelligent.
 *
 * @param {File}     file
 * @param {object}   [options]
 * @param {function} [options.onProgress]  (percent: 0-100) → appelé pendant l'upload
 * @param {function} [options.onStatus]    (message: string) → statut lisible pour l'UI
 * @param {function} [options.onRetry]     (attempt: number, max: number) → notif retry
 * @returns {Promise<string>}  secure_url Cloudinary
 */
export async function uploadImage(file, options = {}) {
  const { onProgress, onStatus, onRetry } = options;

  // ── 1. Vérification réseau ───────────────────────────────────────────────
  const net = getNetworkStatus();
  if (net.isOffline) throw new Error(UPLOAD_ERRORS.OFFLINE);
  if (net.isSlow)    onStatus?.(UPLOAD_ERRORS.SLOW_NET);

  // ── 2. Compression ──────────────────────────────────────────────────────
  let fileToUpload;
  try {
    fileToUpload = await compressImage(file, onStatus);
  } catch (err) {
    if (err.message === UPLOAD_ERRORS.TOO_LARGE || err.message === UPLOAD_ERRORS.INVALID_TYPE) {
      throw err; // erreur fatale, pas de retry
    }
    // Compression échouée → fallback fichier original
    onStatus?.(UPLOAD_ERRORS.COMPRESSION);
    fileToUpload = new File([file], 'preuve-paiement.jpg', { type: file.type || 'image/jpeg' });
  }

  // ── 3. Upload avec retry ─────────────────────────────────────────────────
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Vérifier réseau avant chaque tentative
    if (!navigator.onLine) throw new Error(UPLOAD_ERRORS.OFFLINE);

    if (attempt > 1) {
      onRetry?.(attempt - 1, MAX_RETRIES);
      onStatus?.(UPLOAD_ERRORS.RETRYING(attempt - 1, MAX_RETRIES));
      // Backoff exponentiel + jitter (évite les retries simultanés sur mobile)
      const jitter  = Math.random() * 500;
      const backoff = 1000 * Math.pow(2, attempt - 2) + jitter; // 1s±, 2s±, 4s±
      await new Promise(r => setTimeout(r, backoff));
    }

    try {
      const url = await uploadViaXHR(fileToUpload, attempt, onProgress, onStatus);
      onStatus?.(UPLOAD_ERRORS.SUCCESS);
      return url;
    } catch (err) {
      lastError = err;

      // Erreurs non-retriable
      if (err?.is4xx || err?.message === UPLOAD_ERRORS.OFFLINE) break;

      console.warn(`[uploadImage] Tentative ${attempt}/${MAX_RETRIES} échouée:`, err.message);
    }
  }

  // Toutes tentatives épuisées
  console.error('[uploadImage] Échec définitif:', lastError?.message);
  throw lastError || new Error(UPLOAD_ERRORS.UNKNOWN);
}

export default uploadImage;