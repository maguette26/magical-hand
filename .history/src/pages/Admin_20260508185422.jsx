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
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ---------------- CONFIG ---------------- */

const ALL_SLOTS = [
  '08:00','09:00','10:00','11:00',
  '13:00','14:00','15:00','16:00',
  '17:00','18:00','19:00','20:00','21:00'
];

const CATEGORIES = ['Glam', 'Cérémonie', 'Naturel'];

/* ---------------- STYLES ---------------- */

const btnGold = {
  padding: '8px 14px',
  background: 'linear-gradient(135deg,#C9A84C,#E8C97A)',
  border: 'none',
  color: '#0A0A0A',
  cursor: 'pointer'
};

const btnDanger = {
  padding: '8px 14px',
  background: 'rgba(231,76,60,0.1)',
  border: '1px solid #E74C3C',
  color: '#E74C3C',
  cursor: 'pointer'
};

const navBtn = {
  padding: '6px 12px',
  border: '1px solid rgba(201,168,76,0.3)',
  background: 'transparent',
  color: '#C9A84C',
  cursor: 'pointer'
};

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

  /* ---------------- FIRESTORE LISTENERS ---------------- */

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

  const renderCalendarDays = (offset) => {
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

  /* ---------------- SLOT LOGIC ---------------- */

  const toggleSlot = async (date, slot) => {
    const ref = doc(db, 'availability', date);
    const snap = await getDoc(ref);

    let slots = snap.exists() ? snap.data().slots || [] : [];

    if (slots.includes(slot)) {
      slots = slots.filter(s => s !== slot);
    } else {
      slots.push(slot);
    }

    await setDoc(ref, { slots }, { merge: true });
  };

  const toggleAll = async (date) => {
    const ref = doc(db, 'availability', date);
    const snap = await getDoc(ref);

    const current = snap.exists() ? snap.data().slots || [] : [];

    const all = current.length === ALL_SLOTS.length ? [] : ALL_SLOTS;

    await setDoc(ref, { slots: all }, { merge: true });
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
    <div style={{ background: '#0A0A0A', minHeight: '100vh', color: '#fff', padding: 30 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ color: '#C9A84C' }}>Admin Dashboard</h2>
        <button onClick={logout} style={btnGold}>Logout</button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {['disponibilites','photos','reservations'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...navBtn, borderColor: tab === t ? '#C9A84C' : '#333' }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---------------- CALENDAR ---------------- */}
      {tab === 'disponibilites' && (
        <div style={{ marginTop: 30 }}>

          {/* NAV MONTH */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setCalOffset(calOffset - 1)} style={navBtn}>←</button>
            <div style={{ color: '#C9A84C' }}>
              {format(new Date().setMonth(new Date().getMonth() + calOffset), 'MMMM yyyy', { locale: fr })}
            </div>
            <button onClick={() => setCalOffset(calOffset + 1)} style={navBtn}>→</button>
          </div>

          {/* GRID CALENDAR */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
            marginTop: 20
          }}>
            {renderCalendarDays(calOffset).map((date, i) => {

              if (!date) return <div key={i}></div>;

              const dateStr = format(date, 'yyyy-MM-dd');
              const slots = getSlotsForDate(dateStr);
              const booked = getBookedSlots(dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => setEditingDate(dateStr)}
                  style={{
                    padding: 10,
                    border: '1px solid #333',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: slots.length ? 'rgba(201,168,76,0.1)' : '#111'
                  }}
                >
                  <div>{format(date, 'd')}</div>
                  <small style={{ color: '#999' }}>
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
                  marginTop: 30,
                  padding: 20,
                  border: '1px solid #333'
                }}
              >
                <h3>{editingDate}</h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
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
                          padding: 8,
                          borderRadius: 4,
                          border: '1px solid #444',
                          background: isBooked
                            ? '#500'
                            : active
                              ? '#C9A84C'
                              : '#222',
                          color: '#fff'
                        }}
                      >
                        {slot} {isBooked && '🔒'}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
                  <button onClick={() => toggleAll(editingDate)} style={btnGold}>
                    Toggle jour
                  </button>
                  <button onClick={() => clearDay(editingDate)} style={btnDanger}>
                    Vider
                  </button>
                  <button onClick={() => setEditingDate(null)} style={navBtn}>
                    Fermer
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* ---------------- BOOKINGS ---------------- */}
      {tab === 'reservations' && (
        <div style={{ marginTop: 30 }}>
          {bookings.map(b => (
            <div key={b.id} style={{ padding: 10, borderBottom: '1px solid #333' }}>
              <div>{b.name} - {b.date} {b.time}</div>
              <button onClick={() => updateStatus(b.id,'confirmed')} style={btnGold}>OK</button>
              <button onClick={() => updateStatus(b.id,'cancelled')} style={btnDanger}>X</button>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- PHOTOS (simplifié conservé) ---------------- */}
      {tab === 'photos' && (
        <div style={{ marginTop: 30 }}>
          {photos.map(p => (
            <div key={p.id}>{p.title}</div>
          ))}
        </div>
      )}

    </div>
  );
}