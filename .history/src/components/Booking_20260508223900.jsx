import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { format, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Sparkles, Camera, Crown, Clock, ChevronLeft, ChevronRight,
  MessageCircle, CreditCard, Check, Wand2, Upload, AlertCircle,
  CheckCircle2, XCircle, ChevronDown, ArrowRight, Images
} from 'lucide-react';
import { uploadImage } from '../utils/uploadImage';

const WHATSAPP_NUMBER = '221776695790';
const ACOMPTE_AMOUNT = 2000;

const SERVICES = [
  { id: 1, label: 'Maquillage Simple', price: '7 000 FCFA', description: 'Look naturel et soigné, idéal pour le quotidien', Icon: Wand2 },
  { id: 2, label: 'Maquillage Complet Glam', price: '10 000 FCFA', description: 'Look complet, longue tenue, éclat assuré', Icon: Sparkles },
  { id: 3, label: 'Maquillage + Shooting Photo', price: '15 000 FCFA', description: 'Maquillage pro + séance photo incluse', Icon: Camera },
  { id: 4, label: 'Cérémonie — Henné / Baptême / Mariage', price: 'À partir de 25 000 FCFA', description: 'Look royal garanti · Retouche express disponible en supplément (+5 000 FCFA)', Icon: Crown },
];

const STEPS = [
  { n: 1, label: 'Prestation' },
  { n: 2, label: 'Date & Heure' },
  { n: 3, label: 'Vos infos' },
  { n: 4, label: 'Confirmer' },
  { n: 5, label: 'Paiement' },
];

