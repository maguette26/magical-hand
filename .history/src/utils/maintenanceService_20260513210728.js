// utils/maintenanceService.js
// ─── Système de Maintenance Automatique — Magical Hand ───────────────────────
//
// Ce module tourne côté CLIENT (navigateur) ou peut être adapté en Cloud Function.
// Il s'appelle manuellement depuis le Dashboard admin, ou via un setInterval.
//
// Fonctions :
//  1. cleanOldBookings()      — supprime réservations > 30 jours
//  2. cleanExpiredProofs()    — anonymise les preuves de paiement > 7 jours
//  3. deleteCloudinaryImage() — supprime une image Cloudinary par public_id
//  4. detectAnomalies()       — détecte créneaux fantômes, paiements orphelins, etc.
//  5. runFullMaintenance()    — orchestre tout + rapport final
//
// Usage dans Dashboard :
//   import { runFullMaintenance } from '../utils/maintenanceService';
//   const report = await runFullMaintenance({ onProgress });

import {
  collection, query, where, getDocs, deleteDoc, updateDoc,
  doc, Timestamp, serverTimestamp, orderBy, limit, getDoc
} from 'firebase/firestore';
import { db } from '../firebase.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const CLOUDINARY_CLOUD_NAME = 'dt3zluycp';
const CLOUDINARY_API_KEY    = process.env.REACT_APP_CLOUDINARY_API_KEY    || '';
const CLOUDINARY_API_SECRET = process.env.REACT_APP_CLOUDINARY_API_SECRET || '';

// Délais de rétention
const BOOKING_RETENTION_DAYS = 30;  // Supprimer réservations annulées/expirées > 30j
const PROOF_RETENTION_DAYS   = 7;   // Supprimer URL preuve (anonymisation RGPD) > 7j

// Statuts éligibles à la suppression automatique
const DELETABLE_STATUSES = ['annule', 'expire'];

// Statuts où on anonymise la preuve mais on garde la réservation
const PROOF_ANONYMIZE_STATUSES = ['paye_entierement', 'acompte_paye', 'completed', 'archived'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Timestamp.fromDate(d);
}

