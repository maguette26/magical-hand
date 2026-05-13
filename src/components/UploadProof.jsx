// components/UploadProof.jsx
// ─── Composant Upload Preuve de Paiement — UX Professionnelle ────────────────
//
// Fonctionnalités :
//  • Barre de progression réelle (via XHR progress)
//  • Statuts visuels : Compression → Upload → Validation → Succès/Erreur
//  • Fallback WhatsApp après 3 échecs
//  • Détection connexion instable
//  • Preview image avec remplacement
//  • Messages d'erreur humains (no "Load failed")
//  • Retry manuel + retry auto
//  • Bloque navigation pendant upload (beforeunload)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  MessageCircle, Wifi, WifiOff, Image, X
} from 'lucide-react';
import { uploadImage, compressImage, getNetworkStatus, UPLOAD_ERRORS } from '../utils/uploadImage';

// ─── Constantes ───────────────────────────────────────────────────────────────

const WHATSAPP_NUMBER = '221776695790';

const STATUS = {
  IDLE:        'idle',
  COMPRESSING: 'compressing',
  UPLOADING:   'uploading',
  VALIDATING:  'validating',
  SUCCESS:     'success',
  ERROR:       'error',
  RETRYING:    'retrying',
};

const STATUS_LABELS = {
  [STATUS.IDLE]:        null,
  [STATUS.COMPRESSING]: 'Compression…',
  [STATUS.UPLOADING]:   'Upload en cours…',
  [STATUS.VALIDATING]:  'Validation…',
  [STATUS.SUCCESS]:     'Preuve envoyée !',
  [STATUS.ERROR]:       null,
  [STATUS.RETRYING]:    'Nouvelle tentative…',
};

// ─── Styles (Dark luxury — cohérent avec Booking.jsx) ────────────────────────

const S = {
  container: {
    position: 'relative',
    fontFamily: 'Jost, sans-serif',
  },
  label: {
    fontSize: '11px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#8A7968',
    display: 'block',
    marginBottom: '12px',
  },

  // ── Zone de drop ──────────────────────────────────────────────────────────
  dropzone: (hasPreview, isDragging, isDisabled) => ({
    border: hasPreview
      ? '1px solid rgba(201,168,76,0.5)'
      : isDragging
        ? '2px dashed #C9A84C'
        : '2px dashed rgba(201,168,76,0.25)',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s',
    background: isDragging
      ? 'rgba(201,168,76,0.06)'
      : 'rgba(255,255,255,0.02)',
    position: 'relative',
  }),

  dropzonePlaceholder: {
    padding: '36px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
  },

  // ── Barre de progression ──────────────────────────────────────────────────
  progressContainer: {
    marginTop: '14px',
  },

  progressTrack: {
    height: '4px',
    background: 'rgba(201,168,76,0.12)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '8px',
  },

  progressBar: (percent, color) => ({
    height: '100%',
    width: `${percent}%`,
    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  }),

  // ── Messages ──────────────────────────────────────────────────────────────
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },

  errorBox: {
    marginTop: '14px',
    padding: '14px 16px',
    background: 'rgba(231,76,60,0.07)',
    border: '1px solid rgba(231,76,60,0.25)',
    borderRadius: '6px',
  },

  networkBadge: (isSlow, isOffline) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: isOffline
      ? 'rgba(231,76,60,0.08)'
      : 'rgba(232,164,76,0.08)',
    border: `1px solid ${isOffline ? 'rgba(231,76,60,0.3)' : 'rgba(232,164,76,0.3)'}`,
    borderRadius: '20px',
    fontSize: '11px',
    color: isOffline ? '#E74C3C' : '#E8A44C',
    marginBottom: '12px',
    width: 'fit-content',
  }),
};

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * UploadProof — composant autonome d'upload de preuve de paiement.
 *
 * Props :
 * @param {function} onSuccess(url: string)  — appelé avec le secure_url Cloudinary
 * @param {boolean}  disabled                — désactive l'upload
 * @param {string}   [label]                 — label affiché au-dessus
 * @param {string}   [bookingId]             — pour le message WhatsApp fallback
 * @param {string}   [clientName]            — pour le message WhatsApp fallback
 * @param {string}   [amount]                — montant pour le message WhatsApp fallback
 */
