import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase.js';
import {
  collection, onSnapshot, query, where, addDoc, serverTimestamp,
  updateDoc, doc, getDoc, setDoc
} from 'firebase/firestore';
import { format, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Sparkles, Camera, Crown, Clock, ChevronLeft, ChevronRight,
  MessageCircle, CreditCard, Check, Wand2, Upload, AlertCircle,
  CheckCircle2, XCircle, ArrowRight, Images
} from 'lucide-react';
import { uploadImage } from '../utils/uploadImage';

const WHATSAPP_NUMBER = '221776695790';
const ACOMPTE_MIN = 2000;
const PAYMENT_EXPIRY_HOURS = 24;

const SERVICES = [
  { id: 1, label: 'Maquillage Simple', price: '7 000 FCFA', montantTotal: 7000, description: 'Look naturel et soigné, idéal pour le quotidien', Icon: Wand2 },
  { id: 2, label: 'Maquillage Complet Glam', price: '10 000 FCFA', montantTotal: 10000, description: 'Look complet, longue tenue, éclat assuré', Icon: Sparkles },
  { id: 3, label: 'Maquillage + Shooting Photo', price: '15 000 FCFA', montantTotal: 15000, description: 'Maquillage pro + séance photo incluse', Icon: Camera },
  { id: 4, label: 'Cérémonie — Henné / Baptême / Mariage', price: 'À partir de 25 000 FCFA', montantTotal: 25000, description: 'Look royal garanti · Retouche express disponible en supplément (+5 000 FCFA)', Icon: Crown },
];

export const PAYMENT_STATUS_LABEL = {
  en_attente_paiement: 'En attente de paiement',
  acompte_paye:        'Acompte payé',
  paye_entierement:    'Payé entièrement',
  expire:              'Expiré — non payé',
  annule:              'Annulé',
};

export const BOOKING_STATUS_LABEL = {
  en_attente_paiement:    'En attente de paiement',
  acompte_paye:           'Acompte payé',
  paye_entierement:       'Payé entièrement',
  expire:                 'Expiré',
  annule:                 'Annulé',
  cancellation_requested: 'Annulation demandée',
  completed:              'Terminé',
  archived:               'Archivé',
};

