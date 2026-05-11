import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, storage } from '../firebase.js';
import { signOut } from 'firebase/auth';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, updateDoc, serverTimestamp, setDoc, getDoc, where,
  writeBatch, getDocs
} from 'firebase/firestore';
import { uploadImage } from "../utils/uploadImage";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  format, addDays, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, startOfWeek, endOfWeek, isPast, isToday,
  differenceInDays, parseISO, differenceInMinutes
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Clock, X, Check, AlertTriangle, Eye,
  RefreshCw, Ban, RotateCcw, Search, Archive, Trash2, Bell, Edit3,
  History, SortAsc, SortDesc, Filter, CheckCircle, Calendar, Phone,
  User, Download, MessageSquare, Wallet, Menu, LogOut
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = ['Glam', 'Cérémonie', 'Naturel'];
const ALL_SLOTS = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

const PAYMENT_EXPIRY_MINUTES = 1440;
const AUTO_DELETE_AFTER_DAYS = 60;
const REMINDER_HOURS_BEFORE = 24;

// ─── Styles ──────────────────────────────────────────────────────────────────
const TAB_STYLE = (active) => ({
  padding: '10px 16px',
  background: active ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent',
  border: active ? 'none' : '1px solid rgba(201,168,76,0.2)',
  color: active ? '#0A0A0A' : '#8A7968',
  borderRadius: '2px',
  fontFamily: 'Jost, sans-serif',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.3s',
  whiteSpace: 'nowrap',
  flexShrink: 0,
});

export const STATUS_COLOR = {
  pending_payment:        '#C9A84C',
  waiting_confirmation:   '#E8A44C',
  confirmed:              '#25D366',
  cancellation_requested: '#E74C3C',
  cancelled:              '#555',
  expired:                '#444',
  completed:              '#4A90D9',
  archived:               '#3A3A3A',
  en_attente_paiement:    '#C9A84C',
  acompte_paye:           '#E8A44C',
  paye_entierement:       '#25D366',
  expire:                 '#444',
  annule:                 '#555',
};

export const STATUS_LABEL = {
  pending_payment:        'En attente paiement',
  waiting_confirmation:   'Preuve envoyée',
  confirmed:              'Confirmé',
  cancellation_requested: 'Annulation demandée',
  cancelled:              'Annulé',
  expired:                'Expiré',
  completed:              'Terminé',
  archived:               'Archivé',
  en_attente_paiement:    'En attente paiement',
  acompte_paye:           'Acompte payé',
  paye_entierement:       'Payé entièrement',
  expire:                 'Expiré',
  annule:                 'Annulé',
};

const labelStyle = {
  fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.15em',
  textTransform: 'uppercase', color: '#8A7968', display: 'block', marginBottom: '8px',
};
const inputStyle = {
  width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(201,168,76,0.25)', borderRadius: '2px', color: '#FAF6EF',
  fontFamily: 'Jost, sans-serif', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box', transition: 'border 0.3s',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function freeSlotInAvailability(date, time) {
  if (!date || !time) return;
  try {
    const availRef = doc(db, 'availability', date);
    const snap = await getDoc(availRef);
    if (!snap.exists()) return;
    const slots = snap.data().slots || [];
    if (!slots.includes(time)) {
      await setDoc(availRef, { slots: [...slots, time].sort(), updatedAt: serverTimestamp() }, { merge: true });
    }
  } catch (err) { console.error('freeSlot error:', err); }
}

async function addBookingHistory(bookingId, action, details = {}) {
  try {
    await addDoc(collection(db, 'bookings', bookingId, 'history'), {
      action, details, timestamp: serverTimestamp(),
    });
  } catch (err) { console.error('history error:', err); }
}

