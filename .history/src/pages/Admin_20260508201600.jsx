import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, storage } from '../firebase.js';
import { signOut } from 'firebase/auth';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, updateDoc, serverTimestamp, setDoc, getDoc, where
} from 'firebase/firestore';
import { uploadImage } from "../utils/uploadImage";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, X, Calendar, Edit3, Check, AlertTriangle, Image, Eye } from 'lucide-react';

const CATEGORIES = ['Glam', 'Cérémonie', 'Naturel'];
const ALL_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const TAB_STYLE = (active) => ({
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

const STATUS_COLOR = {
  pending_payment: '#C9A84C',
  waiting_confirmation: '#E8A44C',
  confirmed: '#25D366',
  cancelled: '#E74C3C',
};

const STATUS_LABEL = {
  pending_payment: 'En attente paiement',
  waiting_confirmation: 'Preuve envoyée',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
};

export default function Admin() {
  const [tab, setTab] = useState('disponibilites');
  const [photos, setPhotos] = useState([]);
  const [availability, setAvailability] = useState({});
  const [bookings, setBookings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState('Glam');
  const [selectedFile, setSelectedFile] = useState(null);

  // Calendar
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calView, setCalView] = useState('month'); // 'month' | 'week'
  const [editingDate, setEditingDate] = useState(null);
  const [calOffset, setCalOffset] = useState(0);

  // Slot reassign modal
  const [reassignModal, setReassignModal] = useState(null); // { booking, currentDate, currentTime }
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('');

  // Proof viewer
  const [proofViewer, setProofViewer] = useState(null);

  const [editingPhoto, setEditingPhoto] = useState(null);
  const fileRef = useRef();
  const navigate = useNavigate();

  const visibleWeek = Array.from({ length: 7 }, (_, i) => addDays(new Date(), calOffset * 7 + i + 1));

  // Calendar month grid
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  useEffect(() => {
    const unsubPhotos = onSnapshot(
      query(collection(db, 'photos'), orderBy('createdAt', 'desc')),
      snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.createdAt !== null)),
      () => {}
    );
    const unsubAvail = onSnapshot(collection(db, 'availability'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setAvailability(map);
    }, () => {});
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

  // ---- HELPERS ----
  const getSlotsForDate = (dateStr) => availability[dateStr]?.slots || [];
  const getBookedSlotsForDate = (dateStr) =>
    bookings.filter(b => b.date === dateStr && !['cancelled'].includes(b.status)).map(b => b.time);

  // ---- AVAILABILITY ----
  const toggleSlot = async (dateStr, slot) => {
    const current = getSlotsForDate(dateStr);
    const booked = getBookedSlotsForDate(dateStr);
    if (booked.includes(slot)) { toast.error('Ce créneau est réservé — libérez-le d\'abord.'); return; }
    let updated = current.includes(slot) ? current.filter(s => s !== slot) : [...current, slot].sort();
    if (updated.length === 0) {
      await deleteDoc(doc(db, 'availability', dateStr)).catch(() => {});
    } else {
      await setDoc(doc(db, 'availability', dateStr), { slots: updated, updatedAt: serverTimestamp() });
    }
  };

  const toggleAllSlots = async (dateStr) => {
    const current = getSlotsForDate(dateStr);
    if (current.length === ALL_SLOTS.length) {
      await deleteDoc(doc(db, 'availability', dateStr)).catch(() => {});
    } else {
      await setDoc(doc(db, 'availability', dateStr), { slots: [...ALL_SLOTS], updatedAt: serverTimestamp() });
    }
  };

  // Release a specific slot back to available (remove booking, keep slot open)
  const releaseSlot = async (booking) => {
    if (!confirm(`Libérer le créneau ${booking.time} du ${booking.date} ?`)) return;
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' });
    toast.success('Créneau libéré');
  };

  // Reassign booking to a new date/time
  const handleReassign = async () => {
    if (!newSlotDate || !newSlotTime) { toast.error('Choisissez une date et une heure'); return; }
    const { booking } = reassignModal;
    // Check new slot is available
    const newSlots = getSlotsForDate(newSlotDate);
    if (!newSlots.includes(newSlotTime)) { toast.error('Ce créneau n\'est pas ouvert dans les disponibilités'); return; }
    const alreadyBooked = getBookedSlotsForDate(newSlotDate).filter(t => t !== booking.time || booking.date !== newSlotDate);
    if (alreadyBooked.includes(newSlotTime)) { toast.error('Ce créneau est déjà réservé'); return; }

    await updateDoc(doc(db, 'bookings', booking.id), {
      date: newSlotDate,
      time: newSlotTime,
      rescheduledAt: serverTimestamp(),
    });
    toast.success('Rendez-vous déplacé !');
    setReassignModal(null);
    setNewSlotDate('');
    setNewSlotTime('');
  };

  // ---- BOOKINGS ----
  const updateBookingStatus = async (id, status) => {
    await updateDoc(doc(db, 'bookings', id), { status, updatedAt: serverTimestamp() });
    toast.success(`RDV : ${STATUS_LABEL[status]}`);
  };

  // ---- PHOTOS ----
  const handleUpload = async () => {
    if (!selectedFile || !newPhotoTitle.trim()) { toast.error("Ajoute un titre et une photo"); return; }
    setUploading(true);
    try {
      const url = await uploadImage(selectedFile);
      await addDoc(collection(db, "photos"), { url, title: newPhotoTitle.trim(), category: newPhotoCategory, createdAt: serverTimestamp() });
      toast.success("Photo ajoutée !");
      setNewPhotoTitle(""); setSelectedFile(null);
    } catch { toast.error("Erreur upload"); }
    setUploading(false);
  };

  const handleDeletePhoto = async (photo) => {
    if (!confirm('Supprimer cette photo ?')) return;
    try { await deleteDoc(doc(db, 'photos', photo.id)); toast.success('Photo supprimée'); }
    catch { toast.error('Erreur suppression'); }
  };

  const handleUpdatePhoto = async () => {
    if (!editingPhoto?.title?.trim()) { toast.error("Le titre ne peut pas être vide"); return; }
    try {
      await updateDoc(doc(db, 'photos', editingPhoto.id), { title: editingPhoto.title.trim(), category: editingPhoto.category });
      toast.success("Photo mise à jour !"); setEditingPhoto(null);
    } catch { toast.error("Erreur mise à jour"); }
  };

  const totalAvailableSlots = Object.values(availability).reduce((acc, d) => acc + (d.slots?.length || 0), 0);
  const totalAvailableDays = Object.keys(availability).length;
  const pendingProofs = bookings.filter(b => b.status === 'waiting_confirmation').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ padding: '20px 40px', background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Magical Hand — Dashboard</div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.2em', color: '#8A7968', textTransform: 'uppercase' }}>Espace de gestion</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <motion.a href="/" target="_blank" whileHover={{ color: '#C9A84C' }} style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', color: '#8A7968', textDecoration: 'none', textTransform: 'uppercase' }}>Voir le site →</motion.a>
          <motion.button onClick={handleLogout} whileHover={{ scale: 1.04 }} style={{ padding: '10px 22px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Déconnexion</motion.button>
        </div>
      </div>

      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[
            { label: 'Photos publiées', value: photos.length, color: '#C9A84C' },
            { label: 'Créneaux ouverts', value: totalAvailableSlots, sub: `${totalAvailableDays} jour${totalAvailableDays > 1 ? 's' : ''}`, color: '#E8C97A' },
            { label: 'Réservations', value: bookings.length, color: '#D4956A' },
            { label: 'Preuves à valider', value: pendingProofs, color: pendingProofs > 0 ? '#E8A44C' : '#8A7968', alert: pendingProofs > 0 },
          ].map((stat) => (
            <div key={stat.label} style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: stat.alert ? '1px solid rgba(232,164,76,0.4)' : '1px solid rgba(201,168,76,0.12)', borderRadius: '4px', padding: '28px 32px', position: 'relative', overflow: 'hidden' }}>
              {stat.alert && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #E8A44C, #C9A84C)' }} />}
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '48px', color: stat.color, lineHeight: 1, marginBottom: '4px' }}>{stat.value}</div>
              {stat.sub && <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: stat.color, opacity: 0.6, marginBottom: '4px' }}>{stat.sub}</div>}
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A7968' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { id: 'disponibilites', label: 'Disponibilités' },
            { id: 'photos', label: 'Galerie Photos' },
            { id: 'reservations', label: `Réservations${pendingProofs > 0 ? ` (${pendingProofs} 🔔)` : ''}` },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={TAB_STYLE(tab === t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ===== DISPONIBILITÉS ===== */}
        {tab === 'disponibilites' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '4px', padding: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#FAF6EF', margin: 0 }}>Gérer vos disponibilités</h2>
                {/* View toggle */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ id: 'month', label: 'Mois' }, { id: 'week', label: 'Semaine' }].map(v => (
                    <button key={v.id} onClick={() => setCalView(v.id)} style={{ padding: '8px 16px', background: calView === v.id ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent', border: calView === v.id ? 'none' : '1px solid rgba(201,168,76,0.2)', color: calView === v.id ? '#0A0A0A' : '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', marginBottom: '28px' }}>
                Cliquez sur un jour pour ouvrir/fermer des créneaux. Les créneaux dorés sont disponibles à la réservation.
              </p>

              {/* ── MONTH VIEW ── */}
              {calView === 'month' && (
                <>
                  {/* Month navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ChevronLeft size={15} color="#C9A84C" />
                    </button>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', textTransform: 'capitalize' }}>
                      {format(calendarDate, 'MMMM yyyy', { locale: fr })}
                    </span>
                    <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ChevronRight size={15} color="#C9A84C" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                      <div key={d} style={{ textAlign: 'center', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A7968', padding: '8px' }}>{d}</div>
                    ))}
                  </div>

                  {/* Month grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '24px' }}>
                    {calendarDays.map((date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const slots = getSlotsForDate(dateStr);
                      const booked = getBookedSlotsForDate(dateStr);
                      const isEditing = editingDate === dateStr;
                      const hasSlots = slots.length > 0;
                      const inMonth = isSameMonth(date, calendarDate);
                      const isToday = isSameDay(date, new Date());
                      const freeSlots = slots.filter(s => !booked.includes(s)).length;
                      const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');

                      return (
                        <motion.button key={dateStr} onClick={() => setEditingDate(isEditing ? null : dateStr)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} style={{
                          minHeight: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                          padding: '8px 4px',
                          background: isEditing ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(232,201,122,0.18))' : hasSlots ? 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(232,201,122,0.06))' : 'rgba(255,255,255,0.02)',
                          border: isEditing ? '1px solid rgba(201,168,76,0.9)' : isToday ? '1px solid rgba(201,168,76,0.4)' : hasSlots ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', opacity: inMonth ? 1 : 0.3, gap: '2px',
                        }}>
                          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: hasSlots ? '#C9A84C' : '#FAF6EF', lineHeight: 1, opacity: hasSlots ? 1 : inMonth ? 0.6 : 0.2 }}>{format(date, 'd')}</span>
                          {hasSlots && (
                            <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '8px', color: '#E8C97A', opacity: 0.8 }}>
                              {freeSlots}/{slots.length}
                            </span>
                          )}
                          {dayBookings.length > 0 && (
                            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2px' }}>
                              {dayBookings.slice(0, 3).map(b => (
                                <div key={b.id} style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLOR[b.status] || '#C9A84C' }} />
                              ))}
                              {dayBookings.length > 3 && <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '7px', color: '#8A7968' }}>+{dayBookings.length - 3}</span>}
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── WEEK VIEW ── */}
              {calView === 'week' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <button onClick={() => setCalOffset(Math.max(0, calOffset - 1))} disabled={calOffset === 0} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: calOffset === 0 ? 'not-allowed' : 'pointer', opacity: calOffset === 0 ? 0.3 : 1 }}>
                      <ChevronLeft size={15} color="#C9A84C" />
                    </button>
                    <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {format(visibleWeek[0], 'd MMM', { locale: fr })} — {format(visibleWeek[6], 'd MMM yyyy', { locale: fr })}
                    </span>
                    <button onClick={() => setCalOffset(Math.min(3, calOffset + 1))} disabled={calOffset >= 3} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: calOffset >= 3 ? 'not-allowed' : 'pointer', opacity: calOffset >= 3 ? 0.3 : 1 }}>
                      <ChevronRight size={15} color="#C9A84C" />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                      <div key={d} style={{ textAlign: 'center', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A7968', padding: '8px' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '24px' }}>
                    {visibleWeek.map((date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const slots = getSlotsForDate(dateStr);
                      const booked = getBookedSlotsForDate(dateStr);
                      const isEditing = editingDate === dateStr;
                      const hasSlots = slots.length > 0;
                      return (
                        <motion.button key={dateStr} onClick={() => setEditingDate(isEditing ? null : dateStr)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isEditing ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(232,201,122,0.18))' : hasSlots ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,122,0.08))' : 'rgba(255,255,255,0.02)', border: isEditing ? '1px solid rgba(201,168,76,0.9)' : hasSlots ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', gap: '2px' }}>
                          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: hasSlots ? '#C9A84C' : '#FAF6EF', lineHeight: 1, opacity: hasSlots ? 1 : 0.4 }}>{format(date, 'd')}</span>
                          <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '8px', color: hasSlots ? '#E8C97A' : '#8A7968', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{format(date, 'MMM', { locale: fr })}</span>
                          {hasSlots && <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '8px', color: '#C9A84C', opacity: 0.8 }}>{slots.length - booked.filter(b => slots.includes(b)).length}/{slots.length}</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Slot editor panel */}
              <AnimatePresence>
                {editingDate && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', padding: '24px 28px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={15} color="#C9A84C" />
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#FAF6EF' }}>
                          {format(new Date(editingDate + 'T12:00:00'), 'EEEE d MMMM', { locale: fr })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button onClick={() => toggleAllSlots(editingDate)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                          {getSlotsForDate(editingDate).length === ALL_SLOTS.length ? 'Tout désactiver' : 'Tout activer'}
                        </button>
                        <button onClick={() => setEditingDate(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                          <X size={16} color="#8A7968" />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {ALL_SLOTS.map((slot) => {
                        const isActive = getSlotsForDate(editingDate).includes(slot);
                        const isBooked = getBookedSlotsForDate(editingDate).includes(slot);
                        const bookingForSlot = bookings.find(b => b.date === editingDate && b.time === slot && b.status !== 'cancelled');
                        return (
                          <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            <motion.button onClick={() => !isBooked && toggleSlot(editingDate, slot)} whileHover={!isBooked ? { scale: 1.08 } : {}} whileTap={!isBooked ? { scale: 0.95 } : {}} disabled={isBooked} style={{ padding: '10px 18px', background: isBooked ? 'rgba(231,76,60,0.1)' : isActive ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.03)', border: isBooked ? '1px solid rgba(231,76,60,0.35)' : isActive ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '13px', color: isBooked ? '#E74C3C' : isActive ? '#0A0A0A' : '#8A7968', cursor: isBooked ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontWeight: isActive ? 600 : 400, opacity: isBooked ? 0.8 : 1 }}>
                              {slot}
                              {isBooked && <span style={{ marginLeft: '6px', fontSize: '9px', letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.8 }}>réservé</span>}
                            </motion.button>
                            {/* Actions for booked slot */}
                            {isBooked && bookingForSlot && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => releaseSlot(bookingForSlot)} title="Libérer ce créneau" style={{ padding: '3px 6px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '2px', color: '#E74C3C', fontSize: '9px', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}>
                                  Libérer
                                </button>
                                <button onClick={() => setReassignModal({ booking: bookingForSlot, currentDate: editingDate, currentTime: slot })} title="Déplacer ce RDV" style={{ padding: '3px 6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '2px', color: '#C9A84C', fontSize: '9px', cursor: 'pointer', fontFamily: 'Jost, sans-serif' }}>
                                  Déplacer
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', marginTop: '16px', opacity: 0.7 }}>
                      Les créneaux en rouge sont réservés. Utilisez "Libérer" pour annuler ou "Déplacer" pour changer l'heure du RDV.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                  { color: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.35)', label: 'Jour avec créneaux' },
                  { color: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.05)', label: 'Jour fermé' },
                  { color: 'linear-gradient(135deg, #C9A84C, #E8C97A)', border: '#C9A84C', label: 'Créneau ouvert' },
                  { color: 'rgba(231,76,60,0.1)', border: 'rgba(231,76,60,0.35)', label: 'Créneau réservé' },
                ].map(({ color, border, label }) => (
                  <div key={label} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '16px', height: '16px', background: color, border: `1px solid ${border}`, borderRadius: '3px' }} />
                    <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== PHOTOS ===== */}
        {tab === 'photos' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '4px', padding: '32px', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#FAF6EF', marginBottom: '24px' }}>Ajouter une photo</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Titre</label>
                  <input type="text" value={newPhotoTitle} onChange={e => setNewPhotoTitle(e.target.value)} placeholder="Ex: Look Mariage" style={inputStyle} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
                </div>
                <div>
                  <label style={labelStyle}>Catégorie</label>
                  <select value={newPhotoCategory} onChange={e => setNewPhotoCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1A1714' }}>{c}</option>)}
                  </select>
                </div>
                <div />
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ border: '2px dashed rgba(201,168,76,0.25)', borderRadius: '4px', padding: '20px 30px', cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center' }} onClick={() => fileRef.current?.click()} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                  <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968' }}>
                    {selectedFile ? <span style={{ color: '#C9A84C' }}>✓ {selectedFile.name}</span> : <>Cliquer pour choisir une photo</>}
                  </div>
                </div>
                <motion.button onClick={handleUpload} disabled={uploading} whileHover={!uploading ? { scale: 1.04 } : {}} style={{ padding: '14px 32px', background: uploading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: uploading ? '#8A7968' : '#0A0A0A', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.3s', whiteSpace: 'nowrap' }}>
                  {uploading ? 'Upload...' : 'Publier'}
                </motion.button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              <AnimatePresence>
                {photos.map((photo) => (
                  <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: editingPhoto?.id === photo.id ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(201,168,76,0.1)', borderRadius: '4px', overflow: 'hidden', transition: 'border 0.2s' }}>
                    <div style={{ position: 'relative', aspectRatio: '3/4' }}>
                      <img src={photo.url} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                        <button onClick={() => setEditingPhoto(editingPhoto?.id === photo.id ? null : { id: photo.id, title: photo.title, category: photo.category })} style={{ background: editingPhoto?.id === photo.id ? 'rgba(201,168,76,0.85)' : 'rgba(20,20,20,0.75)', color: editingPhoto?.id === photo.id ? '#0A0A0A' : '#C9A84C', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
                        <button onClick={() => handleDeletePhoto(photo)} style={{ background: 'rgba(231,76,60,0.85)', color: '#FFF', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    </div>
                    <div style={{ padding: '14px' }}>
                      {editingPhoto?.id === photo.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <input type="text" value={editingPhoto.title} onChange={e => setEditingPhoto({ ...editingPhoto, title: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} placeholder="Titre" autoFocus />
                          <select value={editingPhoto.category} onChange={e => setEditingPhoto({ ...editingPhoto, category: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px', cursor: 'pointer' }}>
                            {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1A1714' }}>{c}</option>)}
                          </select>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleUpdatePhoto} style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0A0A0A', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
                            <button onClick={() => setEditingPhoto(null)} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', cursor: 'pointer' }}>Annuler</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: '#FAF6EF' }}>{photo.title}</div>
                          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '4px' }}>{photo.category}</div>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {photos.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: '#8A7968', fontFamily: 'Jost, sans-serif' }}>Aucune photo publiée.</div>}
          </motion.div>
        )}

        {/* ===== RÉSERVATIONS ===== */}
        {tab === 'reservations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '4px', padding: '32px' }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#FAF6EF', marginBottom: '8px' }}>Réservations</h2>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#8A7968', marginBottom: '28px' }}>
                Les réservations apparaissent automatiquement en temps réel.
              </p>

              {/* Status filter */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[null, 'pending_payment', 'waiting_confirmation', 'confirmed', 'cancelled'].map(s => (
                  <button key={s || 'all'} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {s ? STATUS_LABEL[s] : 'Tous'}
                  </button>
                ))}
              </div>

              {bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#8A7968', fontFamily: 'Jost, sans-serif' }}>Aucune réservation pour le moment.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bookings.map((b) => (
                    <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '20px 24px', background: b.status === 'waiting_confirmation' ? 'rgba(232,164,76,0.04)' : 'rgba(255,255,255,0.02)', border: b.status === 'waiting_confirmation' ? '1px solid rgba(232,164,76,0.25)' : '1px solid rgba(201,168,76,0.08)', borderRadius: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#FAF6EF' }}>{b.name}</div>
                          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968' }}>{b.phone}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF' }}>{b.service}</div>
                          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C' }}>{b.date} à {b.time}</div>
                          {b.acompte && <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', marginTop: '2px' }}>Acompte: {b.acompte?.toLocaleString()} FCFA</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ padding: '4px 12px', background: `${STATUS_COLOR[b.status || 'pending_payment']}22`, border: `1px solid ${STATUS_COLOR[b.status || 'pending_payment']}44`, color: STATUS_COLOR[b.status || 'pending_payment'], borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-block' }}>
                            {STATUS_LABEL[b.status] || 'En attente'}
                          </span>
                          {/* Proof button */}
                          {b.proofUrl && (
                            <button onClick={() => setProofViewer(b.proofUrl)} style={{ padding: '4px 12px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.08em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                              <Eye size={11} /> Voir preuve
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                          {b.status === 'waiting_confirmation' && (
                            <>
                              <button onClick={() => updateBookingStatus(b.id, 'confirmed')} style={{ padding: '8px 14px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>✓ Confirmer</button>
                              <button onClick={() => updateBookingStatus(b.id, 'cancelled')} style={{ padding: '8px 14px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', color: '#E74C3C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer' }}>✕ Refuser</button>
                            </>
                          )}
                          {b.status === 'confirmed' && (
                            <button onClick={() => setReassignModal({ booking: b, currentDate: b.date, currentTime: b.time })} style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              Déplacer
                            </button>
                          )}
                          {['pending_payment', 'confirmed'].includes(b.status) && b.status !== 'cancelled' && (
                            <button onClick={() => updateBookingStatus(b.id, 'cancelled')} style={{ padding: '8px 14px', background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', color: '#E74C3C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', cursor: 'pointer', opacity: 0.7 }}>Annuler</button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Proof viewer modal ── */}
      <AnimatePresence>
        {proofViewer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProofViewer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '500px', width: '100%', background: '#111', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Preuve de paiement</span>
                <button onClick={() => setProofViewer(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}><X size={16} color="#8A7968" /></button>
              </div>
              <img src={proofViewer} alt="Preuve de paiement" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reassign modal ── */}
      <AnimatePresence>
        {reassignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReassignModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '8px', padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', margin: 0 }}>Déplacer le RDV</h3>
                <button onClick={() => setReassignModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={16} color="#8A7968" /></button>
              </div>

              <div style={{ padding: '12px 16px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '4px', marginBottom: '20px' }}>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968', margin: 0 }}>
                  RDV actuel de <strong style={{ color: '#FAF6EF' }}>{reassignModal.booking.name}</strong> : {reassignModal.currentDate} à {reassignModal.currentTime}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Nouvelle date</label>
                  <input type="date" value={newSlotDate} onChange={e => { setNewSlotDate(e.target.value); setNewSlotTime(''); }} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
                </div>

                {newSlotDate && (
                  <div>
                    <label style={labelStyle}>Nouvel horaire</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {getSlotsForDate(newSlotDate).length === 0 ? (
                        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968', fontStyle: 'italic' }}>Aucun créneau ouvert ce jour-là.</p>
                      ) : getSlotsForDate(newSlotDate).map(slot => {
                        const taken = getBookedSlotsForDate(newSlotDate).includes(slot) &&
                          !(reassignModal.booking.date === newSlotDate && reassignModal.booking.time === slot);
                        return (
                          <button key={slot} onClick={() => !taken && setNewSlotTime(slot)} disabled={taken} style={{ padding: '8px 14px', background: newSlotTime === slot ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent', border: newSlotTime === slot ? '1px solid #C9A84C' : taken ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '13px', color: newSlotTime === slot ? '#0A0A0A' : taken ? '#3A3A3A' : '#FAF6EF', cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? 0.35 : 1, textDecoration: taken ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button onClick={() => setReassignModal(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Annuler</button>
                  <motion.button onClick={handleReassign} whileHover={{ scale: 1.03 }} disabled={!newSlotDate || !newSlotTime} style={{ flex: 2, padding: '12px', background: newSlotDate && newSlotTime ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.05)', color: newSlotDate && newSlotTime ? '#0A0A0A' : '#8A7968', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: newSlotDate && newSlotTime ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}>
                    Confirmer le déplacement
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) { .admin-header { padding: 16px 20px !important; } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
      `}</style>
    </div>
  );
}

const labelStyle = {
  fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em',
  textTransform: 'uppercase', color: '#8A7968', display: 'block', marginBottom: '8px',
};
const inputStyle = {
  width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(201,168,76,0.25)', borderRadius: '2px', color: '#FAF6EF',
  fontFamily: 'Jost, sans-serif', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border 0.3s',
};