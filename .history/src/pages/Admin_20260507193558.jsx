import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, storage } from '../firebase.js';
import { signOut } from 'firebase/auth';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORIES = ['Glam', 'Cérémonie', 'Mariage', 'Naturel', 'Autre'];

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
  const [availability, setAvailability] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState('Glam');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();
  const navigate = useNavigate();

  // Firestore listeners
  useEffect(() => {
    const unsubPhotos = onSnapshot(
      query(collection(db, 'photos'), orderBy('createdAt', 'desc')),
      snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubAvail = onSnapshot(collection(db, 'availability'), snap =>
      setAvailability(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}
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
  const next60Days = Array.from({ length: 60 }, (_, i) => addDays(new Date(), i + 1));

  const getAvailDoc = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availability.find(a => a.date === dateStr);
  };

  const toggleDate = async (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = availability.find(a => a.date === dateStr);
    if (existing) {
      await deleteDoc(doc(db, 'availability', existing.id));
    } else {
      await addDoc(collection(db, 'availability'), {
        date: dateStr,
        available: true,
        createdAt: serverTimestamp(),
      });
    }
  };

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
            { label: 'Dates disponibles', value: availability.length, color: '#E8C97A' },
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
                Cliquez sur une date pour l'activer (dorée = disponible). Les clientes pourront réserver sur ces dates.
              </p>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
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

                {/* Empty cells for alignment */}
                {Array.from({ length: (new Date(next60Days[0]).getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`e${i}`} />
                ))}

                {next60Days.map((date) => {
                  const avail = getAvailDoc(date);
                  return (
                    <motion.button
                      key={date.toISOString()}
                      onClick={() => toggleDate(date)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        aspectRatio: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: avail
                          ? 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(232,201,122,0.15))'
                          : 'rgba(255,255,255,0.02)',
                        border: avail
                          ? '1px solid rgba(201,168,76,0.6)'
                          : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        gap: '2px',
                      }}
                    >
                      <span style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        fontSize: '18px',
                        color: avail ? '#C9A84C' : '#FAF6EF',
                        lineHeight: 1,
                        opacity: avail ? 1 : 0.5,
                      }}>{format(date, 'd')}</span>
                      <span style={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '8px',
                        color: avail ? '#E8C97A' : '#8A7968',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>{format(date, 'MMM', { locale: fr })}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '16px', height: '16px', background: 'rgba(201,168,76,0.25)', border: '1px solid rgba(201,168,76,0.6)', borderRadius: '2px' }} />
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968' }}>Disponible</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '16px', height: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }} />
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', color: '#8A7968' }}>Non disponible</span>
                </div>
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