export default function UploadProof({
  onSuccess,
  disabled = false,
  label = 'Preuve de paiement *',
  bookingId,
  clientName,
  amount,
}) {
  const [file,          setFile]          = useState(null);
  const [preview,       setPreview]       = useState(null);
  const [status,        setStatus]        = useState(STATUS.IDLE);
  const [progress,      setProgress]      = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage,  setErrorMessage]  = useState('');
  const [retryCount,    setRetryCount]    = useState(0);
  const [isDragging,    setIsDragging]    = useState(false);
  const [networkStatus, setNetworkStatus] = useState(getNetworkStatus());
  const [showFallback,  setShowFallback]  = useState(false);

  const fileInputRef  = useRef(null);
  const uploadingRef  = useRef(false);
  const MAX_RETRIES   = 3;

  // ── Surveiller réseau ──────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setNetworkStatus(getNetworkStatus());
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online',  update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // ── Bloquer navigation pendant upload ─────────────────────────────────────
  useEffect(() => {
    const isActive = [STATUS.COMPRESSING, STATUS.UPLOADING, STATUS.VALIDATING, STATUS.RETRYING].includes(status);
    if (!isActive) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Upload en cours, quitter maintenant annulera l\'envoi.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  // ── Sélection / drop fichier ───────────────────────────────────────────────
  const handleFile = useCallback(async (rawFile) => {
    if (!rawFile || uploadingRef.current) return;

    setShowFallback(false);
    setErrorMessage('');
    setRetryCount(0);
    setProgress(0);
    setStatus(STATUS.IDLE);

    // Preview immédiate (avant compression)
    const objectUrl = URL.createObjectURL(rawFile);
    setPreview(objectUrl);
    setFile(rawFile);
  }, []);

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = ''; // reset pour permettre re-sélection même fichier
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploadingRef.current) return;
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ── Lancer l'upload ────────────────────────────────────────────────────────
  const startUpload = useCallback(async (fileToUpload, isRetry = false) => {
    if (!fileToUpload || uploadingRef.current) return;

    uploadingRef.current = true;
    setProgress(0);
    setErrorMessage('');
    setShowFallback(false);
    setStatus(isRetry ? STATUS.RETRYING : STATUS.COMPRESSING);
    setStatusMessage(isRetry ? UPLOAD_ERRORS.RETRYING(retryCount + 1, MAX_RETRIES) : 'Compression…');

    try {
      const url = await uploadImage(fileToUpload, {
        onProgress: (pct) => {
          setProgress(pct);
          if (pct > 0 && pct < 100) setStatus(STATUS.UPLOADING);
          if (pct === 100) setStatus(STATUS.VALIDATING);
        },
        onStatus: (msg) => {
          setStatusMessage(msg);
          if (msg.includes('Compression'))    setStatus(STATUS.COMPRESSING);
          if (msg.includes('Upload'))         setStatus(STATUS.UPLOADING);
          if (msg.includes('Validation'))     setStatus(STATUS.VALIDATING);
        },
        onRetry: (attempt, max) => {
          setRetryCount(attempt);
          setStatus(STATUS.RETRYING);
          setStatusMessage(UPLOAD_ERRORS.RETRYING(attempt, max));
        },
      });

      setStatus(STATUS.SUCCESS);
      setProgress(100);
      setStatusMessage(UPLOAD_ERRORS.SUCCESS);
      uploadingRef.current = false;
      onSuccess?.(url);

    } catch (err) {
      uploadingRef.current = false;
      setStatus(STATUS.ERROR);
      setErrorMessage(err.message || UPLOAD_ERRORS.UNKNOWN);
      setProgress(0);

      // Afficher fallback WhatsApp après épuisement des retries automatiques
      setShowFallback(retryCount >= MAX_RETRIES - 1);
    }
  }, [onSuccess, retryCount]);

  // ── Retry manuel ───────────────────────────────────────────────────────────
  const handleManualRetry = () => {
    if (!file) return;
    setRetryCount(c => c + 1);
    startUpload(file, true);
  };

  // ── Fallback WhatsApp ──────────────────────────────────────────────────────
  const handleWhatsAppFallback = () => {
    const msg = [
      `📸 *Preuve de paiement — Magical Hand*`,
      bookingId   ? `N° réservation : ${bookingId}`    : '',
      clientName  ? `Client(e) : ${clientName}`         : '',
      amount      ? `Montant : ${amount}`               : '',
      `\n_J'envoie ma preuve via WhatsApp car l'upload n'a pas fonctionné._`,
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ── Réinitialiser ──────────────────────────────────────────────────────────
  const handleReset = () => {
    if (uploadingRef.current) return;
    setFile(null);
    setPreview(null);
    setStatus(STATUS.IDLE);
    setProgress(0);
    setStatusMessage('');
    setErrorMessage('');
    setRetryCount(0);
    setShowFallback(false);
  };

  // ── États dérivés ──────────────────────────────────────────────────────────
  const isUploading = [STATUS.COMPRESSING, STATUS.UPLOADING, STATUS.VALIDATING, STATUS.RETRYING].includes(status);
  const isSuccess   = status === STATUS.SUCCESS;
  const isError     = status === STATUS.ERROR;
  const canClick    = !disabled && !isUploading && !isSuccess;

  const progressColor = isError     ? '#E74C3C'
                      : isSuccess   ? '#25D366'
                      : status === STATUS.RETRYING ? '#E8A44C'
                      : '#C9A84C';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.container}>

      {/* Label */}
      <label style={S.label}>{label}</label>

      {/* Badge réseau instable */}
      <AnimatePresence>
        {(networkStatus.isOffline || networkStatus.isSlow) && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '10px' }}
          >
            <div style={S.networkBadge(networkStatus.isSlow, networkStatus.isOffline)}>
              {networkStatus.isOffline
                ? <><WifiOff size={12} /> Hors ligne</>
                : <><Wifi size={12} /> Connexion lente ({networkStatus.effectiveType})</>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone de drop */}
      <div
        style={S.dropzone(!!preview, isDragging, !canClick)}
        onClick={() => canClick && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (canClick) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/heic,image/heif"
          style={{ display: 'none' }}
          onChange={handleInputChange}
          disabled={!canClick}
        />

        {/* Preview */}
        {preview && (
          <div style={{ position: 'relative' }}>
            <img
              src={preview}
              alt="Preuve de paiement"
              style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
            />

            {/* Overlay succès */}
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px' }}
                >
                  <CheckCircle2 size={44} color="#25D366" />
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF', letterSpacing: '0.05em' }}>
                    Preuve envoyée
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Overlay upload en cours */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '36px', height: '36px', border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bouton changer (idle uniquement) */}
            {!isUploading && !isSuccess && (
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(10,10,10,0.8)', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', color: '#C9A84C', backdropFilter: 'blur(6px)' }}>
                Cliquer pour changer
              </div>
            )}
          </div>
        )}

        {/* Placeholder (pas de fichier) */}
        {!preview && (
          <div style={S.dropzonePlaceholder}>
            <motion.div
              animate={isDragging ? { scale: 1.15 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Upload size={30} color="#C9A84C" style={{ opacity: 0.7 }} />
            </motion.div>
            <p style={{ fontSize: '13px', color: '#8A7968', margin: 0 }}>
              {isDragging ? 'Déposez l\'image ici' : 'Cliquer ou glisser votre preuve ici'}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(138,121,104,0.5)', margin: 0 }}>
              JPG, PNG, HEIC — Max 3MB (compression auto)
            </p>
          </div>
        )}
      </div>

      {/* ── Bouton Upload (apparaît quand fichier sélectionné) ─────────────── */}
      <AnimatePresence>
        {file && !isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            style={{ overflow: 'hidden', marginTop: '14px' }}
          >
            <motion.button
              onClick={() => !isUploading && startUpload(file)}
              disabled={isUploading}
              whileHover={!isUploading ? { scale: 1.02, boxShadow: '0 6px 24px rgba(37,211,102,0.25)' } : {}}
              whileTap={!isUploading ? { scale: 0.98 } : {}}
              style={{
                width: '100%',
                padding: '16px',
                background: isUploading
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #25D366, #128C7E)',
                color: isUploading ? '#8A7968' : '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'Jost, sans-serif',
                fontSize: '12px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s',
              }}
            >
              {isUploading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%' }}
                  />
                  {statusMessage || 'En cours…'}
                </>
              ) : (
                <>
                  <MessageCircle size={16} />
                  Envoyer la preuve
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Barre de progression ───────────────────────────────────────────── */}
      <AnimatePresence>
        {(isUploading || isSuccess) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', ...S.progressContainer }}
          >
            {/* Track */}
            <div style={S.progressTrack}>
              <motion.div
                style={S.progressBar(
                  isSuccess ? 100 : status === STATUS.COMPRESSING ? 15 : status === STATUS.VALIDATING ? 95 : progress,
                  progressColor
                )}
                layout
              />
            </div>

            {/* Statut texte */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={S.statusRow}>
                {/* Icône selon statut */}
                {isSuccess && <CheckCircle2 size={13} color="#25D366" />}
                {isUploading && status !== STATUS.RETRYING && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '12px', height: '12px', border: '1.5px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%' }}
                  />
                )}
                {status === STATUS.RETRYING && <RefreshCw size={13} color="#E8A44C" />}

                <span style={{ color: isSuccess ? '#25D366' : status === STATUS.RETRYING ? '#E8A44C' : '#8A7968', fontSize: '11px' }}>
                  {statusMessage || STATUS_LABELS[status]}
                </span>
              </div>

              {/* Pourcentage */}
              {isUploading && status === STATUS.UPLOADING && progress > 0 && (
                <span style={{ fontSize: '11px', color: '#C9A84C', fontWeight: 600 }}>
                  {progress}%
                </span>
              )}
            </div>

            {/* Steps visuels */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              {[
                { key: STATUS.COMPRESSING, label: 'Compression' },
                { key: STATUS.UPLOADING,   label: 'Upload' },
                { key: STATUS.VALIDATING,  label: 'Validation' },
                { key: STATUS.SUCCESS,     label: 'Terminé' },
              ].map(({ key, label }, i) => {
                const stepOrder = [STATUS.COMPRESSING, STATUS.UPLOADING, STATUS.VALIDATING, STATUS.SUCCESS];
                const currentIdx = stepOrder.indexOf(status);
                const stepIdx    = stepOrder.indexOf(key);
                const done       = stepIdx < currentIdx || isSuccess;
                const active     = stepIdx === currentIdx && !isSuccess;

                return (
                  <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '100%', height: '2px', borderRadius: '1px',
                      background: done || active
                        ? (isSuccess ? '#25D366' : '#C9A84C')
                        : 'rgba(201,168,76,0.12)',
                      transition: 'background 0.4s',
                    }} />
                    <span style={{ fontSize: '9px', letterSpacing: '0.05em', color: done || active ? (isSuccess ? '#25D366' : '#C9A84C') : 'rgba(138,121,104,0.5)', transition: 'color 0.4s' }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Message d'erreur ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isError && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={S.errorBox}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: showFallback ? '12px' : 0 }}>
              <AlertCircle size={15} color="#E74C3C" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '13px', color: '#FAF6EF', margin: 0, lineHeight: 1.5 }}>
                {errorMessage}
              </p>
            </div>

            {/* Actions de récupération */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              {/* Retry manuel */}
              {!showFallback && retryCount < MAX_RETRIES && (
                <motion.button
                  onClick={handleManualRetry}
                  whileHover={{ scale: 1.03 }}
                  style={{ padding: '8px 16px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#C9A84C', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Jost, sans-serif' }}
                >
                  <RefreshCw size={12} /> Réessayer ({MAX_RETRIES - retryCount} restant{MAX_RETRIES - retryCount > 1 ? 's' : ''})
                </motion.button>
              )}

              {/* Changer de fichier */}
              <motion.button
                onClick={() => canClick && fileInputRef.current?.click()}
                whileHover={{ scale: 1.03 }}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', color: '#8A7968', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Jost, sans-serif' }}
              >
                <Image size={12} /> Autre image
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fallback WhatsApp (après épuisement retries) ──────────────────── */}
      <AnimatePresence>
        {showFallback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: '14px', padding: '16px 18px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: '6px' }}
          >
            <p style={{ fontSize: '12px', color: '#8A7968', margin: '0 0 12px', lineHeight: 1.6 }}>
              L'upload automatique a échoué. Vous pouvez envoyer votre preuve directement via WhatsApp :
            </p>
            <motion.button
              onClick={handleWhatsAppFallback}
              whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(37,211,102,0.2)' }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', padding: '13px 20px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#FFFFFF', border: 'none', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <MessageCircle size={16} />
              Envoyer via WhatsApp
            </motion.button>
            <p style={{ fontSize: '10px', color: 'rgba(138,121,104,0.6)', margin: '8px 0 0', textAlign: 'center' }}>
              Un message pré-rempli sera ouvert dans WhatsApp
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Succès : confirmation + reset ─────────────────────────────────── */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '12px', padding: '12px 16px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={14} color="#25D366" />
              <span style={{ fontSize: '12px', color: '#25D366' }}>Preuve reçue — en attente de validation</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}