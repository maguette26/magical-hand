import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { format, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sparkles, Camera, Crown, Clock, ChevronLeft, ChevronRight, MessageCircle, CreditCard, Check, Wand2 } from 'lucide-react';

const WHATSAPP_NUMBER = '221776695790';

const SERVICES = [
  {
    id: 1,
    label: 'Maquillage Simple',
    price: '7 000 FCFA',
    description: 'Look naturel et soigné, idéal pour le quotidien',
    Icon: Wand2,
  },
  {
    id: 2,
    label: 'Maquillage Complet Glam',
    price: '10 000 FCFA',
    description: 'Look complet, longue tenue, éclat assuré',
    Icon: Sparkles,
  },
  {
    id: 3,
    label: 'Maquillage + Shooting Photo',
    price: '15 000 FCFA',
    description: 'Maquillage pro + séance photo incluse',
    Icon: Camera,
  },
  {
    id: 4,
    label: 'Cérémonie — Henné / Baptême / Mariage',
    price: 'À partir de 25 000 FCFA',
    description: 'Look royal garanti · Retouche express disponible en supplément (+5 000 FCFA)',
    Icon: Crown,
  },
];

const STEPS = [
  { n: 1, label: 'Prestation' },
  { n: 2, label: 'Date & Heure' },
  { n: 3, label: 'Vos infos' },
  { n: 4, label: 'Confirmer' },
];