const STEPS = [
  { n: 1, label: 'Prestation' },
  { n: 2, label: 'Date & Heure' },
  { n: 3, label: 'Vos infos' },
  { n: 4, label: 'Paiement' },
  { n: 5, label: 'Confirmation' },
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
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', marginBottom: '16px', padding: '10px 20px',
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent)',
              border: '1px solid rgba(201,168,76,0.15)', borderRadius: '40px',
              margin: '0 auto 20px', width: 'fit-content',
            }}
          >
            <motion.div animate={{ x: [0, 18, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>👆</span>
              <ArrowRight size={14} color="#C9A84C" />
            </motion.div>
            <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C' }}>
              Faites défiler pour découvrir mes looks
            </span>
            <motion.div animate={{ x: [0, -18, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}>
              <Images size={14} color="#C9A84C" style={{ opacity: 0.6 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canScrollLeft && (
          <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={() => scrollTo(-1)} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <ChevronLeft size={20} color="#C9A84C" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {canScrollRight && (
          <motion.button initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={() => scrollTo(1)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <ChevronRight size={20} color="#C9A84C" />
          </motion.button>
        )}
      </AnimatePresence>

      <div ref={scrollRef} onScroll={checkScroll} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px', scrollSnapType: 'x mandatory', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '0 8px 12px' }}>
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {photos.map((photo, i) => (
          <motion.div key={photo.id || i} style={{ flexShrink: 0, width: 'clamp(220px, 70vw, 320px)', scrollSnapAlign: 'start', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)', position: 'relative' }}>
            <img src={photo.url} alt={photo.title} draggable={false} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 16px 16px', background: 'linear-gradient(to top, rgba(10,10,10,0.85) 0%, transparent 100%)' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: '#FAF6EF' }}>{photo.title}</div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '4px' }}>{photo.category}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {photos.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          {photos.map((_, i) => (
            <div key={i} style={{ width: i === currentIndex ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === currentIndex ? '#C9A84C' : 'rgba(201,168,76,0.25)', transition: 'all 0.3s ease' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Countdown Timer Component ────────────────────────────────────────────────
function CountdownTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const expDate = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
      const diff = expDate - new Date();
      if (diff <= 0) { setExpired(true); setRemaining('Expiré'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h.toString().padStart(2,'0')}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span style={{ color: expired ? '#E74C3C' : '#E8A44C', fontFamily: 'Jost, sans-serif', fontSize: '13px', fontWeight: 600 }}>
      {remaining}
    </span>
  );
}

// ─── Main Booking Component ───────────────────────────────────────────────────
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

  // Payment
  const [paymentType, setPaymentType] = useState('acompte'); // 'acompte' | 'total'
  const [customAmount, setCustomAmount] = useState('');

  // Step 5 — confirmation state
  const [bookingId, setBookingId] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  // Cancellation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState('');
  const [cancelStatus, setCancelStatus] = useState(null);
  const [foundBooking, setFoundBooking] = useState(null);

  const proofRef = useRef();

  const visibleDays = Array.from({ length: 7 }, (_, i) =>
    addDays(new Date(), weekOffset * 7 + i + 1)
  );

  const service = SERVICES.find(s => s.id === selectedService);
  const montantTotal = service?.montantTotal || 0;

  // ── Calcul du montant d'acompte avec personnalisation ──────────────────────
  const getAcompteAmount = () => {
    if (paymentType === 'total') return montantTotal;
    const parsed = parseInt(customAmount);
    if (!isNaN(parsed) && parsed >= ACOMPTE_MIN && parsed <= montantTotal) return parsed;
    return ACOMPTE_MIN;
  };

  const montantPaye = getAcompteAmount();
  const resteAPayer = montantTotal - montantPaye;
  const statutPaiement = paymentType === 'total' ? 'paye_entierement' : 'acompte_paye';

  // Raccourcis acompte selon le montant total
  const getAcompteShortcuts = () => {
    const shortcuts = [2000, 3000, 4000, 5000, 7000, 10000];
    return shortcuts.filter(v => v >= ACOMPTE_MIN && v < montantTotal);
  };

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
          .filter(d => !['annule', 'expire'].includes(d.data().statutReservation))
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

  // ── Create booking ──────────────────────────────────────────────────────────
  const handleCreateBooking = async () => {
    if (creatingBooking) return;
    setCreatingBooking(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const now = new Date();
      const expirationAcompteAt = new Date(now.getTime() + PAYMENT_EXPIRY_HOURS * 3600 * 1000);
      const acompteChoisi = montantPaye;

      const docRef = await addDoc(collection(db, 'bookings'), {
        // Client
        name: name.trim(),
        phone: phone.trim(),
        // Service
        serviceId: service.id,
        service: service.label,
        servicePrice: service.price,
        // Date/time
        date: dateStr,
        time: selectedTime,
        dateRendezVous: `${dateStr}T${selectedTime}:00`,
        // Payment
        montantTotal,
        montantAcompteChoisi: acompteChoisi,
        montantPaye: 0,
        resteAPayer: montantTotal,
        statutPaiement: 'en_attente_paiement',
        typeReglement: paymentType,
        // Booking status
        statutReservation: 'en_attente_paiement',
        status: 'en_attente_paiement',
        // Expiry
        expirationAcompteAt,
        dateReservation: serverTimestamp(),
        createdAt: serverTimestamp(),
        // Proof
        proofUrl: null,
      });

      setBookingId(docRef.id);
      setBookingData({
        id: docRef.id,
        name: name.trim(), phone: phone.trim(),
        service: service.label, servicePrice: service.price,
        date: dateStr, time: selectedTime,
        montantTotal, montantAcompteChoisi: acompteChoisi,
        expirationAcompteAt,
      });

      // Auto-notify client via WhatsApp
      const msg =
`⏳ *MAGICAL HAND — Réservation en attente*
━━━━━━━━━━━━━━━━━━━
Bonjour *${name.trim()}* 💄

Votre créneau est réservé temporairement.

💋 Prestation : ${service.label}
📅 Date : ${dateStr} à ${selectedTime}
━━━━━━━━━━━━━━━━━━━
Vous avez *24h* pour payer un acompte de *${acompteChoisi.toLocaleString()} FCFA* afin de confirmer votre rendez-vous.

Sans paiement dans ce délai, le créneau sera automatiquement libéré.

📌 Votre N° de réservation : ${docRef.id}

_Magical Hand by Mamifa_ ✨`;
      window.open(`https://wa.me/${phone.trim().replace(/\s/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');

      setStep(5);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de la réservation. Veuillez réessayer.');
    } finally {
      setCreatingBooking(false);
    }
  };

  // ── Send payment proof ──────────────────────────────────────────────────────
  const handleSendProof = async () => {
    if (!proofFile || !bookingId || uploading) return;
    setUploading(true);
    try {
      const url = await uploadImage(proofFile);
      const isPaidFull = paymentType === 'total';
      const newStatut = isPaidFull ? 'paye_entierement' : 'acompte_paye';
      const montant = montantPaye; // utilise le montant personnalisé
      const reste = montantTotal - montant;

      await updateDoc(doc(db, 'bookings', bookingId), {
        proofUrl: url,
        statutPaiement: newStatut,
        statutReservation: newStatut,
        status: newStatut,
        montantPaye: montant,
        resteAPayer: reste,
        proofSentAt: serverTimestamp(),
        paymentConfirmedAt: serverTimestamp(),
      });

      // Block slot in availability
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const availSnap = await getDoc(doc(db, 'availability', dateStr));
      if (availSnap.exists()) {
        const slots = (availSnap.data().slots || []).filter(s => s !== selectedTime);
        if (slots.length === 0) {
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'availability', dateStr));
        } else {
          await setDoc(doc(db, 'availability', dateStr), { slots, updatedAt: serverTimestamp() }, { merge: true });
        }
      }

      // WA message to admin
      const adminMsg = isPaidFull
        ? `✔️ *MAGICAL HAND — Paiement complet*\n━━━━━━━━━━━━━━━━━━━\n👤 ${name}\n📱 ${phone}\n💋 ${service.label}\n📅 ${dateStr} à ${selectedTime}\n💳 Total payé : ${montantTotal.toLocaleString()} FCFA\n━━━━━━━━━━━━━━━━━━━\nMerci de valider dans le dashboard.`
        : `✔️ *MAGICAL HAND — Acompte reçu*\n━━━━━━━━━━━━━━━━━━━\n👤 ${name}\n📱 ${phone}\n💋 ${service.label}\n📅 ${dateStr} à ${selectedTime}\n💳 Acompte payé : ${montant.toLocaleString()} FCFA\n💰 Reste à payer le jour J : ${reste.toLocaleString()} FCFA\n━━━━━━━━━━━━━━━━━━━\nMerci de valider dans le dashboard.`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(adminMsg)}`, '_blank');

      // WA message to client
      const clientMsg = isPaidFull
        ? `✔️ *Paiement complet reçu*\nMerci *${name}*, votre rendez-vous est entièrement réglé.\n💋 ${service.label} — ${dateStr} à ${selectedTime}\n_Magical Hand by Mamifa_ ✨`
        : `✔️ *Réservation confirmée*\nAcompte payé : *${montant.toLocaleString()} FCFA*\nReste à payer : *${reste.toLocaleString()} FCFA* le jour du rendez-vous.\n💋 ${service.label} — ${dateStr} à ${selectedTime}\n_Magical Hand by Mamifa_ ✨`;
      window.open(`https://wa.me/${phone.replace(/\s/g,'')}?text=${encodeURIComponent(clientMsg)}`, '_blank');

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
      const snap = await getDoc(doc(db, 'bookings', cancelBookingId.trim()));
      if (!snap.exists()) { setCancelStatus('not_found'); return; }
      setFoundBooking({ id: snap.id, ...snap.data() });
      setCancelStatus('found');
    } catch { setCancelStatus('error'); }
  };

  const handleConfirmCancel = async () => {
    if (!foundBooking) return;
    setCancelStatus('loading');
    try {
      const isFreeCancel = ['en_attente_paiement'].includes(foundBooking.statutReservation);
      const newStatus = isFreeCancel ? 'annule' : 'cancellation_requested';

      await updateDoc(doc(db, 'bookings', foundBooking.id), {
        statutReservation: newStatus,
        status: newStatus,
        cancelRequestedAt: serverTimestamp(),
      });

      if (isFreeCancel && foundBooking.date && foundBooking.time) {
        const availSnap = await getDoc(doc(db, 'availability', foundBooking.date));
        if (availSnap.exists()) {
          const slots = availSnap.data().slots || [];
          if (!slots.includes(foundBooking.time)) {
            await setDoc(doc(db, 'availability', foundBooking.date), {
              slots: [...slots, foundBooking.time].sort(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        }
      }

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
    } catch { setCancelStatus('error'); }
  };

  const canProceed = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return selectedDate !== null && selectedTime !== null;
    if (step === 3) return name.trim().length > 2 && phone.trim().length > 5;
    return false;
  };

  // Styles
  const inputStyle = {
    width: '100%', padding: '14px 18px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(201,168,76,0.25)', borderRadius: '2px', color: '#FAF6EF',
    fontFamily: 'Jost, sans-serif', fontSize: '14px', outline: 'none',
    transition: 'border 0.3s', boxSizing: 'border-box',
  };

  return (
    <section id="reserver" className="booking-section">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ textAlign: 'center', marginBottom: '70px' }}>
        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '16px' }}>Réservation</p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 400, color: '#FAF6EF', marginBottom: '16px' }}>
          Prendre Rendez-Vous
        </h2>
        <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '0 auto 24px' }} />
        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '14px', color: '#8A7968', maxWidth: '440px', margin: '0 auto' }}>
          Choisissez votre prestation, votre date, et sécurisez votre créneau avec un acompte minimum de {ACOMPTE_MIN.toLocaleString()} FCFA.
        </p>
      </motion.div>

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', fontWeight: 600, background: step >= s.n ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent', color: step >= s.n ? '#0A0A0A' : '#8A7968', border: step >= s.n ? 'none' : '1px solid rgba(201,168,76,0.3)', transition: 'all 0.4s', flexShrink: 0 }}>
                  {step > s.n ? <Check size={13} strokeWidth={3} /> : s.n}
                </div>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: step >= s.n ? '#C9A84C' : '#8A7968', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < 4 && (
                <div style={{ flex: 1, height: '1px', background: step > s.n ? 'linear-gradient(90deg, #C9A84C, rgba(201,168,76,0.4))' : 'rgba(201,168,76,0.15)', marginBottom: '24px', maxWidth: '48px', transition: 'all 0.4s' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '4px', padding: 'clamp(20px, 5vw, 44px)' }}>

          {/* ── STEP 1: Service ── */}
          {step === 1 && (
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4vw, 28px)', color: '#FAF6EF', marginBottom: '24px' }}>Choisissez votre prestation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {SERVICES.map((s) => {
                  const active = selectedService === s.id;
                  const { Icon } = s;
                  return (
                    <motion.button key={s.id} onClick={() => setSelectedService(s.id)} whileHover={{ x: 4 }} style={{ background: active ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,122,0.07))' : 'rgba(255,255,255,0.02)', border: active ? '1px solid rgba(201,168,76,0.65)' : '1px solid rgba(201,168,76,0.12)', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: active ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s' }}>
                          <Icon size={18} strokeWidth={1.5} color={active ? '#0A0A0A' : '#C9A84C'} />
                        </div>
                        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', fontWeight: 600, color: active ? '#FAF6EF' : '#D4C9B8', letterSpacing: '0.02em', flex: 1 }}>{s.label}</div>
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

          {/* ── STEP 2: Date & Time ── */}
          {step === 2 && (
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4vw, 28px)', color: '#FAF6EF', marginBottom: '6px' }}>Choisissez votre date</h3>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968', marginBottom: '24px', letterSpacing: '0.05em' }}>Seules les dates dorées sont disponibles</p>
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
                    <motion.button key={date.toISOString()} disabled={!avail} onClick={() => { setSelectedDate(date); setSelectedTime(null); }} whileHover={avail ? { scale: 1.06 } : {}} style={{ padding: '8px 2px', background: sel ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : avail ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)', border: sel ? '1px solid #C9A84C' : avail ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: avail ? 'pointer' : 'not-allowed', opacity: avail ? 1 : 0.3, transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: 0 }}>
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
                          <motion.button key={t} disabled={blocked} onClick={() => setSelectedTime(t)} whileHover={!blocked ? { scale: 1.06 } : {}} style={{ padding: '9px 14px', background: sel ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent', border: sel ? '1px solid #C9A84C' : blocked ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '13px', color: sel ? '#0A0A0A' : blocked ? '#3A3A3A' : '#FAF6EF', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.3 : 1, transition: 'all 0.2s', textDecoration: blocked ? 'line-through' : 'none' }}>{t}</motion.button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* ── STEP 3: Info ── */}
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
                    <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C9A84C'}
                      onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4: Payment ── */}
          {step === 4 && (
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4vw, 28px)', color: '#FAF6EF', marginBottom: '28px' }}>Récapitulatif & paiement</h3>

              {/* Recap */}
              {[
                { label: 'Prestation', value: service?.label },
                { label: 'Tarif total', value: service?.price },
                { label: 'Date', value: selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr }) : '' },
                { label: 'Heure', value: selectedTime },
                { label: 'Prénom', value: name },
                phone ? { label: 'Téléphone', value: phone } : null,
              ].filter(Boolean).map((r) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '12px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A7968', flexShrink: 0, paddingTop: '3px' }}>{r.label}</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#FAF6EF', textAlign: 'right', textTransform: 'capitalize' }}>{r.value}</span>
                </div>
              ))}

              {/* Payment type choice */}
              <div style={{ marginTop: '24px', marginBottom: '20px' }}>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={14} color="#C9A84C" /> Choisissez le montant à payer maintenant
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* Acompte */}
                  <motion.button
                    onClick={() => setPaymentType('acompte')}
                    whileHover={{ x: 3 }}
                    style={{ padding: '16px 20px', background: paymentType === 'acompte' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.02)', border: paymentType === 'acompte' ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(201,168,76,0.15)', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                  >
                    <div>
                      <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF', fontWeight: 600, marginBottom: '4px' }}>
                        Acompte
                        {paymentType === 'acompte' && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#25D366' }}>✓ Sélectionné</span>}
                      </div>
                      <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968' }}>
                        Minimum {ACOMPTE_MIN.toLocaleString()} FCFA — reste à payer le jour J
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#C9A84C', fontWeight: 500, flexShrink: 0, marginLeft: '12px' }}>
                      {montantPaye.toLocaleString()} F
                    </div>
                  </motion.button>

                  {/* Champ montant personnalisé — visible si acompte sélectionné */}
                  <AnimatePresence>
                    {paymentType === 'acompte' && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '16px 18px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '6px' }}>
                          <label style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                            Montant de l'acompte (min. {ACOMPTE_MIN.toLocaleString()} FCFA)
                          </label>

                          {/* Raccourcis rapides */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                            {getAcompteShortcuts().map(v => (
                              <button
                                key={v}
                                onClick={() => setCustomAmount(String(v))}
                                style={{
                                  padding: '6px 14px',
                                  background: (customAmount === String(v) || (!customAmount && v === ACOMPTE_MIN))
                                    ? 'rgba(201,168,76,0.2)'
                                    : 'rgba(255,255,255,0.03)',
                                  border: (customAmount === String(v) || (!customAmount && v === ACOMPTE_MIN))
                                    ? '1px solid rgba(201,168,76,0.6)'
                                    : '1px solid rgba(201,168,76,0.2)',
                                  borderRadius: '4px',
                                  fontFamily: 'Jost, sans-serif',
                                  fontSize: '12px',
                                  color: '#C9A84C',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {v.toLocaleString()} F
                              </button>
                            ))}
                          </div>

                          {/* Saisie libre */}
                          <div style={{ position: 'relative' }}>
                            <input
                              type="number"
                              min={ACOMPTE_MIN}
                              max={montantTotal - 1}
                              step={500}
                              value={customAmount}
                              onChange={e => setCustomAmount(e.target.value)}
                              placeholder={`${ACOMPTE_MIN.toLocaleString()} (minimum)`}
                              style={{
                                ...inputStyle,
                                paddingRight: '60px',
                                fontSize: '14px',
                              }}
                              onFocus={e => e.target.style.borderColor = '#C9A84C'}
                              onBlur={e => {
                                e.target.style.borderColor = 'rgba(201,168,76,0.25)';
                                const val = parseInt(customAmount);
                                if (customAmount && (isNaN(val) || val < ACOMPTE_MIN)) {
                                  setCustomAmount(String(ACOMPTE_MIN));
                                } else if (!isNaN(val) && val >= montantTotal) {
                                  setCustomAmount(String(montantTotal - 500 > ACOMPTE_MIN ? montantTotal - 500 : ACOMPTE_MIN));
                                }
                              }}
                            />
                            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', pointerEvents: 'none' }}>
                              FCFA
                            </span>
                          </div>

                          {/* Indication reste */}
                          {resteAPayer > 0 && (
                            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#E8A44C' }}>→</span>
                              Reste à payer le jour J : <strong style={{ color: '#FAF6EF' }}>{resteAPayer.toLocaleString()} FCFA</strong>
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Paiement total */}
                  <motion.button
                    onClick={() => setPaymentType('total')}
                    whileHover={{ x: 3 }}
                    style={{ padding: '16px 20px', background: paymentType === 'total' ? 'rgba(37,211,102,0.08)' : 'rgba(255,255,255,0.02)', border: paymentType === 'total' ? '1px solid rgba(37,211,102,0.4)' : '1px solid rgba(201,168,76,0.15)', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                  >
                    <div>
                      <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF', fontWeight: 600, marginBottom: '4px' }}>
                        Paiement total
                        {paymentType === 'total' && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#25D366' }}>✓ Sélectionné</span>}
                      </div>
                      <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968' }}>Rien à payer le jour J — tout est réglé</div>
                    </div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#25D366', fontWeight: 500, flexShrink: 0, marginLeft: '12px' }}>{montantTotal.toLocaleString()} F</div>
                  </motion.button>
                </div>
              </div>

              {/* Summary box */}
              <div style={{ padding: '16px 20px', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: resteAPayer > 0 ? '8px' : 0 }}>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.1em', textTransform: 'uppercase' }}>À payer maintenant</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#C9A84C' }}>{montantPaye.toLocaleString()} FCFA</span>
                </div>
                {resteAPayer > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Reste le jour du RDV</span>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#FAF6EF' }}>{resteAPayer.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertCircle size={13} color="#C9A84C" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', margin: 0 }}>
                    Paiement par <strong style={{ color: '#FAF6EF' }}>Wave</strong> ou <strong style={{ color: '#FAF6EF' }}>Orange Money</strong> au <strong style={{ color: '#C9A84C' }}>+221 77 669 57 90</strong>. Votre créneau sera confirmé dès réception de la preuve.
                  </p>
                </div>
              </div>

              <motion.button
                onClick={handleCreateBooking}
                disabled={creatingBooking}
                whileHover={!creatingBooking ? { scale: 1.03, boxShadow: '0 8px 30px rgba(201,168,76,0.3)' } : {}}
                whileTap={!creatingBooking ? { scale: 0.97 } : {}}
                style={{ width: '100%', padding: '18px', background: creatingBooking ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: creatingBooking ? '#8A7968' : '#0A0A0A', border: 'none', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, cursor: creatingBooking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                {creatingBooking ? 'Création en cours...' : `Réserver et payer ${montantPaye.toLocaleString()} FCFA →`}
              </motion.button>
            </div>
          )}

          {/* ── STEP 5: Confirmation + Proof ── */}
          {step === 5 && (
            <div>
              {!paymentSent ? (
                <>
                  {/* Booking ID + Countdown */}
                  <div style={{ padding: '16px 20px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '6px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>N° de réservation</p>
                        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#C9A84C', margin: 0, wordBreak: 'break-all' }}>{bookingId}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Délai restant</p>
                        {bookingData?.expirationAcompteAt && (
                          <CountdownTimer expiresAt={bookingData.expirationAcompteAt} />
                        )}
                      </div>
                    </div>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', margin: '10px 0 0', opacity: 0.7 }}>⚠️ Conservez ce numéro. Votre créneau sera libéré sans paiement dans le délai.</p>
                  </div>

                  {/* Payment instructions */}
                  <div style={{ padding: '20px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', marginBottom: '24px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>Instructions de paiement</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { n: '1', text: `Envoyez ${montantPaye.toLocaleString()} FCFA via Wave ou Orange Money` },
                        { n: '2', text: 'Numéro : +221 77 669 57 90 (Mamifa)' },
                        { n: '3', text: 'Faites une capture d\'écran de la confirmation' },
                        { n: '4', text: 'Uploadez la preuve ci-dessous pour confirmer votre RDV' },
                      ].map(({ n, text }) => (
                        <div key={n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Jost, sans-serif', fontSize: '11px', fontWeight: 700, color: '#0A0A0A' }}>{n}</div>
                          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF', margin: 0, lineHeight: 1.5 }}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Proof upload */}
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Preuve de paiement *</p>
                    <div onClick={() => proofRef.current?.click()} style={{ border: proofPreview ? '1px solid rgba(201,168,76,0.5)' : '2px dashed rgba(201,168,76,0.25)', borderRadius: '6px', padding: proofPreview ? '0' : '32px', cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}
                      onMouseEnter={e => { if (!proofPreview) e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)'; }}
                      onMouseLeave={e => { if (!proofPreview) e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; }}>
                      <input ref={proofRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProofChange} />
                      {proofPreview ? (
                        <div style={{ position: 'relative' }}>
                          <img src={proofPreview} alt="Preuve" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(10,10,10,0.8)', borderRadius: '4px', padding: '6px 12px', fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C' }}>Cliquer pour changer</div>
                        </div>
                      ) : (
                        <div>
                          <Upload size={28} color="#C9A84C" style={{ marginBottom: '12px', opacity: 0.7 }} />
                          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', margin: 0 }}>Cliquer pour uploader la preuve de paiement</p>
                          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', opacity: 0.5, marginTop: '6px' }}>PNG, JPG — Max 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.button onClick={handleSendProof} disabled={!proofFile || uploading} whileHover={proofFile && !uploading ? { scale: 1.03, boxShadow: '0 8px 30px rgba(37,211,102,0.3)' } : {}} style={{ width: '100%', padding: '18px', background: proofFile && !uploading ? 'linear-gradient(135deg, #25D366, #128C7E)' : 'rgba(255,255,255,0.05)', color: proofFile && !uploading ? '#FFFFFF' : '#8A7968', border: 'none', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, cursor: proofFile && !uploading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <MessageCircle size={18} />
                    {uploading ? 'Envoi en cours...' : 'Envoyer la preuve'}
                  </motion.button>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(37,211,102,0.2), rgba(18,140,126,0.1))', border: '1px solid rgba(37,211,102,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle2 size={32} color="#25D366" />
                  </div>
                  <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#FAF6EF', marginBottom: '12px' }}>
                    {paymentType === 'total' ? 'Paiement complet reçu !' : 'Acompte envoyé !'}
                  </h3>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '14px', color: '#8A7968', maxWidth: '360px', margin: '0 auto 24px', lineHeight: 1.7 }}>
                    {paymentType === 'total'
                      ? `Merci ${name}, votre rendez-vous est entièrement réglé. Mamifa vous confirmera votre créneau après vérification.`
                      : `Acompte payé : ${montantPaye.toLocaleString()} FCFA. Reste à payer : ${resteAPayer.toLocaleString()} FCFA le jour du rendez-vous.`}
                  </p>
                  <div style={{ padding: '16px', background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: '4px', marginBottom: '20px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#25D366', margin: 0 }}>
                      ✓ Créneau bloqué · ✓ Preuve reçue · ⏳ Validation en cours
                    </p>
                  </div>
                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '4px', textAlign: 'left' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>N° de réservation — conservez-le</p>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#C9A84C', margin: 0, wordBreak: 'break-all' }}>{bookingId}</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Navigation */}
          {step < 5 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
              {step > 1 ? (
                <motion.button onClick={() => setStep(step - 1)} whileHover={{ x: -4 }} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', color: '#8A7968', padding: '12px 20px', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                  <ChevronLeft size={14} /> Retour
                </motion.button>
              ) : <div />}

              {step < 4 && (
                <motion.button onClick={() => canProceed() && setStep(step + 1)} whileHover={canProceed() ? { scale: 1.04 } : {}} style={{ background: canProceed() ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.05)', color: canProceed() ? '#0A0A0A' : '#8A7968', border: 'none', padding: '12px 32px', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, cursor: canProceed() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                  Suivant <ChevronRight size={14} />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* Cancel/modify link */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button onClick={() => { setShowCancelModal(true); setCancelStatus(null); setFoundBooking(null); setCancelBookingId(''); }} style={{ background: 'transparent', border: 'none', fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(138,121,104,0.3)', opacity: 0.7 }}>
            Modifier ou annuler une réservation existante
          </button>
        </div>
      </div>

      {/* ── Cancel Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px', background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px', padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', margin: 0 }}>Annuler / Modifier</h3>
                <button onClick={() => setShowCancelModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A7968', fontSize: '20px', lineHeight: 1 }}>×</button>
              </div>

              {(cancelStatus === null || cancelStatus === 'not_found' || cancelStatus === 'error') && (
                <>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', marginBottom: '20px', lineHeight: 1.6 }}>
                    Entrez votre numéro de réservation (reçu lors de votre réservation).
                  </p>
                  <label style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A7968', display: 'block', marginBottom: '8px' }}>Numéro de réservation</label>
                  <input value={cancelBookingId} onChange={e => setCancelBookingId(e.target.value)} placeholder="Ex: ABC123xyz..." style={{ ...inputStyle, marginBottom: '16px' }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
                    onKeyDown={e => e.key === 'Enter' && handleCancelLookup()} />
                  {cancelStatus === 'not_found' && <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#E74C3C', marginBottom: '12px' }}>❌ Réservation introuvable. Vérifiez le numéro.</p>}
                  {cancelStatus === 'error' && <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#E74C3C', marginBottom: '12px' }}>Erreur de connexion. Veuillez réessayer.</p>}
                  <motion.button onClick={handleCancelLookup} disabled={!cancelBookingId.trim()} whileHover={cancelBookingId.trim() ? { scale: 1.03 } : {}} style={{ width: '100%', padding: '14px', background: cancelBookingId.trim() ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.05)', color: cancelBookingId.trim() ? '#0A0A0A' : '#8A7968', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, cursor: cancelBookingId.trim() ? 'pointer' : 'not-allowed' }}>
                    Rechercher
                  </motion.button>
                </>
              )}

              {cancelStatus === 'loading' && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: '32px', height: '32px', border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968' }}>Recherche en cours...</p>
                </div>
              )}

              {cancelStatus === 'found' && foundBooking && (
                <>
                  <div style={{ padding: '16px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', marginBottom: '20px' }}>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Réservation trouvée</p>
                    {[
                      { l: 'Nom', v: foundBooking.name },
                      { l: 'Prestation', v: foundBooking.service },
                      { l: 'Date', v: `${foundBooking.date} à ${foundBooking.time}` },
                      { l: 'Statut', v: BOOKING_STATUS_LABEL[foundBooking.statutReservation || foundBooking.status] || foundBooking.statutReservation || foundBooking.status },
                      (foundBooking.montantPaye > 0) ? { l: 'Payé', v: `${(foundBooking.montantPaye || 0).toLocaleString()} FCFA` } : null,
                      (foundBooking.resteAPayer > 0) ? { l: 'Reste à payer', v: `${(foundBooking.resteAPayer || 0).toLocaleString()} FCFA` } : null,
                    ].filter(Boolean).map(({ l, v }) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</span>
                        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF', textAlign: 'right' }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {['annule', 'expire', 'cancellation_requested'].includes(foundBooking.statutReservation || foundBooking.status) ? (
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', textAlign: 'center', padding: '12px' }}>
                      {(foundBooking.statutReservation || foundBooking.status) === 'cancellation_requested'
                        ? '⏳ Votre demande d\'annulation est en cours de traitement.'
                        : 'Cette réservation est déjà annulée ou expirée.'}
                    </p>
                  ) : (
                    <>
                      <div style={{ padding: '12px', background: foundBooking.statutReservation === 'en_attente_paiement' ? 'rgba(37,211,102,0.05)' : 'rgba(232,164,76,0.05)', border: `1px solid ${foundBooking.statutReservation === 'en_attente_paiement' ? 'rgba(37,211,102,0.2)' : 'rgba(232,164,76,0.2)'}`, borderRadius: '4px', marginBottom: '16px' }}>
                        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: foundBooking.statutReservation === 'en_attente_paiement' ? '#25D366' : '#E8A44C', margin: 0, lineHeight: 1.6 }}>
                          {foundBooking.statutReservation === 'en_attente_paiement'
                            ? '✓ Annulation libre — aucun acompte n\'a été versé, votre créneau sera immédiatement libéré.'
                            : '⚠️ Acompte déjà payé — une demande d\'annulation sera envoyée à Mamifa pour traitement.'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { setCancelStatus(null); setFoundBooking(null); setCancelBookingId(''); }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                          Retour
                        </button>
                        <motion.button onClick={handleConfirmCancel} whileHover={{ scale: 1.03 }} style={{ flex: 2, padding: '12px', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', color: '#E74C3C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>
                          <XCircle size={14} style={{ marginRight: '6px', display: 'inline' }} />
                          {foundBooking.statutReservation === 'en_attente_paiement' ? 'Confirmer l\'annulation' : 'Demander l\'annulation'}
                        </motion.button>
                      </div>
                    </>
                  )}
                </>
              )}

              {cancelStatus === 'cancelled_free' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '10px 0' }}>
                  <CheckCircle2 size={40} color="#25D366" style={{ marginBottom: '16px' }} />
                  <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', marginBottom: '10px' }}>Réservation annulée</h4>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', lineHeight: 1.6 }}>Votre réservation a été annulée et le créneau a été libéré.</p>
                </motion.div>
              )}
              {cancelStatus === 'cancel_requested' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '10px 0' }}>
                  <CheckCircle2 size={40} color="#E8A44C" style={{ marginBottom: '16px' }} />
                  <h4 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', marginBottom: '10px' }}>Demande envoyée</h4>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', lineHeight: 1.6 }}>Votre demande d'annulation a été transmise à Mamifa via WhatsApp. Vous serez contacté pour confirmer.</p>
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
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.4; }
        * { box-sizing: border-box; }
      `}</style>
    </section>
  );
}