// ─── Gallery Swipe Component ────────────────────────────────────────────────
export function GallerySwipeHint({ photos = [] }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeftState] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    const idx = Math.round(el.scrollLeft / (el.clientWidth * 0.75));
    setCurrentIndex(Math.max(0, Math.min(idx, photos.length - 1)));
  };

  const scrollTo = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    setHasInteracted(true);
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setHasInteracted(true);
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 1.2;
  };
  const onMouseUp = () => setIsDragging(false);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Clear swipe instruction banner */}
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', marginBottom: '16px',
              padding: '10px 20px',
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent)',
              border: '1px solid rgba(201,168,76,0.15)', borderRadius: '40px',
              margin: '0 auto 20px',
              width: 'fit-content',
            }}
          >
            {/* Animated finger/swipe icon */}
            <motion.div
              animate={{ x: [0, 18, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ fontSize: '18px' }}>👆</span>
              <ArrowRight size={14} color="#C9A84C" />
            </motion.div>
            <span style={{
              fontFamily: 'Jost, sans-serif', fontSize: '11px',
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C',
            }}>
              Faites défiler pour découvrir mes looks
            </span>
            <motion.div
              animate={{ x: [0, -18, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            >
              <Images size={14} color="#C9A84C" style={{ opacity: 0.6 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arrow nav buttons (desktop) */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => scrollTo(-1)}
            style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              zIndex: 10, width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(201,168,76,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}
          >
            <ChevronLeft size={20} color="#C9A84C" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => scrollTo(1)}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              zIndex: 10, width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(201,168,76,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}
          >
            <ChevronRight size={20} color="#C9A84C" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px',
          scrollSnapType: 'x mandatory', cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          padding: '0 8px 12px',
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {photos.map((photo, i) => (
          <motion.div
            key={photo.id || i}
            style={{
              flexShrink: 0, width: 'clamp(220px, 70vw, 320px)',
              scrollSnapAlign: 'start', borderRadius: '8px', overflow: 'hidden',
              border: '1px solid rgba(201,168,76,0.15)',
              position: 'relative',
            }}
          >
            <img
              src={photo.url}
              alt={photo.title}
              draggable={false}
              style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '32px 16px 16px',
              background: 'linear-gradient(to top, rgba(10,10,10,0.85) 0%, transparent 100%)',
            }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: '#FAF6EF' }}>{photo.title}</div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '4px' }}>{photo.category}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          {photos.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentIndex ? '20px' : '6px', height: '6px',
                borderRadius: '3px',
                background: i === currentIndex ? '#C9A84C' : 'rgba(201,168,76,0.25)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Booking Component ───────────────────────────────────────────────────────
export default function Booking() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [availability, setAvailability] = useState({});
  const [bookedSlots, setBookedSlots] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  // Step 5 — payment state
  const [bookingId, setBookingId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState('');
  const [cancelStatus, setCancelStatus] = useState(null); // null | 'loading' | 'success' | 'error' | 'not_found'
  const [foundBooking, setFoundBooking] = useState(null);

  const proofRef = useRef();

  const visibleDays = Array.from({ length: 7 }, (_, i) =>
    addDays(new Date(), weekOffset * 7 + i + 1)
  );

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'availability'), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        if (d.data().slots && d.data().slots.length > 0) map[d.id] = d.data().slots;
      });
      setAvailability(map);
    }, () => {});
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedDate) { setBookedSlots([]); return; }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const q = query(collection(db, 'bookings'), where('date', '==', dateStr));
    const unsub = onSnapshot(q, (snap) => {
      setBookedSlots(
        snap.docs
          .filter(d => !['cancelled', 'expired'].includes(d.data().status))
          .map(d => d.data().time)
      );
    }, () => {});
    return unsub;
  }, [selectedDate]);

  const isDateAvailable = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !!availability[dateStr] && availability[dateStr].length > 0;
  };

  const getAvailableSlots = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return availability[dateStr] || [];
  };

  const isSlotBooked = (slot) => bookedSlots.includes(slot);
  const openSlots = getAvailableSlots();

  const handleProofChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleCreateBooking = async () => {
    if (creatingBooking) return;
    setCreatingBooking(true);
    try {
      const service = SERVICES.find(s => s.id === selectedService);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const docRef = await addDoc(collection(db, 'bookings'), {
        name: name.trim(),
        phone: phone.trim(),
        service: service.label,
        servicePrice: service.price,
        date: dateStr,
        time: selectedTime,
        status: 'pending_payment',
        acompte: ACOMPTE_AMOUNT,
        proofUrl: null,
        createdAt: serverTimestamp(),
      });
      setBookingId(docRef.id);
      setStep(5);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de la réservation. Veuillez réessayer.');
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleSendProof = async () => {
    if (!proofFile || !bookingId || uploading) return;
    setUploading(true);
    try {
      const url = await uploadImage(proofFile);
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'bookings', bookingId), {
        proofUrl: url,
        status: 'waiting_confirmation',
        proofSentAt: serverTimestamp(),
      });

      const service = SERVICES.find(s => s.id === selectedService);
      const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
      const msg =
`✅ *MAGICAL HAND — Preuve de paiement*
━━━━━━━━━━━━━━━━━━━
👤 ${name}${phone ? `\n📱 ${phone}` : ''}
💋 ${service.label} — ${service.price}
📅 ${dateStr} à ${selectedTime}
💳 Acompte : ${ACOMPTE_AMOUNT.toLocaleString()} FCFA
━━━━━━━━━━━━━━━━━━━
La preuve de paiement a été envoyée.
Merci de valider dans le dashboard.`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
      setPaymentSent(true);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setUploading(false);
    }
  };

  // ── Cancellation lookup ──────────────────────────────────────────────────
  const handleCancelLookup = async () => {
    if (!cancelBookingId.trim()) return;
    setCancelStatus('loading');
    setFoundBooking(null);
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'bookings', cancelBookingId.trim()));
      if (!snap.exists()) {
        setCancelStatus('not_found');
        return;
      }
      setFoundBooking({ id: snap.id, ...snap.data() });
      setCancelStatus('found');
    } catch {
      setCancelStatus('error');
    }
  };

  const handleConfirmCancel = async () => {
    if (!foundBooking) return;
    setCancelStatus('loading');
    try {
      const isFreeCancel = ['pending_payment', 'waiting_confirmation'].includes(foundBooking.status);
      const newStatus = isFreeCancel ? 'cancelled' : 'cancellation_requested';

      await updateDoc(doc(db, 'bookings', foundBooking.id), {
        status: newStatus,
        cancelRequestedAt: serverTimestamp(),
      });

      // If free cancel → also free the slot in availability (reopen it)
      if (isFreeCancel && foundBooking.date && foundBooking.time) {
        const { getDoc, setDoc, doc: fsDoc } = await import('firebase/firestore');
        const availSnap = await getDoc(fsDoc(db, 'availability', foundBooking.date));
        if (availSnap.exists()) {
          const slots = availSnap.data().slots || [];
          if (!slots.includes(foundBooking.time)) {
            await setDoc(fsDoc(db, 'availability', foundBooking.date), {
              slots: [...slots, foundBooking.time].sort(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        }
      }

      // Notify admin via WhatsApp if cancellation_requested
      if (!isFreeCancel) {
        const msg =
`❌ *MAGICAL HAND — Demande d'annulation*
━━━━━━━━━━━━━━━━━━━
👤 ${foundBooking.name}${foundBooking.phone ? `\n📱 ${foundBooking.phone}` : ''}
💋 ${foundBooking.service}
📅 ${foundBooking.date} à ${foundBooking.time}
━━━━━━━━━━━━━━━━━━━
Le client demande l'annulation de son RDV confirmé.
Merci de traiter la demande dans le dashboard.`;
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      setCancelStatus(isFreeCancel ? 'cancelled_free' : 'cancel_requested');
    } catch {
      setCancelStatus('error');
    }
  };

  const canProceed = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return selectedDate !== null && selectedTime !== null;
    if (step === 3) return name.trim().length > 2 && phone.trim().length > 5;
    return false;
  };

  return (
    <section id="reserver" className="booking-section">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: 'center', marginBottom: '70px' }}
      >
        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '16px' }}>Réservation</p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 400, color: '#FAF6EF', marginBottom: '16px' }}>
          Prendre Rendez-Vous
        </h2>
        <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '0 auto 24px' }} />
        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '14px', color: '#8A7968', maxWidth: '400px', margin: '0 auto' }}>
          Choisissez votre prestation, votre date et réservez en ligne avec paiement d'acompte.
        </p>
      </motion.div>

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', fontWeight: 600,
                  background: step >= s.n ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent',
                  color: step >= s.n ? '#0A0A0A' : '#8A7968',
                  border: step >= s.n ? 'none' : '1px solid rgba(201,168,76,0.3)',
                  transition: 'all 0.4s', flexShrink: 0,
                }}>
                  {step > s.n ? <Check size={13} strokeWidth={3} /> : s.n}
                </div>
                <span style={{
                  fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: step >= s.n ? '#C9A84C' : '#8A7968', whiteSpace: 'nowrap',
                }}>{s.label}</span>
              </div>
              {i < 4 && (
                <div style={{
                  flex: 1, height: '1px',
                  background: step > s.n ? 'linear-gradient(90deg, #C9A84C, rgba(201,168,76,0.4))' : 'rgba(201,168,76,0.15)',
                  marginBottom: '24px', maxWidth: '48px', transition: 'all 0.4s',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: '4px',
            padding: 'clamp(20px, 5vw, 44px)',
          }}
        >

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4vw, 28px)', color: '#FAF6EF', marginBottom: '24px' }}>
                Choisissez votre prestation
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {SERVICES.map((s) => {
                  const active = selectedService === s.id;
                  const { Icon } = s;
                  return (
                    <motion.button key={s.id} onClick={() => setSelectedService(s.id)} whileHover={{ x: 4 }} style={{
                      background: active ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,122,0.07))' : 'rgba(255,255,255,0.02)',
                      border: active ? '1px solid rgba(201,168,76,0.65)' : '1px solid rgba(201,168,76,0.12)',
                      borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', width: '100%',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: active ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(201,168,76,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s',
                        }}>
                          <Icon size={18} strokeWidth={1.5} color={active ? '#0A0A0A' : '#C9A84C'} />
                        </div>
                        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', fontWeight: 600, color: active ? '#FAF6EF' : '#D4C9B8', letterSpacing: '0.02em', flex: 1 }}>
                          {s.label}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px', paddingLeft: '52px' }}>
                        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', lineHeight: 1.4, flex: 1 }}>{s.description}</div>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: active ? '#E8C97A' : '#C9A84C', whiteSpace: 'nowrap', fontWeight: 500, flexShrink: 0 }}>{s.price}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4vw, 28px)', color: '#FAF6EF', marginBottom: '6px' }}>
                Choisissez votre date
              </h3>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968', marginBottom: '24px', letterSpacing: '0.05em' }}>
                Seules les dates dorées sont disponibles
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <button onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: weekOffset === 0 ? 'not-allowed' : 'pointer', opacity: weekOffset === 0 ? 0.3 : 1, transition: 'all 0.2s', flexShrink: 0 }}>
                  <ChevronLeft size={15} color="#C9A84C" />
                </button>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {format(visibleDays[0], 'd MMM', { locale: fr })} — {format(visibleDays[6], 'd MMM yyyy', { locale: fr })}
                </span>
                <button onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))} disabled={weekOffset >= 3} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: weekOffset >= 3 ? 'not-allowed' : 'pointer', opacity: weekOffset >= 3 ? 0.3 : 1, transition: 'all 0.2s', flexShrink: 0 }}>
                  <ChevronRight size={15} color="#C9A84C" />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '5px' }}>
                {visibleDays.map((date) => {
                  const avail = isDateAvailable(date);
                  const sel = selectedDate && isSameDay(date, selectedDate);
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const daySlots = availability[dateStr] || [];
                  return (
                    <motion.button key={date.toISOString()} disabled={!avail} onClick={() => { setSelectedDate(date); setSelectedTime(null); }} whileHover={avail ? { scale: 1.06 } : {}} style={{
                      padding: '8px 2px',
                      background: sel ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : avail ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                      border: sel ? '1px solid #C9A84C' : avail ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '6px', cursor: avail ? 'pointer' : 'not-allowed', opacity: avail ? 1 : 0.3, transition: 'all 0.2s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: 0,
                    }}>
                      <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '8px', letterSpacing: '0.05em', textTransform: 'uppercase', color: sel ? '#0A0A0A' : '#8A7968' }}>{format(date, 'EEE', { locale: fr })}</span>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(16px, 3.5vw, 22px)', color: sel ? '#0A0A0A' : avail ? '#C9A84C' : '#8A7968', lineHeight: 1 }}>{format(date, 'd')}</span>
                      <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '8px', color: sel ? '#0A0A0A' : '#8A7968', textTransform: 'uppercase' }}>{format(date, 'MMM', { locale: fr })}</span>
                      {avail && <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '7px', color: sel ? '#0A0A0A' : '#C9A84C', opacity: 0.75 }}>{daySlots.length} cr.</span>}
                    </motion.button>
                  );
                })}
              </div>

              {selectedDate && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '28px' }}>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', marginBottom: '14px', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={13} color="#C9A84C" /> Créneaux disponibles
                  </p>
                  {openSlots.length === 0 ? (
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', fontStyle: 'italic' }}>Aucun créneau disponible pour cette date.</p>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {openSlots.map((t) => {
                        const blocked = isSlotBooked(t);
                        const sel = selectedTime === t;
                        return (
                          <motion.button key={t} disabled={blocked} onClick={() => setSelectedTime(t)} whileHover={!blocked ? { scale: 1.06 } : {}} style={{
                            padding: '9px 14px',
                            background: sel ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent',
                            border: sel ? '1px solid #C9A84C' : blocked ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(201,168,76,0.3)',
                            borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '13px',
                            color: sel ? '#0A0A0A' : blocked ? '#3A3A3A' : '#FAF6EF',
                            cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.3 : 1, transition: 'all 0.2s',
                            textDecoration: blocked ? 'line-through' : 'none',
                          }}>{t}</motion.button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4vw, 28px)', color: '#FAF6EF', marginBottom: '28px' }}>Vos informations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { label: 'Votre prénom *', value: name, setter: setName, placeholder: 'Ex: Aïssatou', type: 'text' },
                  { label: 'Votre numéro de téléphone *', value: phone, setter: setPhone, placeholder: 'Ex: 77 000 00 00', type: 'tel' },
                ].map((field) => (
                  <div key={field.label}>
                    <label style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A7968', display: 'block', marginBottom: '8px' }}>{field.label}</label>
                    <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder} style={{ width: '100%', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '2px', color: '#FAF6EF', fontFamily: 'Jost, sans-serif', fontSize: '14px', outline: 'none', transition: 'border 0.3s', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#C9A84C'}
                      onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4vw, 28px)', color: '#FAF6EF', marginBottom: '28px' }}>Récapitulatif</h3>

              {[
                { label: 'Prestation', value: SERVICES.find(s => s.id === selectedService)?.label },
                { label: 'Tarif', value: SERVICES.find(s => s.id === selectedService)?.price },
                { label: 'Date', value: selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr }) : '' },
                { label: 'Heure', value: selectedTime },
                { label: 'Prénom', value: name },
                phone ? { label: 'Téléphone', value: phone } : null,
              ].filter(Boolean).map((r) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '14px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A7968', flexShrink: 0, paddingTop: '3px' }}>{r.label}</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#FAF6EF', textAlign: 'right', textTransform: 'capitalize' }}>{r.value}</span>
                </div>
              ))}

              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <CreditCard size={18} color="#C9A84C" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Acompte requis</p>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', lineHeight: 1.7, margin: 0 }}>
                    Un acompte de <strong style={{ color: '#FAF6EF' }}>{ACOMPTE_AMOUNT.toLocaleString()} FCFA</strong> est requis pour confirmer votre réservation.
                    Paiement par <strong style={{ color: '#FAF6EF' }}>Wave</strong> ou <strong style={{ color: '#FAF6EF' }}>Orange Money</strong> au <strong style={{ color: '#C9A84C' }}>+221 77 669 57 90</strong>.
                  </p>
                </div>
              </div>

              <motion.button
                onClick={handleCreateBooking}
                disabled={creatingBooking}
                whileHover={!creatingBooking ? { scale: 1.03, boxShadow: '0 8px 30px rgba(201,168,76,0.3)' } : {}}
                whileTap={!creatingBooking ? { scale: 0.97 } : {}}
                style={{
                  width: '100%', marginTop: '24px', padding: '18px',
                  background: creatingBooking ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #C9A84C, #E8C97A)',
                  color: creatingBooking ? '#8A7968' : '#0A0A0A', border: 'none', borderRadius: '4px',
                  fontFamily: 'Jost, sans-serif', fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase',
                  fontWeight: 600, cursor: creatingBooking ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}
              >
                {creatingBooking ? 'Création en cours...' : 'Confirmer et payer l\'acompte →'}
              </motion.button>
            </div>
          )}

          {/* ── STEP 5 ── */}
          {step === 5 && (
            <div>
              {!paymentSent ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CreditCard size={20} color="#C9A84C" />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(20px, 4vw, 26px)', color: '#FAF6EF', margin: 0 }}>Paiement de l'acompte</h3>
                      <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', margin: 0, marginTop: '4px' }}>Votre créneau est réservé temporairement</p>
                    </div>
                  </div>

                  <div style={{ padding: '20px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '6px', marginBottom: '24px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Instructions de paiement</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { step: '1', text: `Envoyez ${ACOMPTE_AMOUNT.toLocaleString()} FCFA via Wave ou Orange Money` },
                        { step: '2', text: 'Numéro de paiement : +221 77 669 57 90 (Mamifa)' },
                        { step: '3', text: 'Faites une capture d\'écran de la confirmation' },
                        { step: '4', text: 'Uploadez la preuve ci-dessous' },
                      ].map(({ step: n, text }) => (
                        <div key={n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Jost, sans-serif', fontSize: '11px', fontWeight: 700, color: '#0A0A0A' }}>{n}</div>
                          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF', margin: 0, lineHeight: 1.5 }}>{text}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <AlertCircle size={15} color="#C9A84C" style={{ flexShrink: 0 }} />
                      <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', margin: 0 }}>
                        Votre créneau sera libéré si aucune preuve n'est envoyée dans les 2h.
                      </p>
                    </div>
                  </div>

                  {/* ID de réservation affiché — utile pour annulation */}
                  <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '4px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>Votre numéro de réservation</p>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#C9A84C', margin: 0, wordBreak: 'break-all' }}>{bookingId}</p>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', margin: '6px 0 0', opacity: 0.7 }}>Conservez ce numéro pour modifier ou annuler votre réservation.</p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Preuve de paiement *
                    </p>
                    <div
                      onClick={() => proofRef.current?.click()}
                      style={{
                        border: proofPreview ? '1px solid rgba(201,168,76,0.5)' : '2px dashed rgba(201,168,76,0.25)',
                        borderRadius: '6px', padding: proofPreview ? '0' : '32px',
                        cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center',
                        overflow: 'hidden', background: 'rgba(255,255,255,0.02)',
                      }}
                      onMouseEnter={e => { if (!proofPreview) e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)'; }}
                      onMouseLeave={e => { if (!proofPreview) e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; }}
                    >
                      <input ref={proofRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProofChange} />
                      {proofPreview ? (
                        <div style={{ position: 'relative' }}>
                          <img src={proofPreview} alt="Preuve" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(10,10,10,0.8)', borderRadius: '4px', padding: '6px 12px', fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C' }}>
                            Cliquer pour changer
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Upload size={28} color="#C9A84C" style={{ marginBottom: '12px', opacity: 0.7 }} />
                          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', margin: 0 }}>
                            Cliquer pour uploader la preuve de paiement
                          </p>
                          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', opacity: 0.5, marginTop: '6px' }}>PNG, JPG — Max 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.button
                    onClick={handleSendProof}
                    disabled={!proofFile || uploading}
                    whileHover={proofFile && !uploading ? { scale: 1.03, boxShadow: '0 8px 30px rgba(37,211,102,0.3)' } : {}}
                    style={{
                      width: '100%', padding: '18px',
                      background: proofFile && !uploading ? 'linear-gradient(135deg, #25D366, #128C7E)' : 'rgba(255,255,255,0.05)',
                      color: proofFile && !uploading ? '#FFFFFF' : '#8A7968',
                      border: 'none', borderRadius: '4px',
                      fontFamily: 'Jost, sans-serif', fontSize: '13px', letterSpacing: '0.2em',
                      textTransform: 'uppercase', fontWeight: 600,
                      cursor: proofFile && !uploading ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    }}
                  >
                    <MessageCircle size={18} />
                    {uploading ? 'Envoi en cours...' : 'Envoyer la preuve'}
                  </motion.button>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(37,211,102,0.2), rgba(18,140,126,0.1))', border: '1px solid rgba(37,211,102,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle2 size={32} color="#25D366" />
                  </div>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#FAF6EF', marginBottom: '12px' }}>Preuve envoyée !</h3>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '14px', color: '#8A7968', maxWidth: '360px', margin: '0 auto 24px', lineHeight: 1.7 }}>
                    Votre réservation est en attente de validation. Mamifa vous confirmera votre rendez-vous par WhatsApp après vérification du paiement.
                  </p>
                  <div style={{ padding: '16px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: '4px', marginBottom: '20px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#25D366', margin: 0, letterSpacing: '0.05em' }}>
                      ✓ Créneau bloqué · ✓ Preuve reçue · ⏳ Validation en cours
                    </p>
                  </div>
                  {/* Remind booking ID */}
                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '4px', textAlign: 'left' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>N° de réservation — conservez-le</p>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#C9A84C', margin: 0, wordBreak: 'break-all' }}>{bookingId}</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          {step < 5 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
              {step > 1 ? (
                <motion.button onClick={() => setStep(step - 1)} whileHover={{ x: -4 }} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', color: '#8A7968', padding: '12px 20px', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                  <ChevronLeft size={14} /> Retour
                </motion.button>
              ) : <div />}

              {step < 4 && (
                <motion.button onClick={() => canProceed() && setStep(step + 1)} whileHover={canProceed() ? { scale: 1.04, boxShadow: '0 4px 20px rgba(201,168,76,0.4)' } : {}} style={{ background: canProceed() ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.05)', color: canProceed() ? '#0A0A0A' : '#8A7968', border: 'none', padding: '12px 32px', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, cursor: canProceed() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                  Suivant <ChevronRight size={14} />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Cancel / Modify section ─────────────────────────────────────── */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            onClick={() => { setShowCancelModal(true); setCancelStatus(null); setFoundBooking(null); setCancelBookingId(''); }}
            style={{ background: 'transparent', border: 'none', fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(138,121,104,0.3)', opacity: 0.7 }}
          >
            Modifier ou annuler une réservation existante
          </button>
        </div>
      </div>

      {/* ── Cancel Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCancelModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '440px', background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px', padding: '32px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', margin: 0 }}>Annuler / Modifier</h3>
                <button onClick={() => setShowCancelModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A7968', fontSize: '20px', lineHeight: 1 }}>×</button>
              </div>

              {/* Step: enter ID */}
              {(cancelStatus === null || cancelStatus === 'not_found' || cancelStatus === 'error') && (
                <>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', marginBottom: '20px', lineHeight: 1.6 }}>
                    Entrez votre numéro de réservation (reçu lors de votre réservation).
                  </p>
                  <label style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A7968', display: 'block', marginBottom: '8px' }}>Numéro de réservation</label>
                  <input
                    value={cancelBookingId}
                    onChange={e => setCancelBookingId(e.target.value)}
                    placeholder="Ex: ABC123xyz..."
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '2px', color: '#FAF6EF', fontFamily: 'Jost, sans-serif', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
                    onKeyDown={e => e.key === 'Enter' && handleCancelLookup()}
                  />
                  {cancelStatus === 'not_found' && (
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#E74C3C', marginBottom: '12px' }}>❌ Réservation introuvable. Vérifiez le numéro.</p>
                  )}
                  {cancelStatus === 'error' && (
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#E74C3C', marginBottom: '12px' }}>Erreur de connexion. Veuillez réessayer.</p>
                  )}
                  <motion.button
                    onClick={handleCancelLookup}
                    disabled={!cancelBookingId.trim()}
                    whileHover={cancelBookingId.trim() ? { scale: 1.03 } : {}}
                    style={{ width: '100%', padding: '14px', background: cancelBookingId.trim() ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.05)', color: cancelBookingId.trim() ? '#0A0A0A' : '#8A7968', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, cursor: cancelBookingId.trim() ? 'pointer' : 'not-allowed' }}
                  >
                    Rechercher
                  </motion.button>
                </>
              )}

              {/* Loading */}
              {cancelStatus === 'loading' && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: '32px', height: '32px', border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968' }}>Recherche en cours...</p>
                </div>
              )}

              {/* Found booking */}
              {cancelStatus === 'found' && foundBooking && (
                <>
                  <div style={{ padding: '16px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', marginBottom: '20px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Réservation trouvée</p>
                    {[
                      { l: 'Nom', v: foundBooking.name },
                      { l: 'Prestation', v: foundBooking.service },
                      { l: 'Date', v: `${foundBooking.date} à ${foundBooking.time}` },
                      { l: 'Statut', v: { pending_payment: 'En attente paiement', waiting_confirmation: 'Preuve envoyée', confirmed: 'Confirmé', cancelled: 'Annulé', cancellation_requested: 'Annulation demandée', expired: 'Expiré' }[foundBooking.status] || foundBooking.status },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</span>
                        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF', textAlign: 'right' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Already cancelled / expired */}
                  {['cancelled', 'expired', 'cancellation_requested'].includes(foundBooking.status) ? (
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', textAlign: 'center', padding: '12px' }}>
                      {foundBooking.status === 'cancellation_requested'
                        ? '⏳ Votre demande d\'annulation est en cours de traitement.'
                        : 'Cette réservation est déjà annulée ou expirée.'}
                    </p>
                  ) : (
                    <>
                      {/* Cancellation policy info */}
                      <div style={{ padding: '12px', background: ['pending_payment', 'waiting_confirmation'].includes(foundBooking.status) ? 'rgba(37,211,102,0.05)' : 'rgba(232,164,76,0.05)', border: `1px solid ${['pending_payment', 'waiting_confirmation'].includes(foundBooking.status) ? 'rgba(37,211,102,0.2)' : 'rgba(232,164,76,0.2)'}`, borderRadius: '4px', marginBottom: '16px' }}>
                        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: ['pending_payment', 'waiting_confirmation'].includes(foundBooking.status) ? '#25D366' : '#E8A44C', margin: 0, lineHeight: 1.6 }}>
                          {['pending_payment', 'waiting_confirmation'].includes(foundBooking.status)
                            ? '✓ Annulation libre — votre créneau sera immédiatement libéré.'
                            : '⚠️ RDV confirmé — une demande d\'annulation sera envoyée à Mamifa pour traitement.'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setCancelStatus(null); setFoundBooking(null); setCancelBookingId(''); }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                          Retour
                        </button>
                        <motion.button onClick={handleConfirmCancel} whileHover={{ scale: 1.03 }} style={{ flex: 2, padding: '12px', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', color: '#E74C3C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>
                          <XCircle size={14} style={{ marginRight: '6px', display: 'inline' }} />
                          {['pending_payment', 'waiting_confirmation'].includes(foundBooking.status) ? 'Confirmer l\'annulation' : 'Demander l\'annulation'}
                        </motion.button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Success states */}
              {cancelStatus === 'cancelled_free' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '10px 0' }}>
                  <CheckCircle2 size={40} color="#25D366" style={{ marginBottom: '16px' }} />
                  <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', marginBottom: '10px' }}>Réservation annulée</h4>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', lineHeight: 1.6 }}>
                    Votre réservation a été annulée et le créneau a été libéré.
                  </p>
                </motion.div>
              )}
              {cancelStatus === 'cancel_requested' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '10px 0' }}>
                  <CheckCircle2 size={40} color="#E8A44C" style={{ marginBottom: '16px' }} />
                  <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', marginBottom: '10px' }}>Demande envoyée</h4>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', lineHeight: 1.6 }}>
                    Votre demande d'annulation a été transmise à Mamifa via WhatsApp. Vous serez contacté pour confirmer.
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) { #reserver { padding: 60px 16px !important; } }
        @media (max-width: 480px) { #reserver { padding: 50px 12px !important; } }
        input::placeholder { color: rgba(138,121,104,0.5); }
        * { box-sizing: border-box; }
      `}</style>
    </section>
  );
}