import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, storage } from '../firebase.js';
import { signOut } from 'firebase/auth';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, updateDoc, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

const CATEGORIES = ['Glam', 'Cérémonie', 'Naturel'];
const ALL_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00',];

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

export default function Admin() {
  const [tab, setTab] = useState('disponibilites');
  const [photos, setPhotos] = useState([]);
  // availability: { [dateStr]: { slots: string[], bookedSlots: string[] } }
  const [availability, setAvailability] = useState({});
  const [bookings, setBookings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState('Glam');
  const [selectedFile, setSelectedFile] = useState(null);
  // Calendar navigation
  const [calOffset, setCalOffset] = useState(0); // week offset
  // Selected day for slot editing
  const [editingDate, setEditingDate] = useState(null);
  const fileRef = useRef();
  const navigate = useNavigate();

  const next28Days = Array.from({ length: 28 }, (_, i) => addDays(new Date(), i + 1));
  const visibleWeek = Array.from({ length: 7 }, (_, i) => addDays(new Date(), calOffset * 7 + i + 1));

  // Firestore listeners
  useEffect(() => {
    const unsubPhotos = onSnapshot(
      query(collection(db, 'photos'), orderBy('createdAt', 'desc')),
      snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    // Listen to availability collection: each doc id = dateStr, fields: slots[]
    const unsubAvail = onSnapshot(collection(db, 'availability'), snap => {
      const map = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data(); // { slots: [...], ... }
      });
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

  // ---- PHOTOS ----
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

  // ---- AVAILABILITY ----
  // Get slots configured for a date
  const getSlotsForDate = (dateStr) => availability[dateStr]?.slots || [];

  // Get booked slots for a date (from bookings collection)
  const getBookedSlotsForDate = (dateStr) =>
    bookings.filter(b => b.date === dateStr && b.status !== 'cancelled').map(b => b.time);

  // Toggle a specific slot for a date
  const toggleSlot = async (dateStr, slot) => {
    const current = getSlotsForDate(dateStr);
    let updated;
    if (current.includes(slot)) {
      updated = current.filter(s => s !== slot);
    } else {
      updated = [...current, slot].sort();
    }
    if (updated.length === 0) {
      // Remove the doc entirely if no slots remain
      await deleteDoc(doc(db, 'availability', dateStr)).catch(() => {});
    } else {
      await setDoc(doc(db, 'availability', dateStr), {
        slots: updated,
        updatedAt: serverTimestamp(),
      });
    }
  };

  // Toggle all slots for a date
  const toggleAllSlots = async (dateStr) => {
    const current = getSlotsForDate(dateStr);
    if (current.length === ALL_SLOTS.length) {
      // Remove all
      await deleteDoc(doc(db, 'availability', dateStr)).catch(() => {});
    } else {
      await setDoc(doc(db, 'availability', dateStr), {
        slots: [...ALL_SLOTS],
        updatedAt: serverTimestamp(),
      });
    }
  };

  // Count total available slots across all dates
  const totalAvailableSlots = Object.values(availability).reduce((acc, d) => acc + (d.slots?.length || 0), 0);
  const totalAvailableDays = Object.keys(availability).length;

  // ---- BOOKINGS ----
  const updateBookingStatus = async (id, status) => {
    await updateDoc(doc(db, 'bookings', id), { status });
    toast.success(`RDV marqué: ${status}`);
  };

  const STATUS_COLOR = {
    pending: '#C9A84C',
    confirmed: '#25D366',
    cancelled: '#E74C3C',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
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
        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[
            { label: 'Photos publiées', value: photos.length, color: '#C9A84C' },
            { label: 'Créneaux ouverts', value: totalAvailableSlots, sub: `${totalAvailableDays} jour${totalAvailableDays > 1 ? 's' : ''}`, color: '#E8C97A' },
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
                marginBottom: '4px',
              }}>{stat.value}</div>
              {stat.sub && (
                <div style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '10px',
                  color: stat.color,
                  opacity: 0.6,
                  marginBottom: '4px',
                }}>{stat.sub}</div>
              )}
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { id: 'disponibilites', label: 'Disponibilités' },
            { id: 'photos', label: 'Galerie Photos' },
            { id: 'reservations', label: 'Réservations' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={TAB_STYLE(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ===== DISPONIBILITÉS ===== */}
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
                Cliquez sur un jour pour sélectionner les créneaux horaires disponibles. Les créneaux dorés sont ouverts à la réservation.
              </p>

              {/* Week navigation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <button
                  onClick={() => setCalOffset(Math.max(0, calOffset - 1))}
                  disabled={calOffset === 0}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: '50%',
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: calOffset === 0 ? 'not-allowed' : 'pointer',
                    opacity: calOffset === 0 ? 0.3 : 1,
                  }}
                >
                  <ChevronLeft size={15} color="#C9A84C" />
                </button>
                <span style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '11px',
                  color: '#8A7968',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  {format(visibleWeek[0], 'd MMM', { locale: fr })} — {format(visibleWeek[6], 'd MMM yyyy', { locale: fr })}
                </span>
                <button
                  onClick={() => setCalOffset(Math.min(3, calOffset + 1))}
                  disabled={calOffset >= 3}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: '50%',
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: calOffset >= 3 ? 'not-allowed' : 'pointer',
                    opacity: calOffset >= 3 ? 0.3 : 1,
                  }}
                >
                  <ChevronRight size={15} color="#C9A84C" />
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <div key={d} style={{
                    textAlign: 'center',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#8A7968',
                    padding: '8px',
                  }}>{d}</div>
                ))}
              </div>

              {/* 7-day row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '32px' }}>
                {visibleWeek.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const slots = getSlotsForDate(dateStr);
                  const booked = getBookedSlotsForDate(dateStr);
                  const isEditing = editingDate === dateStr;
                  const hasSlots = slots.length > 0;

                  return (
                    <motion.button
                      key={dateStr}
                      onClick={() => setEditingDate(isEditing ? null : dateStr)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        aspectRatio: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isEditing
                          ? 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(232,201,122,0.18))'
                          : hasSlots
                            ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,122,0.08))'
                            : 'rgba(255,255,255,0.02)',
                        border: isEditing
                          ? '1px solid rgba(201,168,76,0.9)'
                          : hasSlots
                            ? '1px solid rgba(201,168,76,0.5)'
                            : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        gap: '2px',
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        fontSize: '20px',
                        color: hasSlots ? '#C9A84C' : '#FAF6EF',
                        lineHeight: 1,
                        opacity: hasSlots ? 1 : 0.4,
                      }}>{format(date, 'd')}</span>
                      <span style={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '8px',
                        color: hasSlots ? '#E8C97A' : '#8A7968',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>{format(date, 'MMM', { locale: fr })}</span>
                      {hasSlots && (
                        <span style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '8px',
                          color: '#C9A84C',
                          opacity: 0.8,
                        }}>
                          {slots.length - booked.filter(b => slots.includes(b)).length}/{slots.length}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Slot editor panel */}
              <AnimatePresence>
                {editingDate && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: '6px',
                      padding: '24px 28px',
                      marginBottom: '24px',
                    }}
                  >
                    {/* Panel header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={15} color="#C9A84C" />
                        <span style={{
                          fontFamily: 'Cormorant Garamond, serif',
                          fontSize: '20px',
                          color: '#FAF6EF',
                        }}>
                          {format(new Date(editingDate + 'T12:00:00'), 'EEEE d MMMM', { locale: fr })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                          onClick={() => toggleAllSlots(editingDate)}
                          style={{
                            padding: '6px 14px',
                            background: 'transparent',
                            border: '1px solid rgba(201,168,76,0.3)',
                            color: '#C9A84C',
                            borderRadius: '2px',
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '10px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          {getSlotsForDate(editingDate).length === ALL_SLOTS.length ? 'Tout désactiver' : 'Tout activer'}
                        </button>
                        <button
                          onClick={() => setEditingDate(null)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={16} color="#8A7968" />
                        </button>
                      </div>
                    </div>

                    {/* Slot grid */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {ALL_SLOTS.map((slot) => {
                        const isActive = getSlotsForDate(editingDate).includes(slot);
                        const isBooked = getBookedSlotsForDate(editingDate).includes(slot);

                        return (
                          <motion.button
                            key={slot}
                            onClick={() => !isBooked && toggleSlot(editingDate, slot)}
                            whileHover={!isBooked ? { scale: 1.08 } : {}}
                            whileTap={!isBooked ? { scale: 0.95 } : {}}
                            disabled={isBooked}
                            style={{
                              padding: '10px 18px',
                              background: isBooked
                                ? 'rgba(231,76,60,0.1)'
                                : isActive
                                  ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                                  : 'rgba(255,255,255,0.03)',
                              border: isBooked
                                ? '1px solid rgba(231,76,60,0.35)'
                                : isActive
                                  ? '1px solid #C9A84C'
                                  : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '4px',
                              fontFamily: 'Jost, sans-serif',
                              fontSize: '13px',
                              color: isBooked
                                ? '#E74C3C'
                                : isActive
                                  ? '#0A0A0A'
                                  : '#8A7968',
                              cursor: isBooked ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              fontWeight: isActive ? 600 : 400,
                              position: 'relative',
                              opacity: isBooked ? 0.7 : 1,
                            }}
                          >
                            {slot}
                            {isBooked && (
                              <span style={{
                                marginLeft: '6px',
                                fontSize: '9px',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                opacity: 0.8,
                              }}>
                                réservé
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    <p style={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '11px',
                      color: '#8A7968',
                      marginTop: '16px',
                      opacity: 0.7,
                    }}>
                      Les créneaux en rouge sont déjà réservés et ne peuvent pas être désactivés.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                  { color: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.5)', label: 'Jour avec créneaux' },
                  { color: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.05)', label: 'Jour fermé' },
                  { color: 'linear-gradient(135deg, #C9A84C, #E8C97A)', border: '#C9A84C', label: 'Créneau ouvert' },
                  { color: 'rgba(231,76,60,0.1)', border: 'rgba(231,76,60,0.35)', label: 'Créneau réservé' },
                ].map(({ color, border, label }) => (
                  <div key={label} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      background: color,
                      border: `1px solid ${border}`,
                      borderRadius: '3px',
                    }} />
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
            {/* Upload form */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                <div>
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
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1A1714' }}>{c}</option>)}
                  </select>
                </div>
                <div />
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  border: '2px dashed rgba(201,168,76,0.25)',
                  borderRadius: '4px',
                  padding: '20px 30px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'center',
                }}
                  onClick={() => fileRef.current?.click()}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => setSelectedFile(e.target.files[0])}
                  />
                  <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968' }}>
                    {selectedFile ? (
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
                    background: uploading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #C9A84C, #E8C97A)',
                    color: uploading ? '#8A7968' : '#0A0A0A',
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

            {/* Photos grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              <AnimatePresence>
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
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: '#FAF6EF' }}>
                        {photo.title}
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
              <div style={{ textAlign: 'center', padding: '60px', color: '#8A7968', fontFamily: 'Jost, sans-serif' }}>
                Aucune photo publiée. Ajoutez votre première photo ci-dessus.
              </div>
            )}
          </motion.div>
        )}

        {/* ===== RÉSERVATIONS ===== */}
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
                Les réservations envoyées via WhatsApp apparaissent ici (si vous les enregistrez manuellement via Firebase).
              </p>

              {bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#8A7968', fontFamily: 'Jost, sans-serif' }}>
                  Aucune réservation pour le moment.
                  <br />
                  <span style={{ fontSize: '12px', opacity: 0.6 }}>
                    Les clientes vous contactent via WhatsApp. Vous pouvez ajouter des RDV manuellement dans Firebase.
                  </span>
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
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#FAF6EF' }}>
                          {b.name}
                        </div>
                        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968' }}>
                          {b.phone}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', color: '#FAF6EF' }}>
                          {b.service}
                        </div>
                        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C' }}>
                          {b.date} à {b.time}
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