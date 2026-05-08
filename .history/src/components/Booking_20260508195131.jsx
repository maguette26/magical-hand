import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '../firebase.js';
import {
 collection, onSnapshot, query, where, addDoc,
 serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
 eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
 Sparkles, Camera, Crown, Clock, ChevronLeft, ChevronRight,
 CreditCard, Check, Wand2, Upload, AlertCircle, CheckCircle2
} from 'lucide-react';
const WHATSAPP_NUMBER = '221776695790';
const ACOMPTE_PERCENT = 30; // 30% d'acompte
const SERVICES = [
 {
 id: 1,
 label: 'Maquillage Simple',
 price: '7 000 FCFA',
 priceNum: 7000,
 description: 'Look naturel et soigné, idéal pour le quotidien',
 Icon: Wand2,
 },
 {
 id: 2,
 label: 'Maquillage Complet Glam',
 price: '10 000 FCFA',
 priceNum: 10000,
 description: 'Look complet, longue tenue, éclat assuré',
 Icon: Sparkles,
 },
 {
 id: 3,
 label: 'Maquillage + Shooting Photo',
 price: '15 000 FCFA',
 priceNum: 15000,
 description: 'Maquillage pro + séance photo incluse',
 Icon: Camera,
 },
 {
 id: 4,
 label: 'Cérémonie — Henné / Baptême / Mariage',
 price: 'À partir de 25 000 FCFA',
 priceNum: 25000,
 description: 'Look royal garanti · Retouche express disponible en supplément (+5 000 FCFA Icon: Crown,
 },
];
const STEPS = [
 { n: 1, label: 'Prestation' },
 { n: 2, label: 'Date & Heure' },
 { n: 3, label: 'Vos infos' },
 { n: 4, label: 'Paiement' },
];
export default function Booking() {
 const [step, setStep] = useState(1);
 const [selectedService, setSelectedService] = useState(null);
 const [selectedDate, setSelectedDate] = useState(null);
 const [selectedTime, setSelectedTime] = useState(null);
 const [name, setName] = useState('');
 const [phone, setPhone] = useState('');
 const [availability, setAvailability] = useState({});
 const [bookedSlots, setBookedSlots] = useState([]);
 const [currentMonth, setCurrentMonth] = useState(new Date());
 // Payment step state
 const [bookingId, setBookingId] = useState(null);
 const [proofFile, setProofFile] = useState(null);
 const [proofUploading, setProofUploading] = useState(false);
 const [proofSent, setProofSent] = useState(false);
 const [creatingBooking, setCreatingBooking] = useState(false);
 // Calendar grid
 const monthStart = startOfMonth(currentMonth);
 const monthEnd = endOfMonth(currentMonth);
 const calDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
 // Pad to start on Monday
 const startPad = (monthStart.getDay() + 6) % 7; // 0=Mon
 const paddedDays = [
 ...Array(startPad).fill(null),
 ...calDays,
 ];
 useEffect(() => {
 const unsub = onSnapshot(collection(db, 'availability'), (snap) => {
 const map = {};
 snap.docs.forEach(d => {
 if (d.data().slots && d.data().slots.length > 0) {
 map[d.id] = d.data().slots;
 }
 });
 setAvailability(map);
 }, () => {});
 return unsub;
 }, []);
 useEffect(() => {
 if (!selectedDate) { setBookedSlots([]); return; }
 const dateStr = format(selectedDate, 'yyyy-MM-dd');
 const q = query(
 collection(db, 'bookings'),
 where('date', '==', dateStr),
 );
 const unsub = onSnapshot(q, (snap) => {
 setBookedSlots(
 snap.docs
 .filter(d => !['cancelled'].includes(d.data().status))
 .map(d => d.data().time)
 );
 }, () => {});
 return unsub;
 }, [selectedDate]);
 const isDateAvailable = (date) => {
 if (!date) return false;
 if (isBefore(startOfDay(date), startOfDay(new Date()))) return false;
 const dateStr = format(date, 'yyyy-MM-dd');
 return !!availability[dateStr] && availability[dateStr].length > 0;
 };
 const getAvailableSlots = () => {
 if (!selectedDate) return [];
 const dateStr = format(selectedDate, 'yyyy-MM-dd');
 return (availability[dateStr] || []).filter(s => !bookedSlots.includes(s));
 };
 const acompteAmount = () => {
 const s = SERVICES.find(x => x.id === selectedService);
 if (!s) return 0;
 return Math.round(s.priceNum * ACOMPTE_PERCENT / 100);
 };
 const canProceed = () => {
 if (step === 1) return selectedService !== null;
 if (step === 2) return selectedDate !== null && selectedTime !== null;
 if (step === 3) return name.trim().length > 2 && phone.trim().length > 5;
 return false;
 };
 // Step 3 → 4: create booking in Firestore
 const handleCreateBooking = async () => {
 if (!canProceed()) return;
 setCreatingBooking(true);
 try {
 const service = SERVICES.find(s => s.id === selectedService);
 const dateStr = format(selectedDate, 'yyyy-MM-dd');
 const docRef = await addDoc(collection(db, 'bookings'), {
 name: name.trim(),
 phone: phone.trim(),
 service: service.label,
 serviceId: service.id,
 price: service.price,
 priceNum: service.priceNum,
 acompte: acompteAmount(),
 date: dateStr,
 time: selectedTime,
 status: 'pending_payment',
 proofUrl: null,
 createdAt: serverTimestamp(),
 });
 setBookingId(docRef.id);
 setStep(4);
 } catch (err) {
 console.error(err);
 }
 setCreatingBooking(false);
 };
 // Upload proof of payment
 const handleUploadProof = async () => {
 if (!proofFile || !bookingId) return;
 setProofUploading(true);
 try {
 const storageRef = ref(storage, `payment_proofs/${bookingId}_${Date.now()}`);
 await uploadBytes(storageRef, proofFile);
 const url = await getDownloadURL(storageRef);
 await updateDoc(doc(db, 'bookings', bookingId), {
 proofUrl: url,
 status: 'waiting_confirmation',
 proofUploadedAt: serverTimestamp(),
 });
 setProofSent(true);
 } catch (err) {
 console.error(err);
 }
 setProofUploading(false);
 };
 // WhatsApp fallback (if no upload)
 const handleWhatsAppPayment = () => {
 const service = SERVICES.find(s => s.id === selectedService);
 const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
 const msg =
` *MAGICAL HAND BY MAMIFA*
 Preuve de paiement acompte
 Nom : ${name}
 Tel : ${phone}
 Prestation : ${service.label}
 RDV : ${dateStr} à ${selectedTime}
 Acompte payé : ${acompteAmount().toLocaleString()} FCFA (${ACOMPTE_PERCENT}%)
 Réf booking : ${bookingId}
_(preuve de paiement jointe)_`;
 window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank') };
 const openSlots = getAvailableSlots();
 const service = SERVICES.find(s => s.id === selectedService);
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
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.3em', <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(36px, 5vw, 64p Prendre Rendez-Vous
 </h2>
 <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, trans
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '14px', color: '#8A7968', maxWi Choisissez votre prestation, votre date et réglez un acompte pour confirmer votre R </p>
 </motion.div>
 <div style={{ maxWidth: '700px', margin: '0 auto' }}>
 {/* Progress */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin {STEPS.map((s, i) => (
 <React.Fragment key={s.n}>
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', g <div style={{
 width: '32px', height: '32px', borderRadius: '50%',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', fontWeight: 600,
 background: step >= s.n ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'tr color: step >= s.n ? '#0A0A0A' : '#8A7968',
 border: step >= s.n ? 'none' : '1px solid rgba(201,168,76,0.3)',
 transition: 'all 0.4s', flexShrink: 0,
 }}>
 {step > s.n ? <Check size={13} strokeWidth={3} /> : s.n}
 </div>
 <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing {s.label}
 </span>
 </div>
 {i < 3 && (
 <div style={{
 flex: 1, height: '1px',
 background: step > s.n ? 'linear-gradient(90deg, #C9A84C, rgba(201,168,76,0 marginBottom: '24px', maxWidth: '60px', transition: 'all 0.4s',
 }} />
 )}
 </React.Fragment>
 ))}
 </div>
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
 {/* STEP 1 */}
 {step === 1 && (
 <div>
 <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4v <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
 {SERVICES.map((s) => {
 const active = selectedService === s.id;
 const { Icon } = s;
 return (
 <motion.button key={s.id} onClick={() => setSelectedService(s.id)} whileH style={{
 background: active ? 'linear-gradient(135deg, rgba(201,168,76,0.15),  border: active ? '1px solid rgba(201,168,76,0.65)' : '1px solid rgba( borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', width:  }}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
 <div style={{
 width: '40px', height: '40px', borderRadius: '50%',
 background: active ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' :  display: 'flex', alignItems: 'center', justifyContent: 'center', fl }}>
 <Icon size={18} strokeWidth={1.5} color={active ? '#0A0A0A' : '#C9A </div>
 <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', fontW {s.label}
 </div>
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignIt <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15p </div>
 </motion.button>
 );
 })}
 </div>
 </div>
 )}
 {/* STEP 2 — Monthly calendar */}
 {step === 2 && (
 <div>
 <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4v <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968',
 Seules les dates dorées sont disponibles
 </p>
 {/* Month navigation */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-bet <button
 onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
 style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25 >
 <ChevronLeft size={15} color="#C9A84C" />
 </button>
 <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', col {format(currentMonth, 'MMMM yyyy', { locale: fr })}
 </span>
 <button
 onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
 style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25 >
 <ChevronRight size={15} color="#C9A84C" />
 </button>
 </div>
 {/* Day headers */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
 <div key={d} style={{ textAlign: 'center', fontFamily: 'Jost, sans-serif',  ))}
 </div>
 {/* Calendar grid */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px {paddedDays.map((date, idx) => {
 if (!date) return <div key={`pad-${idx}`} />;
 const avail = isDateAvailable(date);
 const sel = selectedDate && isSameDay(date, selectedDate);
 const past = isBefore(startOfDay(date), startOfDay(new Date()));
 const dateStr = format(date, 'yyyy-MM-dd');
 const slotCount = (availability[dateStr] || []).length;
 return (
 <motion.button
 key={date.toISOString()}
 disabled={!avail}
 onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
 whileHover={avail ? { scale: 1.08 } : {}}
 style={{
 aspectRatio: '1',
 display: 'flex', flexDirection: 'column', alignItems: 'center', justi gap: '1px',
 background: sel
 ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
 : avail ? 'rgba(201,168,76,0.08)' : 'transparent',
 border: sel
 ? '1px solid #C9A84C'
 : avail ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparen borderRadius: '6px',
 cursor: avail ? 'pointer' : 'not-allowed',
 opacity: past && !isToday(date) ? 0.2 : 1,
 transition: 'all 0.2s',
 }}
 >
 <span style={{
 fontFamily: 'Cormorant Garamond, serif',
 fontSize: 'clamp(13px, 2.5vw, 17px)',
 color: sel ? '#0A0A0A' : avail ? '#C9A84C' : '#5A5A5A',
 lineHeight: 1,
 }}>{format(date, 'd')}</span>
 {avail && (
 <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '7px', color {slotCount}cr
 </span>
 )}
 </motion.button>
 );
 })}
 </div>
 {/* Time slots */}
 {selectedDate && (
 <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A79 <Clock size={13} color="#C9A84C" />
 {format(selectedDate, 'EEEE d MMMM', { locale: fr })} — Créneaux disponib </p>
 {openSlots.length === 0 ? (
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A Aucun créneau disponible pour cette date.
 </p>
 ) : (
 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
 {openSlots.map((t) => {
 const sel = selectedTime === t;
 return (
 <motion.button key={t} onClick={() => setSelectedTime(t)} whileHove
 style={{
 padding: '9px 14px',
 background: sel ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : border: sel ? '1px solid #C9A84C' : '1px solid rgba(201,168,76, borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize:  color: sel ? '#0A0A0A' : '#FAF6EF',
 cursor: 'pointer', transition: 'all 0.2s',
 }}
 >{t}</motion.button>
 );
 })}
 </div>
 )}
 </motion.div>
 )}
 </div>
 )}
 {/* STEP 3 */}
 {step === 3 && (
 <div>
 <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px, 4v <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
 {[
 { label: 'Votre prénom *', value: name, setter: setName, placeholder: 'Ex:  { label: 'Votre numéro de téléphone *', value: phone, setter: setPhone, pla ].map((field) => (
 <div key={field.label}>
 <label style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterS {field.label}
 </label>
 <input
 type={field.type} value={field.value}
 onChange={e => field.setter(e.target.value)}
 placeholder={field.placeholder}
 style={{ width: '100%', padding: '14px 18px', background: 'rgba(255,255 onFocus={e => e.target.style.borderColor = '#C9A84C'}
 onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
 />
 </div>
 ))}
 {/* Acompte info preview */}
 <div style={{ padding: '16px', background: 'rgba(201,168,76,0.06)', border: ' <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A8 <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', colo {acompteAmount().toLocaleString()} FCFA
 </p>
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A79 {ACOMPTE_PERCENT}% du montant total · à régler via Wave ou Orange Money
 </p>
 </div>
 </div>
 </div>
 )}
 {/* STEP 4 — Payment */}
 {step === 4 && (
 <div>
 {!proofSent ? (
 <>
 <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(22px Paiement de l'acompte
 </h3>
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A79 Votre créneau est réservé temporairement. Réglez l'acompte pour confirmer </p>
 {/* Recap mini */}
 <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border {[
 { label: 'Prestation', value: service?.label },
 { label: 'Date', value: selectedDate ? format(selectedDate, 'EEEE d MMM { label: 'Heure', value: selectedTime },
 ].map(r => (
 <div key={r.label} style={{ display: 'flex', justifyContent: 'space-bet <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', lett <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15 </div>
 ))}
 </div>
 {/* Payment instructions */}
 <div style={{ padding: '20px', background: 'rgba(201,168,76,0.06)', border: <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginB <CreditCard size={18} color="#C9A84C" />
 <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letter Montant à payer
 </span>
 </div>
 <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', co {acompteAmount().toLocaleString()} FCFA
 </p>
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A
 Acompte {ACOMPTE_PERCENT}% — reste à payer le jour du RDV
 </p>
 <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
 {[
 { name: 'Wave', color: '#00C3FF' },
 { name: 'Orange Money', color: '#FF6D00' },
 ].map(m => (
 <div key={m.name} style={{ padding: '10px 16px', background: `${m.col <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', co <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: ' </div>
 ))}
 </div>
 </div>
 {/* Upload proof */}
 <div style={{ marginBottom: '16px' }}>
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpaci Joindre votre preuve de paiement
 </p>
 <label style={{
 display: 'flex', alignItems: 'center', gap: '12px',
 padding: '16px 20px',
 border: proofFile ? '1px solid rgba(201,168,76,0.6)' : '2px dashed rgba borderRadius: '4px', cursor: 'pointer', transition: 'all 0.3s',
 background: proofFile ? 'rgba(201,168,76,0.05)' : 'transparent',
 }}>
 <input type="file" accept="image/*" style={{ display: 'none' }} onChang <Upload size={18} color="#C9A84C" />
 <div>
 <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color {proofFile ? `✓ ${proofFile.name}` : 'Cliquer pour uploader une cap </div>
 <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color JPG, PNG · max 5 Mo
 </div>
 </div>
 </label>
 </div>
 <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
 <motion.button
 onClick={handleUploadProof}
 disabled={!proofFile || proofUploading}
 whileHover={proofFile && !proofUploading ? { scale: 1.03 } : {}}
 style={{
 flex: 1, padding: '16px',
 background: proofFile && !proofUploading ? 'linear-gradient(135deg, # color: proofFile && !proofUploading ? '#0A0A0A' : '#8A7968',
 border: 'none', borderRadius: '2px',
 fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.2 cursor: proofFile && !proofUploading ? 'pointer' : 'not-allowed',
 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: }}
 >
 {proofUploading ? 'Envoi en cours…' : 'Envoyer la preuve'}
 </motion.button>
 <motion.button
 onClick={handleWhatsAppPayment}
 whileHover={{ scale: 1.03 }}
 style={{
 padding: '16px 20px',
 background: 'linear-gradient(135deg, #25D366, #128C7E)',
 color: '#FFFFFF', border: 'none', borderRadius: '2px',
 fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.1 cursor: 'pointer', whiteSpace: 'nowrap',
 }}
 >
 Via WhatsApp
 </motion.button>
 </div>
 <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', <AlertCircle size={14} color="#8A7968" style={{ flexShrink: 0, marginTop: <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A Votre créneau est bloqué pendant 24h. La réservation sera confirmée apr </p>
 </div>
 </>
 ) : (
 /* Confirmation screen */
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scal <div style={{
 width: '72px', height: '72px', borderRadius: '50%',
 background: 'linear-gradient(135deg, #C9A84C, #E8C97A)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 margin: '0 auto 24px',
 }}>
 <CheckCircle2 size={36} color="#0A0A0A" />
 </div>
 <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', col Preuve reçue !
 </h3>
 <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A79 Votre preuve de paiement a été envoyée. L'équipe Magical Hand va valider  </p>
 <div style={{ padding: '16px', background: 'rgba(201,168,76,0.06)', border: <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#C9 <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', co </div>
 </motion.div>
 )}
 </div>
 )}
 {/* Navigation buttons */}
 {step < 4 && (
 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' {step > 1 ? (
 <motion.button
 onClick={() => setStep(step - 1)}
 whileHover={{ x: -4 }}
 style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25 >
 <ChevronLeft size={14} />Retour
 </motion.button>
 ) : <div />}
 {step < 3 && (
 <motion.button
 onClick={() => canProceed() && setStep(step + 1)}
 whileHover={canProceed() ? { scale: 1.04, boxShadow: '0 4px 20px rgba(201,1 style={{
 background: canProceed() ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' :  color: canProceed() ? '#0A0A0A' : '#8A7968',
 border: 'none', padding: '12px 32px', borderRadius: '2px',
 fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.2em', cursor: canProceed() ? 'pointer' : 'not-allowed',
 display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}
 >
 Suivant <ChevronRight size={14} />
 </motion.button>
 )}
 {step === 3 && (
 <motion.button
 onClick={handleCreateBooking}
 disabled={!canProceed() || creatingBooking}
 whileHover={canProceed() ? { scale: 1.04 } : {}}
 style={{
 background: canProceed() ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' :  color: canProceed() ? '#0A0A0A' : '#8A7968',
 border: 'none', padding: '12px 32px', borderRadius: '2px',
 fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.2em', cursor: canProceed() && !creatingBooking ? 'pointer' : 'not-allowed',
 display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}
 >
 {creatingBooking ? 'Création…' : 'Continuer'} <ChevronRight size={14} />
 </motion.button>
 )}
 </div>
 )}
 </motion.div>
 </div>
 <style>{`
 @media (max-width: 768px) { #reserver { padding: 60px 16px !important; } }
 @media (max-width: 480px) { #reserver { padding: 50px 12px !important; } }
 input::placeholder { color: rgba(138,121,104,0.5); }
 * { box-sizing: border-box; }
 `}</style>
 </section>
 );
}