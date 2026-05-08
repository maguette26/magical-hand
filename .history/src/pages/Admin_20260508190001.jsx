import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase.js';
import { signOut } from 'firebase/auth';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, updateDoc, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore';

import { uploadImage } from "../utils/uploadImage";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/* ---------------- CONFIG ---------------- */

const ALL_SLOTS = [
  '08:00','09:00','10:00','11:00',
  '13:00','14:00','15:00','16:00',
  '17:00','18:00','19:00','20:00','21:00'
];

const CATEGORIES = ['Glam', 'Cérémonie', 'Naturel'];

/* ---------------- STYLES (TON DESIGN CONSERVÉ) ---------------- */

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
  cursor: 'pointer'
});

/* ---------------- COMPONENT ---------------- */

export default function Admin() {

  const [tab, setTab] = useState('disponibilites');

  const [photos, setPhotos] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState({});

  const [editingDate, setEditingDate] = useState(null);
  const [calOffset, setCalOffset] = useState(0);

  const [selectedFile, setSelectedFile] = useState(null);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState('Glam');

  const fileRef = useRef();
  const navigate = useNavigate();

  /* ---------------- FIRESTORE REALTIME ---------------- */

  useEffect(() => {

    const unsubPhotos = onSnapshot(
      query(collection(db, 'photos'), orderBy('createdAt', 'desc')),
      snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubAvail = onSnapshot(collection(db, 'availability'), snap => {
      const map = {};
      snap.docs.forEach(d => map[d.id] = d.data());
      setAvailability(map);
    });

    const unsubBook = onSnapshot(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc')),
      snap => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubPhotos();
      unsubAvail();
      unsubBook();
    };
  }, []);

  /* ---------------- HELPERS ---------------- */

  const getSlotsForDate = (date) =>
    availability[date]?.slots || [];

  const getBookedSlots = (date) =>
    bookings
      .filter(b => b.date === date && b.status !== 'cancelled')
      .map(b => b.time);

  const renderCalendar = (offset) => {
    const start = new Date();
    const month = new Date(start.getFullYear(), start.getMonth() + offset, 1);

    const startDay = month.getDay() === 0 ? 6 : month.getDay() - 1;
    const days = [];

    for (let i = 0; i < startDay; i++) days.push(null);

    for (let i = 0; i < 35; i++) {
      days.push(addDays(month, i));
    }

    return days;
  };

  /* ---------------- SLOT MANAGEMENT ---------------- */

  const toggleSlot = async (date, slot) => {
    const ref = doc(db, 'availability', date);
    const snap = await getDoc(ref);

    let slots = snap.exists() ? snap.data().slots || [] : [];

    slots = slots.includes(slot)
      ? slots.filter(s => s !== slot)
      : [...slots, slot];

    await setDoc(ref, { slots }, { merge: true });
  };

  const toggleAll = async (date) => {
    const ref = doc(db, 'availability', date);
    const snap = await getDoc(ref);

    const current = snap.exists() ? snap.data().slots || [] : [];

    await setDoc(ref, {
      slots: current.length === ALL_SLOTS.length ? [] : ALL_SLOTS
    }, { merge: true });
  };

  const clearDay = async (date) => {
    await deleteDoc(doc(db, 'availability', date));
    toast.success("Jour vidé");
  };

  /* ---------------- BOOKINGS ---------------- */

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, 'bookings', id), { status });
    toast.success(status);
  };

  const logout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: 30 }}>

      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ color: '#C9A84C' }}>Dashboard Admin</h2>
        <button onClick={logout} style={TAB_STYLE(true)}>Logout</button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {['disponibilites','photos','reservations'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={TAB_STYLE(tab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ================= CALENDRIER ================= */}
      {tab === 'disponibilites' && (
        <div style={{
          marginTop: 30,
          background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderRadius: 4,
          padding: 30
        }}>

          {/* NAV MONTH */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <button onClick={() => setCalOffset(calOffset - 1)} style={TAB_STYLE(false)}>←</button>

            <div style={{ color: '#C9A84C' }}>
              {format(new Date().setMonth(new Date().getMonth() + calOffset), 'MMMM yyyy', { locale: fr })}
            </div>

            <button onClick={() => setCalOffset(calOffset + 1)} style={TAB_STYLE(false)}>→</button>
          </div>

          {/* GRID CALENDAR */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8
          }}>
            {renderCalendar(calOffset).map((date, i) => {

              if (!date) return <div key={i} />;

              const dateStr = format(date, 'yyyy-MM-dd');
              const slots = getSlotsForDate(dateStr);
              const booked = getBookedSlots(dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => setEditingDate(dateStr)}
                  style={{
                    minHeight: 80,
                    borderRadius: 6,
                    padding: 10,
                    cursor: 'pointer',
                    border: '1px solid rgba(201,168,76,0.2)',
                    background: slots.length
                      ? 'rgba(201,168,76,0.1)'
                      : 'rgba(255,255,255,0.02)'
                  }}
                >
                  <div style={{ color: '#FAF6EF' }}>
                    {format(date, 'd')}
                  </div>

                  <small style={{ color: '#8A7968' }}>
                    {slots.length}/{booked.length}
                  </small>
                </div>
              );
            })}
          </div>

          {/* EDIT PANEL */}
          <AnimatePresence>
            {editingDate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginTop: 20,
                  padding: 20,
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 6
                }}
              >

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 style={{ color: '#FAF6EF' }}>{editingDate}</h3>
                  <button onClick={() => setEditingDate(null)} style={{ background: 'none', border: 'none', color: '#8A7968' }}>
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 15 }}>
                  {ALL_SLOTS.map(slot => {
                    const slots = getSlotsForDate(editingDate);
                    const booked = getBookedSlots(editingDate);

                    const active = slots.includes(slot);
                    const isBooked = booked.includes(slot);

                    return (
                      <button
                        key={slot}
                        disabled={isBooked}
                        onClick={() => toggleSlot(editingDate, slot)}
                        style={{
                          padding: 10,
                          borderRadius: 4,
                          border: '1px solid',
                          borderColor: isBooked ? '#E74C3C' : active ? '#C9A84C' : '#333',
                          background: isBooked
                            ? 'rgba(231,76,60,0.1)'
                            : active
                              ? 'linear-gradient(135deg,#C9A84C,#E8C97A)'
                              : 'transparent',
                          color: isBooked ? '#E74C3C' : active ? '#0A0A0A' : '#8A7968'
                        }}
                      >
                        {slot} {isBooked && '🔒'}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
                  <button onClick={() => toggleAll(editingDate)} style={TAB_STYLE(true)}>Tout</button>
                  <button onClick={() => clearDay(editingDate)} style={{ ...TAB_STYLE(false), borderColor: '#E74C3C' }}>Vider</button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* ================= BOOKINGS ================= */}
      {tab === 'reservations' && (
        <div style={{ marginTop: 30 }}>
          {bookings.map(b => (
            <div key={b.id} style={{ padding: 10, borderBottom: '1px solid #333' }}>
              {b.name} — {b.date} {b.time}
              <button onClick={() => updateStatus(b.id,'confirmed')}>✔</button>
              <button onClick={() => updateStatus(b.id,'cancelled')}>✖</button>
            </div>
          ))}
        </div>
      )}

      {/* ================= PHOTOS ================= */}
      {tab === 'photos' && (
        <div style={{ marginTop: 30 }}>
          {photos.map(p => (
            <div key={p.id} style={{ color: '#FAF6EF' }}>{p.title}</div>
          ))}
        </div>
      )}

    </div>
  );
}