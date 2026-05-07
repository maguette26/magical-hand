import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, storage } from '../firebase.js';
import { signOut } from 'firebase/auth';
import {
 collection, addDoc, deleteDoc, doc, onSnapshot,
 query, orderBy, updateDoc, serverTimestamp, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
const CATEGORIES = ['Glam', 'Cérémonie', 'Naturel'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', 'const TAB_STYLE = (active) => ({
 padding: '12px 24px',
 background: active ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent',
 border: active ? 'none' : '1px solid rgba(201,168,76,0.2)',
 color: active ? '#0A0A0A' : '#8A7968',
 borderRadius: '2px',
 fontFamily: 'Jost, sans-serif',
 fontSize: '11px',
 letterSpacing: '0.15em',
 textTransform: 'uppercase',
 fontWeight: active ? 600 : 400,
 cursor: 'pointer',
 transition: 'all 0.3s',
});
export default function Admin() {
 const [tab, setTab] = useState('disponibilites');
 const [photos, setPhotos] = useState([]);
 // availability: { id, date, slots: ['08:00','10:00',...] }
 const [availability, setAvailability] = useState([]);
 const [bookings, setBookings] = useState([]);
 const [uploading, setUploading] = useState(false);
 const [newPhotoTitle, setNewPhotoTitle] = useState('');
 const [newPhotoCategory, setNewPhotoCategory] = useState('Glam');
 const [selectedFile, setSelectedFile] = useState(null);
 const fileRef = useRef();
 const navigate = useNavigate();
 // Calendar navigation
 const [weekOffset, setWeekOffset] = useState(0);
 const [selectedDay, setSelectedDay] = useState(null); // date object currently editing
 const visibleDays = Array.from({ length: 7 }, (_, i) =>
 addDays(new Date(), weekOffset * 7 + i + 1)
 );
 // ── Firestore listeners ──
 useEffect(() => {
 const unsubPhotos = onSnapshot(
 query(collection(db, 'photos'), orderBy('createdAt', 'desc')),
 snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
 () => {}
 );
 const unsubAvail = onSnapshot(collection(db, 'availability'), snap =>
 setAvailability(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
 () => {}
 );
 const unsubBook = onSnapshot(
 query(collection(db, 'bookings'), orderBy('createdAt', 'desc')),
 snap => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
 () => {}
 );
 return () => { unsubPhotos(); unsubAvail(); unsubBook(); };
 }, []);
 const handleLogout = async () => {
 await signOut(auth);
 navigate('/admin/login');
 };
 // ── Helpers ──
 const getAvailDoc = (date) => {
 const dateStr = format(date, 'yyyy-MM-dd');
 return availability.find(a => a.date === dateStr);
 };
 // Returns slots already booked for a given date string
 const getBookedSlots = (dateStr) =>
 bookings
 .filter(b => b.date === dateStr && b.status !== 'cancelled')
 .map(b => b.time);
 // Does this day have at least one available slot?
 const dayHasSlots = (date) => {
 const doc = getAvailDoc(date);
 return doc && Array.isArray(doc.slots) && doc.slots.length > 0;
 };
 // Toggle a single time slot for a given date
 const toggleSlot = async (date, slot) => {
 const dateStr = format(date, 'yyyy-MM-dd');
 const existing = availability.find(a => a.date === dateStr);
 const booked = getBookedSlots(dateStr);
 if (booked.includes(slot)) {
 toast.error('Ce créneau est déjà réservé par une cliente.');
 return;
 }
 if (existing) {
 const currentSlots = Array.isArray(existing.slots) ? existing.slots : [];
 const newSlots = currentSlots.includes(slot)
 ? currentSlots.filter(s => s !== slot)
 : [...currentSlots, slot].sort();
 if (newSlots.length === 0) {
 // Remove entire doc if no slots left
 await deleteDoc(doc(db, 'availability', existing.id));
 } else {
 await updateDoc(doc(db, 'availability', existing.id), { slots: newSlots });
 }
 } else {
 // Create new availability doc for this date
 await addDoc(collection(db, 'availability'), {
 date: dateStr,
 slots: [slot],
 createdAt: serverTimestamp(),
 });
 }
 };
 // Select all / deselect all slots for a day
 const toggleAllSlots = async (date) => {
 const dateStr = format(date, 'yyyy-MM-dd');
 const existing = availability.find(a => a.date === dateStr);
 const booked = getBookedSlots(dateStr);
 const freeSlots = TIME_SLOTS.filter(s => !booked.includes(s));
 const currentSlots = existing && Array.isArray(existing.slots) ? existing.slots : [];
 const allFreeSelected = freeSlots.every(s => currentSlots.includes(s));
 if (allFreeSelected) {
 // Deselect all free slots, keep only booked ones
 const keepSlots = currentSlots.filter(s => booked.includes(s));
 if (keepSlots.length === 0 && existing) {
 await deleteDoc(doc(db, 'availability', existing.id));
 } else if (existing) {
 await updateDoc(doc(db, 'availability', existing.id), { slots: keepSlots });
 }
 } else {
 // Select all free slots
 const newSlots = [...new Set([...currentSlots, ...freeSlots])].sort();
 if (existing) {
 await updateDoc(doc(db, 'availability', existing.id), { slots: newSlots });
 } else {
 await addDoc(collection(db, 'availability'), {
 date: dateStr,
 slots: newSlots,
 createdAt: serverTimestamp(),
 });
 }
 }
 };
 // ── PHOTOS ──
 const handleUpload = async () => {
 if (!selectedFile || !newPhotoTitle.trim()) {
 toast.error('Ajoute un titre et une photo');
 return;
 }
 setUploading(true);
 try {
 const storageRef = ref(storage, `photos/${Date.now()}_${selectedFile.name}`);
 await uploadBytes(storageRef, selectedFile);
 const url = await getDownloadURL(storageRef);
 await addDoc(collection(db, 'photos'), {
 url,
 title: newPhotoTitle.trim(),
 category: newPhotoCategory,
 storageRef: storageRef.fullPath,
 createdAt: serverTimestamp(),
 });
 toast.success('Photo ajoutée !');
 setNewPhotoTitle('');
 setSelectedFile(null);
 if (fileRef.current) fileRef.current.value = '';
 } catch (err) {
 toast.error('Erreur upload : ' + err.message);
 } finally {
 setUploading(false);
 }
 };
 const handleDeletePhoto = async (photo) => {
 if (!confirm('Supprimer cette photo ?')) return;
 try {
 await deleteDoc(doc(db, 'photos', photo.id));
 if (photo.storageRef) {
 await deleteObject(ref(storage, photo.storageRef)).catch(() => {});
 }
 toast.success('Photo supprimée');
 } catch {
 toast.error('Erreur suppression');
 }
 };
 // ── BOOKINGS ──
 const updateBookingStatus = async (id, status) => {
 await updateDoc(doc(db, 'bookings', id), { status });
 toast.success(`RDV marqué : ${status}`);
 };
 const STATUS_COLOR = {
 pending: '#C9A84C',
 confirmed: '#25D366',
 cancelled: '#E74C3C',
 };
 // Stats: total available slots across all days
 const totalAvailableSlots = availability.reduce((acc, a) =>
 acc + (Array.isArray(a.slots) ? a.slots.length : 0), 0
 );
 return (
 <div style={{ minHeight: '100vh', background: '#0A0A0A' }}>
 {/* ── Header ── */}
 <div style={{
 padding: '20px 40px',
 background: 'rgba(10,10,10,0.95)',
 borderBottom: '1px solid rgba(201,168,76,0.15)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 position: 'sticky',
 top: 0,
 zIndex: 50,
 }}>
 <div>
 <div style={{
 fontFamily: 'Cormorant Garamond, serif',
 fontSize: '22px',
 background: 'linear-gradient(135deg, #C9A84C, #E8C97A)',
 WebkitBackgroundClip: 'text',
 WebkitTextFillColor: 'transparent',
 }}>Magical Hand — Dashboard</div>
 <div style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '10px',
 letterSpacing: '0.2em',
 color: '#8A7968',
 textTransform: 'uppercase',
 }}>Espace de gestion</div>
 </div>
 <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
 <motion.a
 href="/"
 target="_blank"
 whileHover={{ color: '#C9A84C' }}
 style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '11px',
 letterSpacing: '0.15em',
 color: '#8A7968',
 textDecoration: 'none',
 textTransform: 'uppercase',
 }}
 >
 Voir le site →
 </motion.a>
 <motion.button
 onClick={handleLogout}
 whileHover={{ scale: 1.04 }}
 style={{
 padding: '10px 22px',
 background: 'transparent',
 border: '1px solid rgba(201,168,76,0.3)',
 color: '#C9A84C',
 borderRadius: '2px',
 fontFamily: 'Jost, sans-serif',
 fontSize: '11px',
 letterSpacing: '0.15em',
 textTransform: 'uppercase',
 cursor: 'pointer',
 }}
 >
 Déconnexion
 </motion.button>
 </div>
 </div>
 <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
 {/* ── Stats ── */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', ma {[
 { label: 'Photos publiées', value: photos.length, color: '#C9A84C' },
 { label: 'Créneaux disponibles', value: totalAvailableSlots, color: '#E8C97A' },
 { label: 'Réservations', value: bookings.length, color: '#D4956A' },
 ].map((stat) => (
 <div key={stat.label} style={{
 background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
 border: '1px solid rgba(201,168,76,0.12)',
 borderRadius: '4px',
 padding: '28px 32px',
 }}>
 <div style={{
 fontFamily: 'Cormorant Garamond, serif',
 fontSize: '48px',
 color: stat.color,
 lineHeight: 1,
 marginBottom: '8px',
 }}>{stat.value}</div>
 <div style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '11px',
 letterSpacing: '0.15em',
 textTransform: 'uppercase',
 color: '#8A7968',
 }}>{stat.label}</div>
 </div>
 ))}
 </div>
 {/* ── Tabs ── */}
 <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap' }} {[
 { id: 'disponibilites', label: 'Disponibilités' },
 { id: 'photos', label: 'Galerie Photos' },
 { id: 'reservations', label: 'Réservations' },
 ].map((t) => (
 <button key={t.id} onClick={() => setTab(t.id)} style={TAB_STYLE(tab === t.id)}>
 {t.label}
 </button>
 ))}
 </div>
 {/* ════════════ DISPONIBILITÉS ════════════ */}
 {tab === 'disponibilites' && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 <div style={{
 background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
 border: '1px solid rgba(201,168,76,0.12)',
 borderRadius: '4px',
 padding: '36px',
 }}>
 <h2 style={{
 fontFamily: 'Cormorant Garamond, serif',
 fontSize: '28px',
 color: '#FAF6EF',
 marginBottom: '8px',
 }}>Gérer vos disponibilités</h2>
 <p style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '13px',
 color: '#8A7968',
 marginBottom: '32px',
 }}>
 Sélectionnez un jour puis activez les créneaux horaires disponibles.
 Les créneaux déjà réservés (en rouge) ne peuvent pas être désactivés.
 </p>
 {/* ── Week navigation ── */}
 <div style={{
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 marginBottom: '16px',
 }}>
 <button
 onClick={() => { setWeekOffset(Math.max(0, weekOffset - 1)); setSelectedDay disabled={weekOffset === 0}
 style={{
 background: 'transparent',
 border: '1px solid rgba(201,168,76,0.25)',
 borderRadius: '50%',
 width: '36px', height: '36px',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: weekOffset === 0 ? 'not-allowed' : 'pointer',
 opacity: weekOffset === 0 ? 0.3 : 1,
 transition: 'all 0.2s',
 }}
 >
 <ChevronLeft size={16} color="#C9A84C" />
 </button>
 <span style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '11px',
 color: '#8A7968',
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 }}>
 {format(visibleDays[0], 'd MMM', { locale: fr })} — {format(visibleDays[6], </span>
 <button
 onClick={() => { setWeekOffset(Math.min(7, weekOffset + 1)); setSelectedDay disabled={weekOffset >= 7}
 style={{
 background: 'transparent',
 border: '1px solid rgba(201,168,76,0.25)',
 borderRadius: '50%',
 width: '36px', height: '36px',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 cursor: weekOffset >= 7 ? 'not-allowed' : 'pointer',
 opacity: weekOffset >= 7 ? 0.3 : 1,
 transition: 'all 0.2s',
 }}
 >
 <ChevronRight size={16} color="#C9A84C" />
 </button>
 </div>
 {/* ── 7-day strip ── */}
 <div style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(7, 1fr)',
 gap: '8px',
 marginBottom: '28px',
 }}>
 {/* Day labels */}
 {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
 <div key={d} style={{
 textAlign: 'center',
 fontFamily: 'Jost, sans-serif',
 fontSize: '10px',
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 color: '#8A7968',
 padding: '6px 0',
 }}>{d}</div>
 ))}
 {/* Day buttons */}
 {visibleDays.map((date) => {
 const availDoc = getAvailDoc(date);
 const slots = availDoc && Array.isArray(availDoc.slots) ? availDoc.slots :  const bookedCount = getBookedSlots(format(date, 'yyyy-MM-dd')).length;
 const hasSlots = slots.length > 0;
 const isSel = selectedDay && format(date, 'yyyy-MM-dd') === format(selected return (
 <motion.button
 key={date.toISOString()}
 onClick={() => setSelectedDay(isSel ? null : date)}
 whileHover={{ scale: 1.06 }}
 whileTap={{ scale: 0.96 }}
 style={{
 aspectRatio: '1',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'center',
 gap: '3px',
 background: isSel
 ? 'linear-gradient(135deg, rgba(201,168,76,0.35), rgba(232,201,122, : hasSlots
 ? 'rgba(201,168,76,0.08)'
 : 'rgba(255,255,255,0.02)',
 border: isSel
 ? '1px solid #C9A84C'
 : hasSlots
 ? '1px solid rgba(201,168,76,0.4)'
 : '1px solid rgba(255,255,255,0.05)',
 borderRadius: '6px',
 cursor: 'pointer',
 transition: 'all 0.2s',
 position: 'relative',
 overflow: 'visible',
 }}
 >
 <span style={{
 fontFamily: 'Cormorant Garamond, serif',
 fontSize: '20px',
 color: isSel ? '#E8C97A' : hasSlots ? '#C9A84C' : '#FAF6EF',
 lineHeight: 1,
 opacity: hasSlots || isSel ? 1 : 0.4,
 }}>{format(date, 'd')}</span>
 <span style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '7px',
 color: isSel ? '#E8C97A' : '#8A7968',
 textTransform: 'uppercase',
 letterSpacing: '0.05em',
 }}>{format(date, 'MMM', { locale: fr })}</span>
 {/* Slot count badge */}
 {hasSlots && (
 <div style={{
 position: 'absolute',
 top: '-6px',
 right: '-6px',
 background: 'linear-gradient(135deg, #C9A84C, #E8C97A)',
 color: '#0A0A0A',
 borderRadius: '50%',
 width: '18px',
 height: '18px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 fontFamily: 'Jost, sans-serif',
 fontSize: '9px',
 fontWeight: 700,
 }}>
 {slots.length}
 </div>
 )}
 {/* Booked indicator */}
 {bookedCount > 0 && (
 <div style={{
 position: 'absolute',
 bottom: '-6px',
 right: '-6px',
 background: '#E74C3C',
 color: '#FFF',
 borderRadius: '50%',
 width: '16px',
 height: '16px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 fontFamily: 'Jost, sans-serif',
 fontSize: '8px',
 fontWeight: 700,
 }}>
 {bookedCount}
 </div>
 )}
 </motion.button>
 );
 })}
 </div>
 {/* ── Time slot editor ── */}
 <AnimatePresence>
 {selectedDay && (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 8 }}
 transition={{ duration: 0.3 }}
 style={{
 background: 'rgba(255,255,255,0.02)',
 border: '1px solid rgba(201,168,76,0.2)',
 borderRadius: '6px',
 padding: '24px',
 }}
 >
 <div style={{
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 marginBottom: '20px',
 flexWrap: 'wrap',
 gap: '12px',
 }}>
 <div>
 <div style={{
 fontFamily: 'Cormorant Garamond, serif',
 fontSize: '22px',
 color: '#FAF6EF',
 textTransform: 'capitalize',
 }}>
 {format(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}
 </div>
 <div style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '11px',
 color: '#8A7968',
 marginTop: '4px',
 letterSpacing: '0.05em',
 }}>
 Cliquez sur un créneau pour l'activer / désactiver
 </div>
 </div>
 {/* Select all / none button */}
 <motion.button
 onClick={() => toggleAllSlots(selectedDay)}
 whileHover={{ scale: 1.04 }}
 style={{
 padding: '8px 18px',
 background: 'transparent',
 border: '1px solid rgba(201,168,76,0.35)',
 color: '#C9A84C',
 borderRadius: '2px',
 fontFamily: 'Jost, sans-serif',
 fontSize: '10px',
 letterSpacing: '0.15em',
 textTransform: 'uppercase',
 cursor: 'pointer',
 transition: 'all 0.2s',
 whiteSpace: 'nowrap',
 }}
 >
 {(() => {
 const dateStr = format(selectedDay, 'yyyy-MM-dd');
 const availDoc = getAvailDoc(selectedDay);
 const currentSlots = availDoc && Array.isArray(availDoc.slots) ? av const booked = getBookedSlots(dateStr);
 const freeSlots = TIME_SLOTS.filter(s => !booked.includes(s));
 const allSelected = freeSlots.every(s => currentSlots.includes(s));
 return allSelected ? 'Tout désélectionner' : 'Tout sélectionner';
 })()}
 </motion.button>
 </div>
 {/* Slots grid */}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
 {TIME_SLOTS.map((slot) => {
 const dateStr = format(selectedDay, 'yyyy-MM-dd');
 const availDoc = getAvailDoc(selectedDay);
 const currentSlots = availDoc && Array.isArray(availDoc.slots) ? avai
 const booked = getBookedSlots(dateStr);
 const isBooked = booked.includes(slot);
 const isActive = currentSlots.includes(slot);
 return (
 <motion.button
 key={slot}
 onClick={() => !isBooked && toggleSlot(selectedDay, slot)}
 whileHover={!isBooked ? { scale: 1.06 } : {}}
 whileTap={!isBooked ? { scale: 0.95 } : {}}
 style={{
 padding: '12px 20px',
 background: isBooked
 ? 'rgba(231,76,60,0.12)'
 : isActive
 ? 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(232, : 'rgba(255,255,255,0.03)',
 border: isBooked
 ? '1px solid rgba(231,76,60,0.5)'
 : isActive
 ? '1px solid rgba(201,168,76,0.7)'
 : '1px solid rgba(255,255,255,0.08)',
 borderRadius: '4px',
 fontFamily: 'Jost, sans-serif',
 fontSize: '14px',
 letterSpacing: '0.05em',
 color: isBooked
 ? '#E74C3C'
 : isActive
 ? '#E8C97A'
 : '#8A7968',
 cursor: isBooked ? 'not-allowed' : 'pointer',
 transition: 'all 0.2s',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 gap: '4px',
 minWidth: '80px',
 }}
 >
 <span>{slot}</span>
 <span style={{
 fontSize: '8px',
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 opacity: 0.8,
 }}>
 {isBooked ? 'Réservé' : isActive ? 'Dispo' : 'Fermé'}
 </span>
 </motion.button>
 );
 })}
 </div>
 {/* Legend */}
 <div style={{ marginTop: '20px', display: 'flex', gap: '24px', flexWrap:  {[
 { color: 'rgba(201,168,76,0.7)', bg: 'rgba(201,168,76,0.25)', label:  { color: 'rgba(255,255,255,0.08)', bg: 'rgba(255,255,255,0.03)', labe { color: 'rgba(231,76,60,0.5)', bg: 'rgba(231,76,60,0.12)', label: 'D ].map(item => (
 <div key={item.label} style={{ display: 'flex', gap: '8px', alignItem <div style={{
 width: '28px', height: '16px',
 background: item.bg,
 border: `1px solid ${item.color}`,
 borderRadius: '3px',
 }} />
 <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', co {item.label}
 </span>
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 {!selectedDay && (
 <div style={{
 textAlign: 'center',
 padding: '30px',
 color: '#8A7968',
 fontFamily: 'Jost, sans-serif',
 fontSize: '12px',
 letterSpacing: '0.1em',
 border: '1px dashed rgba(201,168,76,0.15)',
 borderRadius: '6px',
 }}>
 ↑ Sélectionnez un jour pour gérer ses créneaux horaires
 </div>
 )}
 </div>
 </motion.div>
 )}
 {/* ════════════ PHOTOS ════════════ */}
 {tab === 'photos' && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 <div style={{
 background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
 border: '1px solid rgba(201,168,76,0.12)',
 borderRadius: '4px',
 padding: '32px',
 marginBottom: '24px',
 }}>
 <h2 style={{
 fontFamily: 'Cormorant Garamond, serif',
 fontSize: '24px',
 color: '#FAF6EF',
 marginBottom: '24px',
 }}>Ajouter une photo</h2>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px' <div>
 <label style={labelStyle}>Titre</label>
 <input
 type="text"
 value={newPhotoTitle}
 onChange={e => setNewPhotoTitle(e.target.value)}
 placeholder="Ex: Look Mariage"
 style={inputStyle}
 onFocus={e => e.target.style.borderColor = '#C9A84C'}
 onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
 />
 </div>
 <div>
 <label style={labelStyle}>Catégorie</label>
 <select
 value={newPhotoCategory}
 onChange={e => setNewPhotoCategory(e.target.value)}
 style={{ ...inputStyle, cursor: 'pointer' }}
 >
 {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1A1 </select>
 </div>
 <div />
 </div>
 <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'cen <div
 style={{
 border: '2px dashed rgba(201,168,76,0.25)',
 borderRadius: '4px',
 padding: '20px 30px',
 cursor: 'pointer',
 transition: 'all 0.3s',
 textAlign: 'center',
 }}
 onClick={() => fileRef.current?.click()}
 onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6 onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2 >
 <input
 ref={fileRef}
 type="file"
 accept="image/*"
 style={{ display: 'none' }}
 onChange={e => setSelectedFile(e.target.files[0])}
 />
 <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A {selectedFile ? (
 <span style={{ color: '#C9A84C' }}>✓ {selectedFile.name}</span>
 ) : (
 <>Cliquer pour choisir une photo</>
 )}
 </div>
 </div>
 <motion.button
 onClick={handleUpload}
 disabled={uploading}
 whileHover={!uploading ? { scale: 1.04 } : {}}
 style={{
 padding: '14px 32px',
 background: uploading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135de color: uploading ? '#8A7968' : '#0A0A0A',
 border: 'none',
 borderRadius: '2px',
 fontFamily: 'Jost, sans-serif',
 fontSize: '12px',
 letterSpacing: '0.15em',
 textTransform: 'uppercase',
 fontWeight: 600,
 cursor: uploading ? 'not-allowed' : 'pointer',
 transition: 'all 0.3s',
 whiteSpace: 'nowrap',
 }}
 >
 {uploading ? 'Upload...' : 'Publier'}
 </motion.button>
 </div>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220 <AnimatePresence>
 {photos.map((photo) => (
 <motion.div
 key={photo.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 style={{
 background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
 border: '1px solid rgba(201,168,76,0.1)',
 borderRadius: '4px',
 overflow: 'hidden',
 }}
 >
 <div style={{ position: 'relative', aspectRatio: '3/4' }}>
 <img
 src={photo.url}
 alt={photo.title}
 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
 />
 <button
 onClick={() => handleDeletePhoto(photo)}
 style={{
 position: 'absolute',
 top: '8px',
 right: '8px',
 background: 'rgba(231,76,60,0.85)',
 color: '#FFF',
 border: 'none',
 borderRadius: '50%',
 width: '30px',
 height: '30px',
 cursor: 'pointer',
 fontSize: '14px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 }}
 >×</button>
 </div>
 <div style={{ padding: '14px' }}>
 <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px' {photo.title}
 </div>
 <div style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '10px',
 color: '#C9A84C',
 letterSpacing: '0.15em',
 textTransform: 'uppercase',
 marginTop: '4px',
 }}>{photo.category}</div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 {photos.length === 0 && (
 <div style={{ textAlign: 'center', padding: '60px', color: '#8A7968', fontFamil Aucune photo publiée. Ajoutez votre première photo ci-dessus.
 </div>
 )}
 </motion.div>
 )}
 {/* ════════════ RÉSERVATIONS ════════════ */}
 {tab === 'reservations' && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 <div style={{
 background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
 border: '1px solid rgba(201,168,76,0.12)',
 borderRadius: '4px',
 padding: '32px',
 }}>
 <h2 style={{
 fontFamily: 'Cormorant Garamond, serif',
 fontSize: '28px',
 color: '#FAF6EF',
 marginBottom: '8px',
 }}>Réservations</h2>
 <p style={{
 fontFamily: 'Jost, sans-serif',
 fontSize: '13px',
 color: '#8A7968',
 marginBottom: '28px',
 }}>
 Les RDV confirmés bloquent automatiquement leur créneau dans le calendrier.
 </p>
 {bookings.length === 0 ? (
 <div style={{ textAlign: 'center', padding: '60px', color: '#8A7968', fontFam Aucune réservation pour le moment.
 </div>
 ) : (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
 {bookings.map((b) => (
 <div key={b.id} style={{
 display: 'grid',
 gridTemplateColumns: '1fr 1fr 1fr auto',
 gap: '16px',
 alignItems: 'center',
 padding: '20px 24px',
 background: 'rgba(255,255,255,0.02)',
 border: '1px solid rgba(201,168,76,0.08)',
 borderRadius: '4px',
 }}>
 <div>
 <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20p {b.name}
 </div>
 <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color {b.phone}
 </div>
 </div>
 <div>
 <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color {b.service}
 </div>
 <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color {b.date} à {b.time}
 </div>
 </div>
 <div>
 <span style={{
 padding: '4px 12px',
 background: `${STATUS_COLOR[b.status || 'pending']}22`,
 border: `1px solid ${STATUS_COLOR[b.status || 'pending']}44`,
 color: STATUS_COLOR[b.status || 'pending'],
 borderRadius: '2px',
 fontFamily: 'Jost, sans-serif',
 fontSize: '10px',
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 }}>
 {b.status || 'En attente'}
 </span>
 </div>
 <div style={{ display: 'flex', gap: '8px' }}>
 <button
 onClick={() => updateBookingStatus(b.id, 'confirmed')}
 style={{
 padding: '6px 12px',
 background: 'rgba(37,211,102,0.1)',
 border: '1px solid rgba(37,211,102,0.3)',
 color: '#25D366',
 borderRadius: '2px',
 fontFamily: 'Jost, sans-serif',
 fontSize: '10px',
 cursor: 'pointer',
 letterSpacing: '0.1em',
 }}
 >✓</button>
 <button
 onClick={() => updateBookingStatus(b.id, 'cancelled')}
 style={{
 padding: '6px 12px',
 background: 'rgba(231,76,60,0.1)',
 border: '1px solid rgba(231,76,60,0.3)',
 color: '#E74C3C',
 borderRadius: '2px',
 fontFamily: 'Jost, sans-serif',
 fontSize: '10px',
 cursor: 'pointer',
 }}
 >✕</button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </motion.div>
 )}
 </div>
 <style>{`
 @media (max-width: 768px) {
 .admin-header { padding: 16px 20px !important; }
 }
 `}</style>
 </div>
 );
}
const labelStyle = {
 fontFamily: 'Jost, sans-serif',
 fontSize: '11px',
 letterSpacing: '0.15em',
 textTransform: 'uppercase',
 color: '#8A7968',
 display: 'block',
 marginBottom: '8px',
};
const inputStyle = {
 width: '100%',
 padding: '12px 16px',
 background: 'rgba(255,255,255,0.03)',
 border: '1px solid rgba(201,168,76,0.25)',
 borderRadius: '2px',
 color: '#FAF6EF',
 fontFamily: 'Jost, sans-serif',
 fontSize: '14px',
 outline: 'none',
 boxSizing: 'border-box',
 transition: 'border 0.3s',
};