function buildWhatsApp(phone, message) {
  const raw = phone?.replace(/\s/g, '') || '';
  if (!raw) return null;
  const clean = raw.startsWith('+') ? raw.slice(1)
    : raw.startsWith('00') ? raw.slice(2)
    : `221${raw}`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function notifyWA(booking, type, extra = {}) {
  const name = booking.name;
  const date = extra.newDate || booking.date;
  const time = extra.newTime || booking.time;
  const templates = {
    confirmed: `✨ *MAGICAL HAND BY MAMIFA* ✨\n━━━━━━━━━━━━━━━━━━━\nBonjour *${name}* 💄\n\nVotre rendez-vous est *confirmé* ! 🎉\n\n💋 Prestation : ${booking.service}\n📅 Date : ${date}\n🕐 Heure : ${time}\n\nMerci pour votre confiance et  Merci d’arriver quelques minutes avant le rendez-vous.. À très bientôt !\n_Magical Hand by Mamifa_ ✨`,
    cancelled: `✨ *MAGICAL HAND BY MAMIFA* ✨\n━━━━━━━━━━━━━━━━━━━\nBonjour *${name}*,\n\nMalheureusement votre réservation du *${date} à ${time}* n'a pas pu être confirmée et est annulée.\n\n✨ D’autres créneaux restent disponibles cette semaine.\n\nN'hésitez pas à nous recontacter pour fixer un nouveau rendez-vous.\n\n_Magical Hand by Mamifa_ 💄`,
    rescheduled: `✨ *MAGICAL HAND BY MAMIFA* ✨\n━━━━━━━━━━━━━━━━━━━\nBonjour *${name}* 💄\n\nVotre rendez-vous a été *déplacé* 📅\n\n💋 Prestation : ${booking.service}\n📅 Nouveau créneau : ${date} à ${time} heure \n\nPour toute question, répondez à ce message.\n_Magical Hand by Mamifa_ ✨`,
    reminder: `✨ *MAGICAL HAND BY MAMIFA* ✨\n━━━━━━━━━━━━━━━━━━━\nBonjour *${name}* 💄\n\nRappel : votre rendez-vous est *demain* !\n\n💋 Prestation : ${booking.service}\n📅 Date : ${date}\n🕐 Heure : ${time}\n\nNous vous attendons !\n_Magical Hand by Mamifa_ ✨`,
    cancellation_rejected: `✨ *MAGICAL HAND BY MAMIFA* ✨\nBonjour *${name}*, votre demande d'annulation n'a pas pu être acceptée. Votre rendez-vous du *${date} à ${time}* est maintenu. Contactez-nous pour plus d'informations.`,
  };
  const url = buildWhatsApp(booking.phone, templates[type]);
  if (url) window.open(url, '_blank');
}

function getMontantPaye(b) {
  if (b.montantPaye !== undefined && b.montantPaye !== null) return Number(b.montantPaye);
  if (b.acompte !== undefined && b.acompte !== null) return Number(b.acompte);
  return 0;
}
function getMontantTotal(b) {
  if (b.montantTotal !== undefined && b.montantTotal !== null) return Number(b.montantTotal);
  return 0;
}
function getResteAPayer(b) {
  if (b.resteAPayer !== undefined && b.resteAPayer !== null) return Number(b.resteAPayer);
  const total = getMontantTotal(b);
  const paye = getMontantPaye(b);
  if (total > 0) return Math.max(0, total - paye);
  return 0;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || '#8A7968';
  const label = STATUS_LABEL[status] || status;
  return (
    <span style={{
      padding: '4px 10px',
      background: `${color}22`,
      border: `1px solid ${color}44`,
      color,
      borderRadius: '2px',
      fontFamily: 'Jost, sans-serif',
      fontSize: '10px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ─── PaymentBadge ────────────────────────────────────────────────────────────
function PaymentBadge({ booking }) {
  const paye = getMontantPaye(booking);
  const total = getMontantTotal(booking);
  const reste = getResteAPayer(booking);
  if (!total && !paye) return null;
  const isPaidFull = reste === 0 && paye > 0;
  const isPending = paye === 0;
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: '3px',
      padding: '6px 10px',
      background: isPaidFull ? 'rgba(37,211,102,0.06)' : isPending ? 'rgba(201,168,76,0.05)' : 'rgba(232,164,76,0.06)',
      border: `1px solid ${isPaidFull ? 'rgba(37,211,102,0.2)' : isPending ? 'rgba(201,168,76,0.15)' : 'rgba(232,164,76,0.2)'}`,
      borderRadius: '4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Wallet size={10} color={isPaidFull ? '#25D366' : isPending ? '#C9A84C' : '#E8A44C'} />
        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: isPaidFull ? '#25D366' : isPending ? '#C9A84C' : '#E8A44C', letterSpacing: '0.05em' }}>
          {isPending ? `En attente · ${total.toLocaleString()} F` : isPaidFull ? `Payé : ${paye.toLocaleString()} FCFA` : `Payé : ${paye.toLocaleString()} F`}
        </span>
      </div>
      {!isPaidFull && !isPending && reste > 0 && (
        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', paddingLeft: '15px' }}>
          Reste : <strong style={{ color: '#FAF6EF' }}>{reste.toLocaleString()} F</strong>
        </span>
      )}
      {total > 0 && !isPending && (
        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', color: '#555', paddingLeft: '15px' }}>
          Total : {total.toLocaleString()} FCFA
        </span>
      )}
    </div>
  );
}

// ─── HistoryModal ─────────────────────────────────────────────────────────────
function HistoryModal({ booking, onClose }) {
  const [history, setHistory] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'bookings', booking.id, 'history'), orderBy('timestamp', 'desc')),
      snap => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [booking.id]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999, padding: '0' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '600px', background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px 16px 0 0', padding: '28px 20px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', background: 'rgba(201,168,76,0.3)', borderRadius: '2px', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <History size={15} color="#C9A84C" />
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#FAF6EF', margin: 0 }}>
              Historique — {booking.name}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}><X size={16} color="#8A7968" /></button>
        </div>
        {history.length === 0 ? (
          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968', textAlign: 'center', padding: '20px' }}>Aucun historique</p>
        ) : history.map(h => (
          <div key={h.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#FAF6EF', flex: 1 }}>{h.action}</div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', whiteSpace: 'nowrap' }}>
                {h.timestamp?.toDate ? format(h.timestamp.toDate(), 'dd/MM/yy HH:mm') : '–'}
              </div>
            </div>
            {h.details && Object.keys(h.details).length > 0 && (
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', marginTop: '4px' }}>
                {Object.entries(h.details).map(([k, v]) => (
                  <span key={k} style={{ marginRight: '10px' }}>{k}: <span style={{ color: '#C9A84C' }}>{v}</span></span>
                ))}
              </div>
            )}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── EditBookingModal ─────────────────────────────────────────────────────────
function EditBookingModal({ booking, bookings, availability, onClose, onSave }) {
  const [form, setForm] = useState({
    name: booking.name || '',
    phone: booking.phone || '',
    service: booking.service || '',
    date: booking.date || '',
    time: booking.time || '',
    montantPaye: getMontantPaye(booking) || '',
    montantTotal: getMontantTotal(booking) || '',
    status: booking.status || booking.statutReservation || 'pending_payment',
  });

  const getSlotsForDate = (d) => availability[d]?.slots || [];
  const getBookedSlotsForDate = (d) =>
    bookings.filter(b => b.date === d && b.id !== booking.id && !['cancelled','expired','archived','completed','annule','expire'].includes(b.status || b.statutReservation)).map(b => b.time);

  const resteCalcule = form.montantTotal && form.montantPaye
    ? Math.max(0, Number(form.montantTotal) - Number(form.montantPaye))
    : getResteAPayer(booking);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999 }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '600px', background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px 16px 0 0', padding: '28px 20px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', background: 'rgba(201,168,76,0.3)', borderRadius: '2px', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Edit3 size={15} color="#C9A84C" />
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', margin: 0 }}>Modifier le RDV</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}><X size={16} color="#8A7968" /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { label: 'Nom', key: 'name', type: 'text', icon: <User size={12} /> },
            { label: 'Téléphone', key: 'phone', type: 'tel', icon: <Phone size={12} /> },
            { label: 'Prestation', key: 'service', type: 'text' },
          ].map(({ label, key, type, icon }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <div style={{ position: 'relative' }}>
                {icon && <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8A7968' }}>{icon}</span>}
                <input type={type} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ ...inputStyle, paddingLeft: icon ? '34px' : inputStyle.padding }}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
              </div>
            </div>
          ))}

          <div style={{ padding: '16px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '6px' }}>
            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wallet size={11} /> Paiement
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>Total (FCFA)</label>
                <input type="number" value={form.montantTotal}
                  onChange={e => setForm(f => ({ ...f, montantTotal: e.target.value }))}
                  style={{ ...inputStyle, fontSize: '13px', padding: '10px 12px' }}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '10px' }}>Payé (FCFA)</label>
                <input type="number" value={form.montantPaye}
                  onChange={e => setForm(f => ({ ...f, montantPaye: e.target.value }))}
                  style={{ ...inputStyle, fontSize: '13px', padding: '10px 12px' }}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
              </div>
            </div>
            {resteCalcule > 0 && (
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#E8A44C', margin: '8px 0 0' }}>
                Reste : <strong>{resteCalcule.toLocaleString()} FCFA</strong>
              </p>
            )}
            {resteCalcule === 0 && Number(form.montantPaye) > 0 && (
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#25D366', margin: '8px 0 0' }}>✓ Entièrement réglé</p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value, time: '' }))}
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={e => e.target.style.borderColor = '#C9A84C'}
              onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
          </div>

          {form.date && (
            <div>
              <label style={labelStyle}>Heure</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {ALL_SLOTS.map(slot => {
                  const booked = getBookedSlotsForDate(form.date).includes(slot);
                  const isSelected = form.time === slot;
                  return (
                    <button key={slot} onClick={() => !booked && setForm(f => ({ ...f, time: slot }))} disabled={booked}
                      style={{ padding: '8px 12px', background: isSelected ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent', border: `1px solid ${isSelected ? '#C9A84C' : booked ? 'rgba(255,255,255,0.04)' : 'rgba(201,168,76,0.25)'}`, borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '12px', color: isSelected ? '#0A0A0A' : booked ? '#3A3A3A' : '#FAF6EF', cursor: booked ? 'not-allowed' : 'pointer', opacity: booked ? 0.3 : 1, textDecoration: booked ? 'line-through' : 'none' }}>
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Statut</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {Object.entries(STATUS_LABEL).filter(([k]) => !['en_attente_paiement','acompte_paye','paye_entierement','expire','annule'].includes(k)).map(([k, v]) => (
                <option key={k} value={k} style={{ background: '#1A1714' }}>{v}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', paddingBottom: '16px' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Annuler</button>
            <motion.button onClick={() => onSave(form)} whileHover={{ scale: 1.03 }}
              style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0A0A0A', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>
              Enregistrer
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── BookingCard (mobile-optimized) ──────────────────────────────────────────
function BookingCard({ b, getEffectiveStatus, dueSoonReminders, setEditModal, updateBookingStatus, acceptCancellation, rejectCancellation, setReassignModal, notifyWA, releaseSlot, expireBooking, archiveBooking, deleteBookingPermanently, setProofViewer }) {
  const [expanded, setExpanded] = useState(false);
  const effectiveStatus = getEffectiveStatus(b);
  const isCancelReq = effectiveStatus === 'cancellation_requested';
  const isWaiting = ['waiting_confirmation','acompte_paye','paye_entierement'].includes(effectiveStatus);
  const isCompleted = effectiveStatus === 'completed';
  const isArchived = effectiveStatus === 'archived';
  const isDueSoon = dueSoonReminders.some(r => r.id === b.id);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: isCancelReq ? 'rgba(231,76,60,0.04)' : isWaiting ? 'rgba(232,164,76,0.04)' : isCompleted ? 'rgba(74,144,217,0.03)' : isArchived ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.02)',
        border: isCancelReq ? '1px solid rgba(231,76,60,0.2)' : isWaiting ? '1px solid rgba(232,164,76,0.2)' : isDueSoon ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(201,168,76,0.08)',
        borderRadius: '8px', position: 'relative', overflow: 'hidden', opacity: isArchived ? 0.7 : 1,
      }}>
      {isCancelReq && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #E74C3C, transparent)' }} />}
      {isDueSoon && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />}

      {/* Card header — toujours visible */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#FAF6EF', lineHeight: 1.2, marginBottom: '3px' }}>{b.name}</div>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={9} /> {b.phone}
            </div>
          </div>
          <StatusBadge status={effectiveStatus} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#FAF6EF' }}>{b.service}</div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={10} /> {b.date} · {b.time}
          </div>
        </div>

        <PaymentBadge booking={b} />

        {isDueSoon && (
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#C9A84C', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Bell size={9} /> RDV proche — rappel recommandé
          </div>
        )}
      </div>

      {/* Toggle expand */}
      <button onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '10px 16px', background: 'rgba(201,168,76,0.04)', border: 'none', borderTop: '1px solid rgba(201,168,76,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A7968' }}>
        {expanded ? 'Masquer actions' : 'Voir actions'}
        <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronRight size={12} color="#8A7968" style={{ transform: 'rotate(90deg)' }} />
        </motion.span>
      </button>

      {/* Actions panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(201,168,76,0.06)' }}>

              {b.proofUrl && (
                <button onClick={() => setProofViewer(b.proofUrl)} style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Eye size={11} /> Preuve
                </button>
              )}

              {!isArchived && (
                <button onClick={() => setEditModal(b)} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#FAF6EF', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Edit3 size={11} /> Modifier
                </button>
              )}

              {isWaiting && (
                <>
                  <button onClick={() => updateBookingStatus(b.id, 'confirmed')} style={{ padding: '8px 14px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={11} /> Confirmer
                  </button>
                  <button onClick={() => updateBookingStatus(b.id, 'cancelled')} style={{ padding: '8px 14px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', color: '#E74C3C', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <X size={11} /> Refuser
                  </button>
                </>
              )}

              {isCancelReq && (
                <>
                  <button onClick={() => acceptCancellation(b)} style={{ padding: '8px 14px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.4)', color: '#E74C3C', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                    ✓ Accepter annulation
                  </button>
                  <button onClick={() => rejectCancellation(b)} style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer' }}>
                    ✕ Maintenir le RDV
                  </button>
                </>
              )}

              {effectiveStatus === 'confirmed' && (
                <>
                  <button onClick={() => setReassignModal({ booking: b, currentDate: b.date, currentTime: b.time })} style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <RefreshCw size={11} /> Déplacer
                  </button>
                  {isDueSoon && (
                    <button onClick={() => notifyWA(b, 'reminder')} style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Bell size={11} /> Rappel WA
                    </button>
                  )}
                  <button onClick={() => releaseSlot(b)} style={{ padding: '8px 14px', background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', color: '#E74C3C', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer' }}>
                    Annuler
                  </button>
                </>
              )}

              {['pending_payment','en_attente_paiement'].includes(effectiveStatus) && (
                <button onClick={() => expireBooking(b)} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#555', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer' }}>
                  Marquer expiré
                </button>
              )}

              {['cancelled','expired','completed','annule','expire'].includes(effectiveStatus) && (
                <button onClick={() => archiveBooking(b)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#8A7968', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Archive size={11} /> Archiver
                </button>
              )}

              {isArchived && (
                <button onClick={() => deleteBookingPermanently(b)} style={{ padding: '8px 14px', background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.15)', color: '#E74C3C', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Trash2 size={11} /> Supprimer
                </button>
              )}
            </div>

            {/* Meta info */}
            <div style={{ padding: '0 16px 14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', color: '#444' }}>#{b.id?.slice(0, 8)}</span>
              {b.createdAt?.toDate && (
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', color: '#444' }}>
                  Créé : {format(b.createdAt.toDate(), 'dd/MM/yy HH:mm')}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Admin ───────────────────────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState('disponibilites');
  const [photos, setPhotos] = useState([]);
  const [availability, setAvailability] = useState({});
  const [bookings, setBookings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState('Glam');
  const [selectedFile, setSelectedFile] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calView, setCalView] = useState('month');
  const [editingDate, setEditingDate] = useState(null);
  const [calOffset, setCalOffset] = useState(0);

  const [reassignModal, setReassignModal] = useState(null);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('');
  const [proofViewer, setProofViewer] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [editModal, setEditModal] = useState(null);

  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showArchived, setShowArchived] = useState(false);

  const [editingPhoto, setEditingPhoto] = useState(null);
  const fileRef = useRef();
  const navigate = useNavigate();

  const visibleWeek = Array.from({ length: 7 }, (_, i) => addDays(new Date(), calOffset * 7 + i + 1));
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // ─── Firestore listeners ─────────────────────────────────────────────────────
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

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const toExpire = bookings.filter(b => {
        const s = b.status || b.statutReservation;
        if (!['pending_payment', 'en_attente_paiement'].includes(s)) return false;
        const created = b.createdAt?.toDate?.();
        if (!created) return false;
        return differenceInMinutes(now, created) >= PAYMENT_EXPIRY_MINUTES;
      });
      for (const b of toExpire) {
        await updateDoc(doc(db, 'bookings', b.id), { status: 'expired', statutReservation: 'expire', autoExpiredAt: serverTimestamp() });
        await freeSlotInAvailability(b.date, b.time);
        await addBookingHistory(b.id, 'Expiré automatiquement (délai paiement dépassé)');
        toast(`⏱ RDV de ${b.name} expiré automatiquement`, { icon: '🕐' });
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [bookings]);

  useEffect(() => {
    const toComplete = bookings.filter(b => {
      const s = b.status || b.statutReservation;
      if (!['confirmed', 'acompte_paye', 'paye_entierement'].includes(s)) return false;
      try {
        const dt = parseISO(`${b.date}T${b.time}:00`);
        return isPast(dt);
      } catch { return false; }
    });
    toComplete.forEach(async b => {
      await updateDoc(doc(db, 'bookings', b.id), { status: 'completed', completedAt: serverTimestamp() });
      await addBookingHistory(b.id, 'Marqué automatiquement comme terminé');
    });
  }, [bookings]);

  useEffect(() => {
    const toDelete = bookings.filter(b => {
      if ((b.status || b.statutReservation) !== 'archived') return false;
      const archivedAt = b.archivedAt?.toDate?.();
      if (!archivedAt) return false;
      return differenceInDays(new Date(), archivedAt) >= AUTO_DELETE_AFTER_DAYS;
    });
    toDelete.forEach(async b => { await deleteDoc(doc(db, 'bookings', b.id)); });
  }, [bookings]);

  useEffect(() => {
    const now = new Date();
    bookings.filter(b => (b.status || b.statutReservation) === 'confirmed' && !b.reminderSent).forEach(async b => {
      try {
        const dt = parseISO(`${b.date}T${b.time}:00`);
        const hoursUntil = (dt - now) / 3_600_000;
        if (hoursUntil <= REMINDER_HOURS_BEFORE && hoursUntil > 0) {
          await updateDoc(doc(db, 'bookings', b.id), { reminderSent: true });
          await addBookingHistory(b.id, `Rappel WhatsApp envoyé (${REMINDER_HOURS_BEFORE}h avant)`);
          toast(`📩 Rappel dû pour ${b.name} (${b.date} ${b.time})`, { duration: 6000 });
        }
      } catch {}
    });
  }, [bookings]);

  const handleLogout = async () => { await signOut(auth); navigate('/admin/login'); };

  // ─── Slot helpers ────────────────────────────────────────────────────────────
  const getSlotsForDate = (dateStr) => availability[dateStr]?.slots || [];
  const getBookedSlotsForDate = (dateStr) =>
    bookings.filter(b => b.date === dateStr && !['cancelled','expired','archived','cancellation_requested','annule','expire'].includes(b.status || b.statutReservation)).map(b => b.time);

  const toggleSlot = async (dateStr, slot) => {
    const current = getSlotsForDate(dateStr);
    const booked = getBookedSlotsForDate(dateStr);
    if (booked.includes(slot)) { toast.error('Ce créneau est réservé — libérez-le d\'abord.'); return; }
    let updated = current.includes(slot) ? current.filter(s => s !== slot) : [...current, slot].sort();
    if (updated.length === 0) await deleteDoc(doc(db, 'availability', dateStr)).catch(() => {});
    else await setDoc(doc(db, 'availability', dateStr), { slots: updated, updatedAt: serverTimestamp() });
  };

  const toggleAllSlots = async (dateStr) => {
    const current = getSlotsForDate(dateStr);
    if (current.length === ALL_SLOTS.length) await deleteDoc(doc(db, 'availability', dateStr)).catch(() => {});
    else await setDoc(doc(db, 'availability', dateStr), { slots: [...ALL_SLOTS], updatedAt: serverTimestamp() });
  };

  const blockSlot = async (dateStr, slot) => {
    const current = getSlotsForDate(dateStr);
    const booked = getBookedSlotsForDate(dateStr);
    if (booked.includes(slot)) { toast.error('Créneau réservé. Libérez la réservation d\'abord.'); return; }
    const updated = current.filter(s => s !== slot);
    if (updated.length === 0) await deleteDoc(doc(db, 'availability', dateStr)).catch(() => {});
    else await setDoc(doc(db, 'availability', dateStr), { slots: updated, updatedAt: serverTimestamp() });
    toast.success(`Créneau ${slot} bloqué`);
  };

  const reopenSlot = async (dateStr, slot) => {
    const current = getSlotsForDate(dateStr);
    if (current.includes(slot)) { toast('Créneau déjà ouvert'); return; }
    await setDoc(doc(db, 'availability', dateStr), { slots: [...current, slot].sort(), updatedAt: serverTimestamp() }, { merge: true });
    toast.success(`Créneau ${slot} rouvert`);
  };

  const releaseSlot = async (booking) => {
    if (!confirm(`Annuler la réservation de ${booking.name} (${booking.time} le ${booking.date}) et rouvrir le créneau ?`)) return;
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled', statutReservation: 'annule', cancelledByAdmin: true, updatedAt: serverTimestamp() });
    await freeSlotInAvailability(booking.date, booking.time);
    await addBookingHistory(booking.id, 'Annulé par l\'admin — créneau libéré');
    toast.success('Réservation annulée et créneau libéré');
  };

  const expireBooking = async (booking) => {
    if (!confirm(`Marquer la réservation de ${booking.name} comme expirée et libérer le créneau ?`)) return;
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'expired', statutReservation: 'expire', updatedAt: serverTimestamp() });
    await freeSlotInAvailability(booking.date, booking.time);
    await addBookingHistory(booking.id, 'Marqué expiré manuellement');
    toast.success('Réservation expirée — créneau libéré');
  };

  const archiveBooking = async (booking) => {
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'archived', archivedAt: serverTimestamp() });
    await addBookingHistory(booking.id, 'Archivé');
    toast.success('Réservation archivée');
  };

  const deleteBookingPermanently = async (booking) => {
    if (!confirm(`Supprimer définitivement la réservation de ${booking.name} ?`)) return;
    await deleteDoc(doc(db, 'bookings', booking.id));
    toast.success('Réservation supprimée');
  };

  const handleReassign = async () => {
    if (!newSlotDate || !newSlotTime) { toast.error('Choisissez une date et une heure'); return; }
    const { booking } = reassignModal;
    const newSlots = getSlotsForDate(newSlotDate);
    if (!newSlots.includes(newSlotTime)) { toast.error('Ce créneau n\'est pas ouvert dans les disponibilités'); return; }
    const alreadyBooked = getBookedSlotsForDate(newSlotDate).filter(t => !(booking.date === newSlotDate && booking.time === t));
    if (alreadyBooked.includes(newSlotTime)) { toast.error('Ce créneau est déjà réservé'); return; }

    const oldDate = booking.date;
    const oldTime = booking.time;
    await updateDoc(doc(db, 'bookings', booking.id), { date: newSlotDate, time: newSlotTime, rescheduledAt: serverTimestamp() });
    await addBookingHistory(booking.id, 'RDV déplacé', { avant: `${oldDate} ${oldTime}`, après: `${newSlotDate} ${newSlotTime}` });
    await freeSlotInAvailability(oldDate, oldTime);
    const newSlotsUpdated = newSlots.filter(s => s !== newSlotTime);
    if (newSlotsUpdated.length === 0) await deleteDoc(doc(db, 'availability', newSlotDate)).catch(() => {});
    else await setDoc(doc(db, 'availability', newSlotDate), { slots: newSlotsUpdated, updatedAt: serverTimestamp() }, { merge: true });
    notifyWA(booking, 'rescheduled', { newDate: newSlotDate, newTime: newSlotTime });
    toast.success('Rendez-vous déplacé !');
    setReassignModal(null); setNewSlotDate(''); setNewSlotTime('');
  };

  const updateBookingStatus = async (id, status) => {
    const booking = bookings.find(b => b.id === id);
    await updateDoc(doc(db, 'bookings', id), { status, updatedAt: serverTimestamp() });
    await addBookingHistory(id, `Statut → ${STATUS_LABEL[status]}`);
    toast.success(`RDV : ${STATUS_LABEL[status]}`);
    if (status === 'cancelled' || status === 'expired') {
      if (booking) await freeSlotInAvailability(booking.date, booking.time);
    }
    if (booking && (status === 'confirmed' || status === 'cancelled')) {
      notifyWA(booking, status);
    }
  };

  const acceptCancellation = async (booking) => {
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled', cancellationApprovedAt: serverTimestamp() });
    await freeSlotInAvailability(booking.date, booking.time);
    await addBookingHistory(booking.id, 'Demande d\'annulation acceptée — créneau libéré');
    toast.success('Annulation acceptée — créneau libéré');
    notifyWA(booking, 'cancelled');
  };

  const rejectCancellation = async (booking) => {
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'confirmed', cancellationRejectedAt: serverTimestamp() });
    await addBookingHistory(booking.id, 'Demande d\'annulation refusée — RDV maintenu');
    toast.success('Demande d\'annulation refusée — RDV maintenu');
    notifyWA(booking, 'cancellation_rejected');
  };

  const handleEditSave = async (form) => {
    const b = editModal;
    const prevDate = b.date;
    const prevTime = b.time;
    if (form.date !== b.date || form.time !== b.time) {
      const conflicting = bookings.find(x =>
        x.id !== b.id && x.date === form.date && x.time === form.time &&
        !['cancelled','expired','archived','completed','annule','expire'].includes(x.status || x.statutReservation)
      );
      if (conflicting) { toast.error('Ce créneau est déjà réservé !'); return; }
      await freeSlotInAvailability(b.date, b.time);
      const newSlots = getSlotsForDate(form.date);
      const updated = newSlots.filter(s => s !== form.time);
      if (updated.length === 0) await deleteDoc(doc(db, 'availability', form.date)).catch(() => {});
      else await setDoc(doc(db, 'availability', form.date), { slots: updated, updatedAt: serverTimestamp() }, { merge: true });
    }
    const montantPayeNum = form.montantPaye ? Number(form.montantPaye) : getMontantPaye(b);
    const montantTotalNum = form.montantTotal ? Number(form.montantTotal) : getMontantTotal(b);
    const resteNum = Math.max(0, montantTotalNum - montantPayeNum);
    await updateDoc(doc(db, 'bookings', b.id), {
      name: form.name, phone: form.phone, service: form.service,
      date: form.date, time: form.time,
      montantPaye: montantPayeNum, montantTotal: montantTotalNum, resteAPayer: resteNum,
      acompte: montantPayeNum, status: form.status, updatedAt: serverTimestamp(),
    });
    const changes = {};
    if (form.date !== prevDate) changes.date = `${prevDate} → ${form.date}`;
    if (form.time !== prevTime) changes.time = `${prevTime} → ${form.time}`;
    if (form.status !== (b.status || b.statutReservation)) changes.statut = `${STATUS_LABEL[b.status || b.statutReservation]} → ${STATUS_LABEL[form.status]}`;
    if (montantPayeNum !== getMontantPaye(b)) changes['montant payé'] = `${getMontantPaye(b)} → ${montantPayeNum} FCFA`;
    await addBookingHistory(b.id, 'Modifié par l\'admin', changes);
    toast.success('Réservation mise à jour !');
    setEditModal(null);
  };

  // ─── Photos ──────────────────────────────────────────────────────────────────
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

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const totalAvailableSlots = Object.values(availability).reduce((acc, d) => acc + (d.slots?.length || 0), 0);
  const totalAvailableDays = Object.keys(availability).length;
  const pendingProofs = bookings.filter(b => ['waiting_confirmation','acompte_paye','paye_entierement'].includes(b.status || b.statutReservation)).length;
  const pendingCancels = bookings.filter(b => (b.status || b.statutReservation) === 'cancellation_requested').length;
  const activeBookings = bookings.filter(b => !['cancelled','expired','archived','completed','annule','expire'].includes(b.status || b.statutReservation)).length;
  const pendingPayment = bookings.filter(b => ['pending_payment','en_attente_paiement'].includes(b.status || b.statutReservation)).length;
  const totalEncaisse = bookings
    .filter(b => !['cancelled','expired','archived','annule','expire'].includes(b.status || b.statutReservation))
    .reduce((acc, b) => acc + getMontantPaye(b), 0);
  const dueSoonReminders = bookings.filter(b => {
    if ((b.status || b.statutReservation) !== 'confirmed') return false;
    if (b.reminderSent) return false;
    try {
      const dt = parseISO(`${b.date}T${b.time}:00`);
      const h = (dt - new Date()) / 3_600_000;
      return h <= 48 && h > 0;
    } catch { return false; }
  });

  const getEffectiveStatus = (b) => b.status || b.statutReservation || 'pending_payment';

  const filteredBookings = bookings
    .filter(b => {
      const s = getEffectiveStatus(b);
      if (!showArchived && s === 'archived') return false;
      if (statusFilter && s !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (b.name || '').toLowerCase().includes(q) ||
          (b.phone || '').includes(q) ||
          (b.date || '').includes(q) ||
          (b.service || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b_) => {
      const da = a.createdAt?.toDate?.() || new Date(0);
      const db_ = b_.createdAt?.toDate?.() || new Date(0);
      return sortOrder === 'desc' ? db_ - da : da - db_;
    });

  const bulkArchiveOld = async () => {
    if (!confirm('Archiver toutes les réservations annulées et expirées ?')) return;
    const toArchive = bookings.filter(b => ['cancelled','expired','annule','expire'].includes(getEffectiveStatus(b)));
    for (const b of toArchive) {
      await updateDoc(doc(db, 'bookings', b.id), { status: 'archived', archivedAt: serverTimestamp() });
    }
    toast.success(`${toArchive.length} réservation(s) archivée(s)`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', overflowX: 'hidden' }}>

      {/* ─── Header ─── */}
      <div style={{ padding: '16px 20px', background: 'rgba(10,10,10,0.97)', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)' }}>
        <div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Magical Hand</div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing: '0.2em', color: '#8A7968', textTransform: 'uppercase' }}>Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {(dueSoonReminders.length > 0 || pendingCancels > 0 || pendingProofs > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '2px' }}>
              <Bell size={11} color="#C9A84C" />
              <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#C9A84C' }}>
                {pendingProofs + pendingCancels + dueSoonReminders.length}
              </span>
            </div>
          )}
          <button onClick={handleLogout} style={{ padding: '8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C', borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* ─── Stats scroll horizontal sur mobile ─── */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {[
            { label: 'Actives', value: activeBookings, color: '#C9A84C' },
            { label: 'Créneaux', value: totalAvailableSlots, sub: `${totalAvailableDays}j`, color: '#E8C97A' },
            { label: 'Paiement', value: pendingPayment, color: pendingPayment > 0 ? '#E8A44C' : '#555', alert: pendingPayment > 0 },
            { label: 'Preuves', value: pendingProofs, color: pendingProofs > 0 ? '#E8A44C' : '#555', alert: pendingProofs > 0 },
            { label: 'Annulations', value: pendingCancels, color: pendingCancels > 0 ? '#E74C3C' : '#555', alert: pendingCancels > 0 },
            { label: 'Encaissé', value: `${totalEncaisse.toLocaleString()}F`, color: '#25D366', small: true },
          ].map((stat) => (
            <div key={stat.label} style={{ flexShrink: 0, width: '110px', background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: stat.alert ? '1px solid rgba(232,164,76,0.4)' : '1px solid rgba(201,168,76,0.12)', borderRadius: '8px', padding: '14px', position: 'relative', overflow: 'hidden' }}>
              {stat.alert && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #E8A44C, #C9A84C)' }} />}
              <div style={{ fontFamily: stat.small ? 'Jost, sans-serif' : 'Cormorant Garamond, serif', fontSize: stat.small ? '16px' : '32px', color: stat.color, lineHeight: 1, marginBottom: '2px', fontWeight: stat.small ? 700 : 400 }}>{stat.value}</div>
              {stat.sub && <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', color: stat.color, opacity: 0.6 }}>{stat.sub}</div>}
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A7968', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ─── Tabs ─── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
          {[
            { id: 'disponibilites', label: 'Disponibilités' },
            { id: 'photos', label: 'Galerie' },
            { id: 'reservations', label: `Réservations${pendingProofs + pendingCancels > 0 ? ` 🔔` : ''}` },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={TAB_STYLE(tab === t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ═════ DISPONIBILITÉS ═════ */}
        {tab === 'disponibilites' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '8px', padding: '20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '10px' }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', margin: 0 }}>Disponibilités</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[{ id: 'month', label: 'Mois' }, { id: 'week', label: 'Sem.' }].map(v => (
                    <button key={v.id} onClick={() => setCalView(v.id)} style={{ padding: '7px 12px', background: calView === v.id ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent', border: calView === v.id ? 'none' : '1px solid rgba(201,168,76,0.2)', color: calView === v.id ? '#0A0A0A' : '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968', marginBottom: '20px' }}>
                Tapez un jour pour gérer ses créneaux.
              </p>

              {/* MONTH VIEW */}
              {calView === 'month' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ChevronLeft size={15} color="#C9A84C" />
                    </button>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#FAF6EF', textTransform: 'capitalize' }}>
                      {format(calendarDate, 'MMMM yyyy', { locale: fr })}
                    </span>
                    <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ChevronRight size={15} color="#C9A84C" />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
                    {['L','M','M','J','V','S','D'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', padding: '6px 2px' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '20px' }}>
                    {calendarDays.map((date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const slots = getSlotsForDate(dateStr);
                      const booked = getBookedSlotsForDate(dateStr);
                      const isEditing = editingDate === dateStr;
                      const hasSlots = slots.length > 0;
                      const inMonth = isSameMonth(date, calendarDate);
                      const isTodayDate = isSameDay(date, new Date());
                      const freeSlots = slots.filter(s => !booked.includes(s)).length;
                      const dayBookings = bookings.filter(b => b.date === dateStr && !['cancelled','expired','archived','annule','expire'].includes(getEffectiveStatus(b)));

                      return (
                        <motion.button key={dateStr} onClick={() => setEditingDate(isEditing ? null : dateStr)} whileTap={{ scale: 0.94 }} style={{
                          minHeight: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                          padding: '6px 2px',
                          background: isEditing ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(232,201,122,0.18))' : hasSlots ? 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(232,201,122,0.06))' : 'rgba(255,255,255,0.02)',
                          border: isEditing ? '1px solid rgba(201,168,76,0.9)' : isTodayDate ? '1px solid rgba(201,168,76,0.4)' : hasSlots ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', opacity: inMonth ? 1 : 0.2, gap: '2px',
                        }}>
                          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: hasSlots ? '#C9A84C' : '#FAF6EF', lineHeight: 1, opacity: hasSlots ? 1 : inMonth ? 0.5 : 0.2 }}>{format(date, 'd')}</span>
                          {hasSlots && <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '7px', color: '#E8C97A', opacity: 0.8 }}>{freeSlots}/{slots.length}</span>}
                          {dayBookings.length > 0 && (
                            <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '1px' }}>
                              {dayBookings.slice(0, 2).map(b => (
                                <div key={b.id} style={{ width: '4px', height: '4px', borderRadius: '50%', background: STATUS_COLOR[getEffectiveStatus(b)] || '#C9A84C' }} />
                              ))}
                              {dayBookings.length > 2 && <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '6px', color: '#8A7968' }}>+</span>}
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* WEEK VIEW */}
              {calView === 'week' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <button onClick={() => setCalOffset(Math.max(0, calOffset - 1))} disabled={calOffset === 0} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: calOffset === 0 ? 'not-allowed' : 'pointer', opacity: calOffset === 0 ? 0.3 : 1 }}>
                      <ChevronLeft size={15} color="#C9A84C" />
                    </button>
                    <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {format(visibleWeek[0], 'd MMM', { locale: fr })} — {format(visibleWeek[6], 'd MMM', { locale: fr })}
                    </span>
                    <button onClick={() => setCalOffset(Math.min(3, calOffset + 1))} disabled={calOffset >= 3} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: calOffset >= 3 ? 'not-allowed' : 'pointer', opacity: calOffset >= 3 ? 0.3 : 1 }}>
                      <ChevronRight size={15} color="#C9A84C" />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
                    {['L','M','M','J','V','S','D'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968', padding: '6px 2px' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '20px' }}>
                    {visibleWeek.map((date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const slots = getSlotsForDate(dateStr);
                      const booked = getBookedSlotsForDate(dateStr);
                      const isEditing = editingDate === dateStr;
                      const hasSlots = slots.length > 0;
                      return (
                        <motion.button key={dateStr} onClick={() => setEditingDate(isEditing ? null : dateStr)} whileTap={{ scale: 0.94 }} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isEditing ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(232,201,122,0.18))' : hasSlots ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,122,0.08))' : 'rgba(255,255,255,0.02)', border: isEditing ? '1px solid rgba(201,168,76,0.9)' : hasSlots ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', gap: '2px' }}>
                          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: hasSlots ? '#C9A84C' : '#FAF6EF', lineHeight: 1, opacity: hasSlots ? 1 : 0.4 }}>{format(date, 'd')}</span>
                          <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '7px', color: hasSlots ? '#E8C97A' : '#8A7968', textTransform: 'uppercase' }}>{format(date, 'MMM', { locale: fr })}</span>
                          {hasSlots && <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '7px', color: '#C9A84C' }}>{slots.length - booked.filter(b => slots.includes(b)).length}/{slots.length}</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Slot editor */}
              <AnimatePresence>
                {editingDate && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '18px 14px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={13} color="#C9A84C" />
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px', color: '#FAF6EF', textTransform: 'capitalize' }}>
                          {format(new Date(editingDate + 'T12:00:00'), 'EEEE d MMM', { locale: fr })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => toggleAllSlots(editingDate)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                          {getSlotsForDate(editingDate).length === ALL_SLOTS.length ? 'Tout fermer' : 'Tout ouvrir'}
                        </button>
                        <button onClick={() => setEditingDate(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                          <X size={15} color="#8A7968" />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {ALL_SLOTS.map((slot) => {
                        const isOpen = getSlotsForDate(editingDate).includes(slot);
                        const isBooked = getBookedSlotsForDate(editingDate).includes(slot);
                        const bookingForSlot = bookings.find(b => b.date === editingDate && b.time === slot && !['cancelled','expired','archived','annule','expire'].includes(getEffectiveStatus(b)));
                        return (
                          <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <motion.button onClick={() => !isBooked && toggleSlot(editingDate, slot)} whileTap={!isBooked ? { scale: 0.93 } : {}} disabled={isBooked}
                              style={{ padding: '10px 6px', background: isBooked ? 'rgba(231,76,60,0.12)' : isOpen ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.03)', border: isBooked ? '1px solid rgba(231,76,60,0.4)' : isOpen ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '13px', color: isBooked ? '#E74C3C' : isOpen ? '#0A0A0A' : '#8A7968', cursor: isBooked ? 'default' : 'pointer', transition: 'all 0.2s', fontWeight: isOpen ? 600 : 400, width: '100%', textAlign: 'center' }}>
                              {slot}
                              {isBooked && <div style={{ fontSize: '8px', opacity: 0.7, marginTop: '2px' }}>RDV</div>}
                            </motion.button>
                            {isBooked && bookingForSlot && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '8px', color: '#8A7968', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookingForSlot.name}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                                  <button onClick={() => setReassignModal({ booking: bookingForSlot, currentDate: editingDate, currentTime: slot })} style={{ padding: '3px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '2px', color: '#C9A84C', fontSize: '8px', cursor: 'pointer', fontFamily: 'Jost, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                    <RefreshCw size={8} /> Dépl.
                                  </button>
                                  <button onClick={() => releaseSlot(bookingForSlot)} style={{ padding: '3px', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '2px', color: '#E74C3C', fontSize: '8px', cursor: 'pointer', fontFamily: 'Jost, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                    <Ban size={8} /> Ann.
                                  </button>
                                </div>
                              </div>
                            )}
                            {isOpen && !isBooked && (
                              <button onClick={() => blockSlot(editingDate, slot)} style={{ padding: '3px 6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px', color: '#555', fontSize: '8px', cursor: 'pointer', fontFamily: 'Jost, sans-serif', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                <Ban size={8} /> Bloquer
                              </button>
                            )}
                            {!isOpen && !isBooked && (
                              <button onClick={() => reopenSlot(editingDate, slot)} style={{ padding: '3px 6px', background: 'transparent', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '2px', color: '#8A7968', fontSize: '8px', cursor: 'pointer', fontFamily: 'Jost, sans-serif', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                <RotateCcw size={8} /> Rouvrir
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                      {[
                        { color: 'linear-gradient(135deg, #C9A84C, #E8C97A)', border: '#C9A84C', label: 'Ouvert' },
                        { color: 'rgba(231,76,60,0.12)', border: 'rgba(231,76,60,0.4)', label: 'Réservé' },
                        { color: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', label: 'Fermé' },
                      ].map(({ color, border, label }) => (
                        <div key={label} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <div style={{ width: '12px', height: '12px', background: color, border: `1px solid ${border}`, borderRadius: '2px' }} />
                          <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', color: '#8A7968' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ═════ PHOTOS ═════ */}
        {tab === 'photos' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '8px', padding: '20px 16px', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', marginBottom: '20px' }}>Ajouter une photo</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                <div style={{ border: '2px dashed rgba(201,168,76,0.25)', borderRadius: '6px', padding: '20px', cursor: 'pointer', textAlign: 'center' }} onClick={() => fileRef.current?.click()}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                  <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968' }}>
                    {selectedFile ? <span style={{ color: '#C9A84C' }}>✓ {selectedFile.name}</span> : 'Appuyer pour choisir une photo'}
                  </div>
                </div>
                <motion.button onClick={handleUpload} disabled={uploading} whileTap={!uploading ? { scale: 0.97 } : {}} style={{ padding: '14px', background: uploading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: uploading ? '#8A7968' : '#0A0A0A', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                  {uploading ? 'Upload...' : 'Publier'}
                </motion.button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <AnimatePresence>
                {photos.map((photo) => (
                  <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: editingPhoto?.id === photo.id ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(201,168,76,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', aspectRatio: '3/4' }}>
                      <img src={photo.url} alt={photo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                        <button onClick={() => setEditingPhoto(editingPhoto?.id === photo.id ? null : { id: photo.id, title: photo.title, category: photo.category })} style={{ background: editingPhoto?.id === photo.id ? 'rgba(201,168,76,0.85)' : 'rgba(20,20,20,0.75)', color: editingPhoto?.id === photo.id ? '#0A0A0A' : '#C9A84C', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
                        <button onClick={() => handleDeletePhoto(photo)} style={{ background: 'rgba(231,76,60,0.85)', color: '#FFF', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    </div>
                    <div style={{ padding: '12px' }}>
                      {editingPhoto?.id === photo.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <input type="text" value={editingPhoto.title} onChange={e => setEditingPhoto({ ...editingPhoto, title: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} placeholder="Titre" autoFocus />
                          <select value={editingPhoto.category} onChange={e => setEditingPhoto({ ...editingPhoto, category: e.target.value })} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px', cursor: 'pointer' }}>
                            {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1A1714' }}>{c}</option>)}
                          </select>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleUpdatePhoto} style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0A0A0A', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
                            <button onClick={() => setEditingPhoto(null)} style={{ padding: '8px 10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '15px', color: '#FAF6EF' }}>{photo.title}</div>
                          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '9px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '4px' }}>{photo.category}</div>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {photos.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: '#8A7968', fontFamily: 'Jost, sans-serif', fontSize: '13px' }}>Aucune photo publiée.</div>}
          </motion.div>
        )}

        {/* ═════ RÉSERVATIONS ═════ */}
        {tab === 'reservations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '8px', padding: '20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF', margin: 0 }}>Réservations</h2>
                  <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', marginTop: '4px', marginBottom: 0 }}>
                    {filteredBookings.length} résultat{filteredBookings.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={bulkArchiveOld} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Archive size={11} /> Archiver annulés
                  </button>
                  <button onClick={() => setShowArchived(s => !s)} style={{ padding: '7px 12px', background: showArchived ? 'rgba(201,168,76,0.1)' : 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: showArchived ? '#C9A84C' : '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Archive size={11} /> {showArchived ? 'Masquer' : 'Archivés'}
                  </button>
                </div>
              </div>

              {pendingCancels > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '10px 14px', background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '4px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={13} color="#E74C3C" />
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#E74C3C' }}>
                    {pendingCancels} annulation{pendingCancels > 1 ? 's' : ''} en attente
                  </span>
                </motion.div>
              )}
              {dueSoonReminders.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '10px 14px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={13} color="#C9A84C" />
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C' }}>
                    {dueSoonReminders.length} RDV dans les 48h
                  </span>
                </motion.div>
              )}

              {/* Search + Sort */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={13} color="#8A7968" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Nom, tél, date…" style={{ ...inputStyle, paddingLeft: '34px', fontSize: '13px' }} onFocus={e => e.target.style.borderColor = '#C9A84C'} onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'} />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <X size={12} color="#8A7968" />
                    </button>
                  )}
                </div>
                <button onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} style={{ padding: '12px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '2px', color: '#8A7968', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {sortOrder === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />}
                </button>
              </div>

              {/* Status filters — scroll horizontal */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                {[null, 'pending_payment', 'waiting_confirmation', 'confirmed', 'completed', 'cancellation_requested', 'cancelled', 'expired', ...(showArchived ? ['archived'] : [])].map(s => (
                  <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                    style={{ flexShrink: 0, padding: '6px 12px', background: statusFilter === s ? (s ? `${STATUS_COLOR[s]}22` : 'rgba(201,168,76,0.12)') : 'transparent', border: statusFilter === s ? `1px solid ${s ? STATUS_COLOR[s] : '#C9A84C'}66` : '1px solid rgba(201,168,76,0.15)', color: statusFilter === s ? (s ? STATUS_COLOR[s] : '#C9A84C') : '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                    {s ? (STATUS_LABEL[s] || s) : 'Tous'}
                  </button>
                ))}
              </div>

              {filteredBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#8A7968', fontFamily: 'Jost, sans-serif', fontSize: '13px' }}>Aucune réservation.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      b={b}
                      getEffectiveStatus={getEffectiveStatus}
                      dueSoonReminders={dueSoonReminders}
                      setEditModal={setEditModal}
                      updateBookingStatus={updateBookingStatus}
                      acceptCancellation={acceptCancellation}
                      rejectCancellation={rejectCancellation}
                      setReassignModal={setReassignModal}
                      notifyWA={notifyWA}
                      releaseSlot={releaseSlot}
                      expireBooking={expireBooking}
                      archiveBooking={archiveBooking}
                      deleteBookingPermanently={deleteBookingPermanently}
                      setProofViewer={setProofViewer}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── Proof viewer — bottom sheet ─── */}
      <AnimatePresence>
        {proofViewer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProofViewer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999 }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30 }} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', background: '#111', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Preuve de paiement</span>
                <button onClick={() => setProofViewer(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}><X size={16} color="#8A7968" /></button>
              </div>
              <img src={proofViewer} alt="Preuve de paiement" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Reassign — bottom sheet ─── */}
      <AnimatePresence>
        {reassignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReassignModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999 }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30 }} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px 16px 0 0', padding: '28px 20px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ width: '40px', height: '4px', background: 'rgba(201,168,76,0.3)', borderRadius: '2px', margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#FAF6EF', margin: 0 }}>Déplacer le RDV</h3>
                <button onClick={() => setReassignModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}><X size={16} color="#8A7968" /></button>
              </div>
              <div style={{ padding: '12px 14px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '4px', marginBottom: '18px' }}>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968', margin: 0 }}>
                  <strong style={{ color: '#FAF6EF' }}>{reassignModal.booking.name}</strong> · {reassignModal.currentDate} à {reassignModal.currentTime}
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
                        const taken = getBookedSlotsForDate(newSlotDate).includes(slot) && !(reassignModal.booking.date === newSlotDate && reassignModal.booking.time === slot);
                        return (
                          <button key={slot} onClick={() => !taken && setNewSlotTime(slot)} disabled={taken} style={{ padding: '9px 14px', background: newSlotTime === slot ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent', border: newSlotTime === slot ? '1px solid #C9A84C' : taken ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', fontFamily: 'Jost, sans-serif', fontSize: '13px', color: newSlotTime === slot ? '#0A0A0A' : taken ? '#3A3A3A' : '#FAF6EF', cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? 0.35 : 1, transition: 'all 0.2s' }}>
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', paddingBottom: '16px' }}>
                  <button onClick={() => setReassignModal(null)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: '#8A7968', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Annuler</button>
                  <motion.button onClick={handleReassign} whileTap={{ scale: 0.97 }} disabled={!newSlotDate || !newSlotTime} style={{ flex: 2, padding: '14px', background: newSlotDate && newSlotTime ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'rgba(255,255,255,0.05)', color: newSlotDate && newSlotTime ? '#0A0A0A' : '#8A7968', border: 'none', borderRadius: '2px', fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, cursor: newSlotDate && newSlotTime ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}>
                    Confirmer
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── History modal ─── */}
      <AnimatePresence>
        {historyModal && <HistoryModal booking={historyModal} onClose={() => setHistoryModal(null)} />}
      </AnimatePresence>

      {/* ─── Edit modal ─── */}
      <AnimatePresence>
        {editModal && (
          <EditBookingModal
            booking={editModal}
            bookings={bookings}
            availability={availability}
            onClose={() => setEditModal(null)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { opacity: 0.4; }
        @media (min-width: 768px) {
          .stats-grid { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important; }
        }
      `}</style>
    </div>
  );
}