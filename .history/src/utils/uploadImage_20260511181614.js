// utils/uploadImage.js
// ─── Upload Cloudinary — Safari iOS/Mac + Chrome compatible ─────────────────
// Corrections :
//  • fetch natif au lieu d'axios (axios pose des problèmes de CORS preflight sur Safari)
//  • Retry automatique x3 avec backoff exponentiel
//  • Timeout manuel via AbortController (Safari ignore parfois les timeouts axios)
//  • FormData construit de façon explicite (compatibilité HEIC / iOS)
//  • Aucun header Content-Type manuel (le navigateur le pose lui-même avec le boundary)

const CLOUDINARY_URL  = 'https://api.cloudinary.com/v1_1/dt3zluycp/image/upload';
const UPLOAD_PRESET   = 'magical_hand';
const MAX_RETRIES     = 3;
const BASE_TIMEOUT_MS = 30_000; // 30 s par tentative

/**
 * Tente l'upload une seule fois avec un AbortController pour le timeout.
 * @param {File} file
 * @param {number} attempt  (1-based, pour ajuster le timeout)
 * @returns {Promise<string>}  secure_url Cloudinary
 */
async function attemptUpload(file, attempt = 1) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(
    () => controller.abort(),
    BASE_TIMEOUT_MS * attempt   // 30s / 60s / 90s selon la tentative
  );

  try {
    const formData = new FormData();
    // Sur iOS le File peut avoir un nom générique — on force un nom JPEG propre
    const safeFile = file.name ? file : new File([file], 'preuve-paiement.jpg', { type: 'image/jpeg' });
    formData.append('file',           safeFile);
    formData.append('upload_preset',  UPLOAD_PRESET);

    // ⚠️ Ne JAMAIS ajouter un header 'Content-Type' manuellement avec FormData :
    //    le navigateur doit injecter lui-même le boundary correct.
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body:   formData,
      signal: controller.signal,
      // mode: 'cors' est le défaut — on le laisse implicite
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Cloudinary retourne du JSON même en cas d'erreur
      let errMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData?.error?.message || errMsg;
      } catch (_) { /* ignore */ }
      throw new Error(errMsg);
    }

    const data = await response.json();

    if (!data?.secure_url) {
      throw new Error('Réponse Cloudinary invalide : secure_url absent');
    }

    return data.secure_url;

  } catch (err) {
    clearTimeout(timeoutId);
    throw err; // re-throw pour que uploadImage gère le retry
  }
}

/**
 * Upload avec retry automatique.
 * @param {File} file  — doit déjà être converti en JPEG par convertToJpeg()
 * @returns {Promise<string>}  secure_url
 */
export async function uploadImage(file) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = await attemptUpload(file, attempt);
      return url;
    } catch (err) {
      lastError = err;

      // Ne pas retenter si l'utilisateur a annulé (AbortError volontaire)
      const isAbort = err?.name === 'AbortError';
      // Ne pas retenter les erreurs HTTP 4xx (fichier invalide, preset incorrect…)
      const is4xx   = err?.message?.startsWith('HTTP 4');

      if (isAbort || is4xx) break;

      if (attempt < MAX_RETRIES) {
        // Backoff : 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        console.warn(`[uploadImage] Tentative ${attempt} échouée, retry dans ${1000 * Math.pow(2, attempt - 1)}ms…`, err?.message);
      }
    }
  }

  // Toutes les tentatives ont échoué
  console.error('[uploadImage] Échec définitif après', MAX_RETRIES, 'tentatives :', lastError);
  throw lastError;
}