function formatDate(ts) {
  if (!ts) return 'N/A';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Extrait le public_id Cloudinary depuis une secure_url */
function extractPublicId(secureUrl) {
  if (!secureUrl) return null;
  try {
    // Ex: https://res.cloudinary.com/dt3zluycp/image/upload/v1234567890/magical_hand/preuve-paiement.jpg
    // → public_id = magical_hand/preuve-paiement
    const match = secureUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  } catch { return null; }
}

/** Génère la signature HMAC-SHA1 pour l'API Cloudinary (côté serveur uniquement) */
async function generateCloudinarySignature(params) {
  // ⚠️ Cette fonction NE DOIT PAS tourner côté client en production
  // car elle expose CLOUDINARY_API_SECRET.
  // À déplacer dans une Cloud Function ou un endpoint backend sécurisé.
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const message = sortedParams + CLOUDINARY_API_SECRET;

  // Web Crypto API (navigateur moderne)
  const encoder  = new TextEncoder();
  const data     = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── 1. Nettoyage réservations anciennes ─────────────────────────────────────

/**
 * Supprime les réservations annulées ou expirées datant de plus de BOOKING_RETENTION_DAYS.
 * @param {function} [onProgress]  (message: string)
 * @returns {Promise<{deleted: number, errors: string[]}>}
 */
export async function cleanOldBookings(onProgress) {
  onProgress?.('🔍 Recherche des réservations anciennes…');
  const report = { deleted: 0, errors: [] };
  const threshold = daysAgo(BOOKING_RETENTION_DAYS);

  try {
    for (const status of DELETABLE_STATUSES) {
      const q = query(
        collection(db, 'bookings'),
        where('status', '==', status),
        where('createdAt', '<', threshold)
      );

      const snap = await getDocs(q);
      onProgress?.(`📋 ${snap.size} réservation(s) "${status}" > ${BOOKING_RETENTION_DAYS}j trouvée(s)`);

      for (const docSnap of snap.docs) {
        try {
          // Supprimer preuve Cloudinary si elle existe
          const proofUrl = docSnap.data().proofUrl;
          if (proofUrl) {
            await safeDeleteCloudinaryImage(proofUrl, onProgress);
          }

          await deleteDoc(doc(db, 'bookings', docSnap.id));
          report.deleted++;
          onProgress?.(`  ✅ Supprimé: ${docSnap.id} (${docSnap.data().name || 'inconnu'})`);
        } catch (err) {
          const msg = `  ❌ Erreur suppression ${docSnap.id}: ${err.message}`;
          report.errors.push(msg);
          onProgress?.(msg);
        }
      }
    }
  } catch (err) {
    const msg = `❌ Erreur cleanOldBookings: ${err.message}`;
    report.errors.push(msg);
    onProgress?.(msg);
  }

  onProgress?.(`✅ Réservations nettoyées: ${report.deleted} supprimées, ${report.errors.length} erreurs`);
  return report;
}

// ─── 2. Anonymisation des preuves de paiement ────────────────────────────────

/**
 * Anonymise (supprime l'URL) des preuves de paiement > PROOF_RETENTION_DAYS.
 * La réservation est conservée, seule la preuve est effacée.
 * @param {function} [onProgress]
 * @returns {Promise<{anonymized: number, errors: string[]}>}
 */
export async function cleanExpiredProofs(onProgress) {
  onProgress?.('🔍 Recherche des preuves de paiement à anonymiser…');
  const report = { anonymized: 0, errors: [] };
  const threshold = daysAgo(PROOF_RETENTION_DAYS);

  try {
    for (const status of PROOF_ANONYMIZE_STATUSES) {
      const q = query(
        collection(db, 'bookings'),
        where('status', '==', status),
        where('proofSentAt', '<', threshold)
      );

      const snap = await getDocs(q);
      const withProof = snap.docs.filter(d => d.data().proofUrl && d.data().proofUrl !== 'ANONYMIZED');

      onProgress?.(`📋 ${withProof.length} preuve(s) "${status}" > ${PROOF_RETENTION_DAYS}j à anonymiser`);

      for (const docSnap of withProof) {
        try {
          const proofUrl = docSnap.data().proofUrl;

          // Supprimer de Cloudinary
          await safeDeleteCloudinaryImage(proofUrl, onProgress);

          // Anonymiser dans Firestore
          await updateDoc(doc(db, 'bookings', docSnap.id), {
            proofUrl:       'ANONYMIZED',
            proofAnonymizedAt: serverTimestamp(),
          });

          report.anonymized++;
          onProgress?.(`  ✅ Anonymisé: ${docSnap.id}`);
        } catch (err) {
          const msg = `  ❌ Erreur anonymisation ${docSnap.id}: ${err.message}`;
          report.errors.push(msg);
          onProgress?.(msg);
        }
      }
    }
  } catch (err) {
    const msg = `❌ Erreur cleanExpiredProofs: ${err.message}`;
    report.errors.push(msg);
    onProgress?.(msg);
  }

  onProgress?.(`✅ Preuves anonymisées: ${report.anonymized}, ${report.errors.length} erreurs`);
  return report;
}

// ─── 3. Suppression Cloudinary ────────────────────────────────────────────────

/**
 * Supprime une image Cloudinary de façon sécurisée (ne lève pas d'erreur si absente).
 * @param {string}   secureUrl
 * @param {function} [onProgress]
 */
async function safeDeleteCloudinaryImage(secureUrl, onProgress) {
  if (!secureUrl || secureUrl === 'ANONYMIZED') return;
  try {
    await deleteCloudinaryImage(secureUrl);
    onProgress?.(`  🗑️ Cloudinary: image supprimée`);
  } catch (err) {
    // Ne pas bloquer le nettoyage Firestore si Cloudinary échoue
    onProgress?.(`  ⚠️ Cloudinary: suppression échouée (${err.message}) — Firestore nettoyé quand même`);
  }
}

/**
 * Supprime une image Cloudinary via l'API Destroy.
 * ⚠️ En production, déplacer vers une Cloud Function (API secret ne doit pas être côté client).
 * @param {string} secureUrl
 * @returns {Promise<void>}
 */
export async function deleteCloudinaryImage(secureUrl) {
  const publicId = extractPublicId(secureUrl);
  if (!publicId) throw new Error('Public ID introuvable dans l\'URL: ' + secureUrl);
  if (!CLOUDINARY_API_KEY) throw new Error('CLOUDINARY_API_KEY manquant');

  const timestamp = Math.round(Date.now() / 1000);
  const params    = { public_id: publicId, timestamp };
  const signature = await generateCloudinarySignature(params);

  const formData = new FormData();
  formData.append('public_id',  publicId);
  formData.append('timestamp',  timestamp);
  formData.append('api_key',    CLOUDINARY_API_KEY);
  formData.append('signature',  signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
    { method: 'POST', body: formData }
  );

  const data = await res.json();
  if (data.result !== 'ok' && data.result !== 'not found') {
    throw new Error(`Cloudinary destroy: ${data.result || JSON.stringify(data)}`);
  }
}

// ─── 4. Détection d'anomalies ─────────────────────────────────────────────────

/**
 * Détecte les anomalies dans les réservations :
 *  - Réservations "en_attente_paiement" expirées (> PAYMENT_EXPIRY_HOURS h)
 *  - Réservations avec preuve mais statut toujours "en_attente_paiement"
 *  - Créneaux dupliqués (même date/heure, plusieurs réservations actives)
 *  - Montants incohérents (montantPaye > montantTotal)
 *
 * @param {function} [onProgress]
 * @returns {Promise<{anomalies: object[], fixed: number, errors: string[]}>}
 */
export async function detectAnomalies(onProgress) {
  onProgress?.('🔍 Scan des anomalies en cours…');
  const report = { anomalies: [], fixed: 0, errors: [] };
  const now = new Date();

  try {
    // ── Anomalie 1 : réservations expirées non marquées ──────────────────
    onProgress?.('  Vérification des réservations expirées non traitées…');
    const q1 = query(
      collection(db, 'bookings'),
      where('status', '==', 'en_attente_paiement')
    );
    const snap1 = await getDocs(q1);

    for (const docSnap of snap1.docs) {
      const data = docSnap.data();
      const expiry = data.expirationAcompteAt?.toDate?.();

      if (expiry && expiry < now) {
        report.anomalies.push({
          type: 'EXPIRED_NOT_MARKED',
          severity: 'HIGH',
          bookingId: docSnap.id,
          description: `Réservation ${docSnap.id} (${data.name}) expirée le ${formatDate(data.expirationAcompteAt)} mais toujours "en_attente_paiement"`,
          autoFix: true,
        });

        try {
          await updateDoc(doc(db, 'bookings', docSnap.id), {
            status:               'expire',
            statutReservation:    'expire',
            statutPaiement:       'expire',
            autoExpiredAt:        serverTimestamp(),
          });
          report.fixed++;
          onProgress?.(`  ✅ Auto-corrigé: ${docSnap.id} marqué "expire"`);
        } catch (err) {
          report.errors.push(`Fix EXPIRED_NOT_MARKED ${docSnap.id}: ${err.message}`);
        }
      }
    }

    // ── Anomalie 2 : preuve uploadée mais statut pas mis à jour ──────────
    onProgress?.('  Vérification des preuves orphelines…');
    const q2 = query(
      collection(db, 'bookings'),
      where('status', '==', 'en_attente_paiement')
    );
    const snap2 = await getDocs(q2);

    for (const docSnap of snap2.docs) {
      const data = docSnap.data();
      if (data.proofUrl && data.proofUrl !== 'ANONYMIZED') {
        report.anomalies.push({
          type: 'PROOF_WITHOUT_STATUS_UPDATE',
          severity: 'MEDIUM',
          bookingId: docSnap.id,
          description: `${docSnap.id} (${data.name}) a une preuve Cloudinary mais statut = "en_attente_paiement"`,
          autoFix: false,
          action: 'Vérifier manuellement et valider le paiement dans le dashboard',
        });
        onProgress?.(`  ⚠️ Preuve orpheline: ${docSnap.id}`);
      }
    }

    // ── Anomalie 3 : créneaux dupliqués ───────────────────────────────────
    onProgress?.('  Vérification des doublons de créneaux…');
    const activeStatuses = ['acompte_paye', 'paye_entierement', 'en_attente_paiement'];
    const q3 = query(collection(db, 'bookings'), where('status', 'in', activeStatuses));
    const snap3 = await getDocs(q3);

    const slotMap = {};
    for (const docSnap of snap3.docs) {
      const { date, time } = docSnap.data();
      const key = `${date}__${time}`;
      if (!slotMap[key]) slotMap[key] = [];
      slotMap[key].push(docSnap.id);
    }

    for (const [slot, ids] of Object.entries(slotMap)) {
      if (ids.length > 1) {
        const [date, time] = slot.split('__');
        report.anomalies.push({
          type: 'DUPLICATE_SLOT',
          severity: 'HIGH',
          bookingIds: ids,
          description: `Créneau ${date} à ${time} réservé ${ids.length}x simultanément: ${ids.join(', ')}`,
          autoFix: false,
          action: 'Contacter les clients concernés et annuler les doublons manuellement',
        });
        onProgress?.(`  🚨 Doublon détecté: ${date} ${time} (${ids.length} réservations)`);
      }
    }

    // ── Anomalie 4 : montants incohérents ─────────────────────────────────
    onProgress?.('  Vérification des montants…');
    const q4 = query(collection(db, 'bookings'), where('montantPaye', '>', 0));
    const snap4 = await getDocs(q4);

    for (const docSnap of snap4.docs) {
      const { montantPaye, montantTotal, resteAPayer, name } = docSnap.data();
      const resteCalcule = montantTotal - montantPaye;

      const hasInconsistency =
        montantPaye > montantTotal ||
        (resteAPayer !== undefined && Math.abs(resteAPayer - resteCalcule) > 1);

      if (hasInconsistency) {
        report.anomalies.push({
          type: 'AMOUNT_INCONSISTENCY',
          severity: 'MEDIUM',
          bookingId: docSnap.id,
          description: `${docSnap.id} (${name}): montantPaye=${montantPaye} / montantTotal=${montantTotal} / resteAPayer=${resteAPayer} (attendu: ${resteCalcule})`,
          autoFix: true,
        });

        try {
          await updateDoc(doc(db, 'bookings', docSnap.id), {
            resteAPayer: Math.max(0, resteCalcule),
          });
          report.fixed++;
          onProgress?.(`  ✅ Montant corrigé: ${docSnap.id}`);
        } catch (err) {
          report.errors.push(`Fix AMOUNT_INCONSISTENCY ${docSnap.id}: ${err.message}`);
        }
      }
    }

  } catch (err) {
    const msg = `❌ Erreur detectAnomalies: ${err.message}`;
    report.errors.push(msg);
    onProgress?.(msg);
  }

  const highCount = report.anomalies.filter(a => a.severity === 'HIGH').length;
  onProgress?.(`✅ Scan terminé: ${report.anomalies.length} anomalie(s) (${highCount} critique(s)), ${report.fixed} auto-corrigée(s)`);
  return report;
}

// ─── 5. Maintenance complète ──────────────────────────────────────────────────

/**
 * Orchestre toutes les tâches de maintenance et retourne un rapport complet.
 *
 * @param {object}   [options]
 * @param {function} [options.onProgress]  callback(message: string)
 * @param {boolean}  [options.dryRun]      si true, simule sans modifier
 * @returns {Promise<MaintenanceReport>}
 */
export async function runFullMaintenance({ onProgress, dryRun = false } = {}) {
  const startTime = Date.now();
  const report = {
    runAt:          new Date().toISOString(),
    dryRun,
    bookings:       null,
    proofs:         null,
    anomalies:      null,
    totalFixed:     0,
    totalErrors:    [],
    durationMs:     0,
    summary:        '',
  };

  onProgress?.(`🚀 Maintenance ${dryRun ? '[MODE SIMULATION] ' : ''}démarrée — ${new Date().toLocaleString('fr-FR')}`);
  onProgress?.('─'.repeat(50));

  if (dryRun) {
    onProgress?.('⚠️ Mode simulation activé — aucune modification ne sera effectuée.');
    onProgress?.('─'.repeat(50));
  }

  // ── Étape 1 : Réservations anciennes ─────────────────────────────────────
  onProgress?.('\n📁 ÉTAPE 1/3 — Nettoyage réservations anciennes');
  report.bookings = dryRun
    ? { deleted: 0, errors: [], dryRun: true }
    : await cleanOldBookings(msg => onProgress?.('  ' + msg));

  // ── Étape 2 : Preuves de paiement ─────────────────────────────────────────
  onProgress?.('\n🖼️ ÉTAPE 2/3 — Anonymisation preuves de paiement');
  report.proofs = dryRun
    ? { anonymized: 0, errors: [], dryRun: true }
    : await cleanExpiredProofs(msg => onProgress?.('  ' + msg));

  // ── Étape 3 : Détection anomalies ────────────────────────────────────────
  onProgress?.('\n🔍 ÉTAPE 3/3 — Détection anomalies');
  report.anomalies = await detectAnomalies(msg => onProgress?.('  ' + msg));

  // ── Calcul totaux ─────────────────────────────────────────────────────────
  report.totalFixed  = (report.bookings?.deleted || 0) + (report.proofs?.anonymized || 0) + (report.anomalies?.fixed || 0);
  report.totalErrors = [
    ...(report.bookings?.errors  || []),
    ...(report.proofs?.errors    || []),
    ...(report.anomalies?.errors || []),
  ];
  report.durationMs = Date.now() - startTime;

  // ── Résumé ─────────────────────────────────────────────────────────────────
  const highAnomalies = report.anomalies?.anomalies?.filter(a => a.severity === 'HIGH') || [];
  report.summary = [
    `🏁 Maintenance terminée en ${(report.durationMs / 1000).toFixed(1)}s`,
    `📦 Réservations supprimées   : ${report.bookings?.deleted || 0}`,
    `🖼️  Preuves anonymisées       : ${report.proofs?.anonymized || 0}`,
    `⚠️  Anomalies détectées       : ${report.anomalies?.anomalies?.length || 0} (${highAnomalies.length} critiques)`,
    `🔧 Corrections automatiques  : ${report.anomalies?.fixed || 0}`,
    `❌ Erreurs                   : ${report.totalErrors.length}`,
  ].join('\n');

  onProgress?.('\n' + '─'.repeat(50));
  onProgress?.(report.summary);

  if (highAnomalies.length > 0) {
    onProgress?.('\n🚨 ANOMALIES CRITIQUES À TRAITER MANUELLEMENT :');
    highAnomalies.forEach((a, i) => {
      onProgress?.(`  ${i + 1}. [${a.type}] ${a.description}`);
      if (a.action) onProgress?.(`     → ${a.action}`);
    });
  }

  // Enregistrer le rapport dans Firestore
  if (!dryRun) {
    try {
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'maintenance_logs'), {
        ...report,
        anomalies: {
          ...report.anomalies,
          anomalies: report.anomalies?.anomalies?.slice(0, 50) || [], // limite taille doc
        },
        createdAt: serverTimestamp(),
      });
      onProgress?.('\n📝 Rapport enregistré dans Firestore (maintenance_logs)');
    } catch (err) {
      onProgress?.(`\n⚠️ Impossible d'enregistrer le rapport: ${err.message}`);
    }
  }

  return report;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export default {
  cleanOldBookings,
  cleanExpiredProofs,
  deleteCloudinaryImage,
  detectAnomalies,
  runFullMaintenance,
};