export default function Booking() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  // availability: { [dateStr]: string[] }  →  map of date → open slots
  const [availability, setAvailability] = useState({});
  // bookedSlots for selected date
  const [bookedSlots, setBookedSlots] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const visibleDays = Array.from({ length: 7 }, (_, i) =>
    addDays(new Date(), weekOffset * 7 + i + 1)
  );

  // Listen to availability collection (real-time)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'availability'), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        // Only include dates that have at least one slot
        if (d.data().slots && d.data().slots.length > 0) {
          map[d.id] = d.data().slots;
        }
      });
      setAvailability(map);
    }, () => {});
    return unsub;
  }, []);

  // Listen to bookings for the selected date (real-time)
  useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([]);
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const q = query(
      collection(db, 'bookings'),
      where('date', '==', dateStr),
    );
    const unsub = onSnapshot(q, (snap) => {
      // Only count active bookings (not cancelled)
      setBookedSlots(
        snap.docs
          .filter(d => d.data().status !== 'cancelled')
          .map(d => d.data().time)
      );
    }, () => {});
    return unsub;
  }, [selectedDate]);

  const isDateAvailable = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !!availability[dateStr] && availability[dateStr].length > 0;
  };

  // Get available (open AND not booked) slots for selected date
  const getAvailableSlots = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return availability[dateStr] || [];
  };

  const isSlotBooked = (slot) => bookedSlots.includes(slot);

  const handleWhatsApp = () => {
    const service = SERVICES.find(s => s.id === selectedService);
    const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
    const message = 
`✨ *MAGICAL HAND BY MAMIFA* ✨
💄 _Nouvelle réservation cliente_

━━━━━━━━━━━━━━━━━━━

👤 *CLIENTE*
• Nom : ${name}
${phone ? `• Téléphone : ${phone}\n` : ''}
💋 PRESTATION CHOISIE
• ${service.label}
• Tarif : ${service.price}
📅 RENDEZ-VOUS
• Date : ${dateStr}
• Heure : ${selectedTime}
━━━━━━━━━━━━━━━━━━━
💳 *PAIEMENT EN ATTENTE*
La cliente doit effectuer le paiement via :
• Wave
• Orange Money
📱 Numéro de paiement :
+221 77 669 57 90
━━━━━━━━━━━━━━━━━━━
⚠️ *Action requise :*
Confirmer le rendez-vous après réception du paiement.

Merci,
_Magical Hand by Mamifa_`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const canProceed = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return selectedDate !== null && selectedTime !== null;
    if (step === 3) return name.trim().length > 2;
    return false;
  };

  const openSlots = getAvailableSlots();

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
        <p style={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '11px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#C9A84C',
          marginBottom: '16px',
        }}>Réservation</p>
        <h2 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: 400,
          color: '#FAF6EF',
          marginBottom: '16px',
        }}>
          Prendre Rendez-Vous
        </h2>
        <div style={{
          width: '40px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
          margin: '0 auto 24px',
        }} />
        <p style={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '14px',
          color: '#8A7968',
          maxWidth: '400px',
          margin: '0 auto',
        }}>
          Choisissez votre prestation, votre date et envoyez votre demande directement sur WhatsApp.
        </p>
      </motion.div>

      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '15px',
                  fontWeight: 600,
                  background: step >= s.n
                    ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                    : 'transparent',
                  color: step >= s.n ? '#0A0A0A' : '#8A7968',
                  border: step >= s.n ? 'none' : '1px solid rgba(201,168,76,0.3)',
                  transition: 'all 0.4s',
                  flexShrink: 0,
                }}>
                  {step > s.n ? <Check size={13} strokeWidth={3} /> : s.n}
                </div>
                <span style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: step >= s.n ? '#C9A84C' : '#8A7968',
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>
              {i < 3 && (
                <div style={{
                  flex: 1,
                  height: '1px',
                  background: step > s.n
                    ? 'linear-gradient(90deg, #C9A84C, rgba(201,168,76,0.4))'
                    : 'rgba(201,168,76,0.15)',
                  marginBottom: '24px',
                  maxWidth: '60px',
                  transition: 'all 0.4s',
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

          {/* ── STEP 1 : Prestation ── */}
          {step === 1 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(22px, 4vw, 28px)',
                color: '#FAF6EF',
                marginBottom: '24px',
              }}>Choisissez votre prestation</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {SERVICES.map((s) => {
                  const active = selectedService === s.id;
                  const { Icon } = s;
                  return (
                    <motion.button
                      key={s.id}
                      onClick={() => setSelectedService(s.id)}
                      whileHover={{ x: 4 }}
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,122,0.07))'
                          : 'rgba(255,255,255,0.02)',
                        border: active
                          ? '1px solid rgba(201,168,76,0.65)'
                          : '1px solid rgba(201,168,76,0.12)',
                        borderRadius: '6px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.3s',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: active
                            ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                            : 'rgba(201,168,76,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.3s',
                        }}>
                          <Icon size={18} strokeWidth={1.5} color={active ? '#0A0A0A' : '#C9A84C'} />
                        </div>
                        <div style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: active ? '#FAF6EF' : '#D4C9B8',
                          letterSpacing: '0.02em',
                          flex: 1,
                        }}>
                          {s.label}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px', paddingLeft: '52px' }}>
                        <div style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '11px',
                          color: '#8A7968',
                          lineHeight: 1.4,
                          flex: 1,
                        }}>
                          {s.description}
                        </div>
                        <div style={{
                          fontFamily: 'Cormorant Garamond, serif',
                          fontSize: '15px',
                          color: active ? '#E8C97A' : '#C9A84C',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                          flexShrink: 0,
                        }}>
                          {s.price}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2 : Date & Heure ── */}
          {step === 2 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(22px, 4vw, 28px)',
                color: '#FAF6EF',
                marginBottom: '6px',
              }}>Choisissez votre date</h3>
              <p style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '12px',
                color: '#8A7968',
                marginBottom: '24px',
                letterSpacing: '0.05em',
              }}>
                Seules les dates dorées sont disponibles
              </p>

              {/* Week navigation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}>
                <button
                  onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                  disabled={weekOffset === 0}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: '50%',
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: weekOffset === 0 ? 'not-allowed' : 'pointer',
                    opacity: weekOffset === 0 ? 0.3 : 1,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <ChevronLeft size={15} color="#C9A84C" />
                </button>

                <span style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '11px',
                  color: '#8A7968',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {format(visibleDays[0], 'd MMM', { locale: fr })} — {format(visibleDays[6], 'd MMM yyyy', { locale: fr })}
                </span>

                <button
                  onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
                  disabled={weekOffset >= 3}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: '50%',
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: weekOffset >= 3 ? 'not-allowed' : 'pointer',
                    opacity: weekOffset >= 3 ? 0.3 : 1,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={15} color="#C9A84C" />
                </button>
              </div>

              {/* 7-day grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '5px',
              }}>
                {visibleDays.map((date) => {
                  const avail = isDateAvailable(date);
                  const sel = selectedDate && isSameDay(date, selectedDate);
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const daySlots = availability[dateStr] || [];
                  // Count remaining free slots for this day
                  const freeCount = daySlots.filter(s => !bookedSlots.includes(s) || !isSameDay(date, selectedDate)).length;

                  return (
                    <motion.button
                      key={date.toISOString()}
                      disabled={!avail}
                      onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                      whileHover={avail ? { scale: 1.06 } : {}}
                      style={{
                        padding: '8px 2px',
                        background: sel
                          ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                          : avail
                            ? 'rgba(201,168,76,0.08)'
                            : 'rgba(255,255,255,0.02)',
                        border: sel
                          ? '1px solid #C9A84C'
                          : avail
                            ? '1px solid rgba(201,168,76,0.4)'
                            : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        cursor: avail ? 'pointer' : 'not-allowed',
                        opacity: avail ? 1 : 0.3,
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        minWidth: 0,
                      }}
                    >
                      <span style={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '8px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: sel ? '#0A0A0A' : '#8A7968',
                      }}>
                        {format(date, 'EEE', { locale: fr })}
                      </span>
                      <span style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        fontSize: 'clamp(16px, 3.5vw, 22px)',
                        color: sel ? '#0A0A0A' : avail ? '#C9A84C' : '#8A7968',
                        lineHeight: 1,
                      }}>
                        {format(date, 'd')}
                      </span>
                      <span style={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '8px',
                        color: sel ? '#0A0A0A' : '#8A7968',
                        textTransform: 'uppercase',
                      }}>
                        {format(date, 'MMM', { locale: fr })}
                      </span>
                      {avail && (
                        <span style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '7px',
                          color: sel ? '#0A0A0A' : '#C9A84C',
                          opacity: 0.75,
                        }}>
                          {daySlots.length} cr.
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Time slots — only slots opened by admin */}
              {selectedDate && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '28px' }}>
                  <p style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '11px',
                    color: '#8A7968',
                    marginBottom: '14px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Clock size={13} color="#C9A84C" />
                    Créneaux disponibles
                  </p>

                  {openSlots.length === 0 ? (
                    <p style={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '13px',
                      color: '#8A7968',
                      fontStyle: 'italic',
                    }}>
                      Aucun créneau disponible pour cette date.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {openSlots.map((t) => {
                        const blocked = isSlotBooked(t);
                        const sel = selectedTime === t;
                        return (
                          <motion.button
                            key={t}
                            disabled={blocked}
                            onClick={() => setSelectedTime(t)}
                            whileHover={!blocked ? { scale: 1.06 } : {}}
                            style={{
                              padding: '9px 14px',
                              background: sel
                                ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                                : 'transparent',
                              border: sel
                                ? '1px solid #C9A84C'
                                : blocked
                                  ? '1px solid rgba(255,255,255,0.05)'
                                  : '1px solid rgba(201,168,76,0.3)',
                              borderRadius: '4px',
                              fontFamily: 'Jost, sans-serif',
                              fontSize: '13px',
                              color: sel ? '#0A0A0A' : blocked ? '#3A3A3A' : '#FAF6EF',
                              cursor: blocked ? 'not-allowed' : 'pointer',
                              opacity: blocked ? 0.3 : 1,
                              transition: 'all 0.2s',
                              textDecoration: blocked ? 'line-through' : 'none',
                            }}
                          >
                            {t}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* ── STEP 3 : Infos ── */}
          {step === 3 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(22px, 4vw, 28px)',
                color: '#FAF6EF',
                marginBottom: '28px',
              }}>Vos informations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { label: 'Votre prénom *', value: name, setter: setName, placeholder: 'Ex: Aïssatou', type: 'text' },
                  { label: 'Votre téléphone (optionnel)', value: phone, setter: setPhone, placeholder: 'Ex: 77 000 00 00', type: 'tel' },
                ].map((field) => (
                  <div key={field.label}>
                    <label style={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '11px',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: '#8A7968',
                      display: 'block',
                      marginBottom: '8px',
                    }}>
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={e => field.setter(e.target.value)}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(201,168,76,0.25)',
                        borderRadius: '2px',
                        color: '#FAF6EF',
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border 0.3s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = '#C9A84C'}
                      onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4 : Récapitulatif ── */}
          {step === 4 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 'clamp(22px, 4vw, 28px)',
                color: '#FAF6EF',
                marginBottom: '28px',
              }}>Récapitulatif</h3>

              {[
                { label: 'Prestation', value: SERVICES.find(s => s.id === selectedService)?.label },
                { label: 'Tarif', value: SERVICES.find(s => s.id === selectedService)?.price },
                { label: 'Date', value: selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr }) : '' },
                { label: 'Heure', value: selectedTime },
                { label: 'Prénom', value: name },
                phone ? { label: 'Téléphone', value: phone } : null,
              ].filter(Boolean).map((r) => (
                <div key={r.label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(201,168,76,0.08)',
                }}>
                  <span style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#8A7968',
                    flexShrink: 0,
                    paddingTop: '3px',
                  }}>{r.label}</span>
                  <span style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '17px',
                    color: '#FAF6EF',
                    textAlign: 'right',
                    textTransform: 'capitalize',
                  }}>{r.value}</span>
                </div>
              ))}

              {/* Payment info */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '4px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}>
                <CreditCard size={18} color="#C9A84C" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <p style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '11px',
                    color: '#C9A84C',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}>Paiement</p>
                  <p style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '13px',
                    color: '#8A7968',
                    lineHeight: 1.7,
                    margin: 0,
                  }}>
                    Paiement par <strong style={{ color: '#FAF6EF' }}>Wave</strong> ou{' '}
                    <strong style={{ color: '#FAF6EF' }}>Orange Money</strong> au{' '}
                    <strong style={{ color: '#C9A84C' }}>+221 77 669 57 90</strong>.
                    Le RDV sera confirmé après réception du paiement.
                  </p>
                </div>
              </div>

              <motion.button
                onClick={handleWhatsApp}
                whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(37,211,102,0.4)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '18px',
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                <MessageCircle size={20} />
                Envoyer sur WhatsApp
              </motion.button>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(201,168,76,0.1)',
          }}>
            {step > 1 ? (
              <motion.button
                onClick={() => setStep(step - 1)}
                whileHover={{ x: -4 }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.25)',
                  color: '#8A7968',
                  padding: '12px 20px',
                  borderRadius: '2px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s',
                }}
              >
                <ChevronLeft size={14} />
                Retour
              </motion.button>
            ) : <div />}

            {step < 4 && (
              <motion.button
                onClick={() => canProceed() && setStep(step + 1)}
                whileHover={canProceed() ? { scale: 1.04, boxShadow: '0 4px 20px rgba(201,168,76,0.4)' } : {}}
                style={{
                  background: canProceed()
                    ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                    : 'rgba(255,255,255,0.05)',
                  color: canProceed() ? '#0A0A0A' : '#8A7968',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '2px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s',
                }}
              >
                Suivant
                <ChevronRight size={14} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #reserver { padding: 60px 16px !important; }
        }
        @media (max-width: 480px) {
          #reserver { padding: 50px 12px !important; }
        }
        input::placeholder { color: rgba(138,121,104,0.5); }
        * { box-sizing: border-box; }
      `}</style>
    </section>
  );
}