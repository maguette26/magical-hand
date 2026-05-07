import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

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
  const [availableDates, setAvailableDates] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  // Génère 7 jours à partir de l'offset courant
  const visibleDays = Array.from({ length: 7 }, (_, i) =>
    addDays(new Date(), weekOffset * 7 + i + 1)
  );

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'availability'), (snap) => {
      const dates = snap.docs
        .filter(d => d.data().available === true)
        .map(d => new Date(d.data().date));
      setAvailableDates(dates);
    }, () => {});
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const q = query(collection(db, 'bookings'), where('date', '==', dateStr));
    const unsub = onSnapshot(q, (snap) => {
      setBlockedSlots(snap.docs.map(d => d.data().time));
    }, () => {});
    return unsub;
  }, [selectedDate]);

  const isDateAvailable = (date) => availableDates.some(d => isSameDay(d, date));

  const handleWhatsApp = () => {
    const service = SERVICES.find(s => s.id === selectedService);
    const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
    const message = `Bonjour Mamifa !\n\nJe souhaite réserver un rendez-vous chez *Magical Hand by Mamifa* :\n\n✨ *Prestation :* ${service.label} (${service.price})\n📅 *Date :* ${dateStr}\n🕐 *Heure :* ${selectedTime}\n👤 *Nom :* ${name}\n📱 *Téléphone :* ${phone || 'Non précisé'}\n\nJe vous contacterai pour confirmer le paiement via Wave ou Orange Money.\nMerci ! 🙏`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const canProceed = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return selectedDate !== null && selectedTime !== null;
    if (step === 3) return name.trim().length > 2;
    return false;
  };

  return (
    <section
  id="reserver"
  className="booking-section"
>
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
          fontSize: 'clamp(40px, 5vw, 64px)',
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '50px' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  background: step >= s.n
                    ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                    : 'transparent',
                  color: step >= s.n ? '#0A0A0A' : '#8A7968',
                  border: step >= s.n ? 'none' : '1px solid rgba(201,168,76,0.3)',
                  transition: 'all 0.4s',
                }}>
                  {step > s.n ? <Check size={15} strokeWidth={3} /> : s.n}
                </div>
                <span style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: step >= s.n ? '#C9A84C' : '#8A7968',
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
                  maxWidth: '80px',
                  transition: 'all 0.4s',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: '4px',
            padding: '44px',
          }}
        >

          {/* ── STEP 1 : Prestation ── */}
          {step === 1 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '28px',
                color: '#FAF6EF',
                marginBottom: '28px',
              }}>Choisissez votre prestation</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                        padding: '20px 22px',
                        display: 'grid',
                        gridTemplateColumns: '48px 1fr auto',
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.3s',
                      }}
                    >
                      {/* Icon bubble */}
                      <div style={{
                        width: '48px',
                        height: '48px',
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
                        <Icon
                          size={20}
                          strokeWidth={1.5}
                          color={active ? '#0A0A0A' : '#C9A84C'}
                        />
                      </div>

                      {/* Label + description */}
                      <div>
                        <div style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: active ? '#FAF6EF' : '#D4C9B8',
                          marginBottom: '4px',
                          letterSpacing: '0.02em',
                        }}>
                          {s.label}
                        </div>
                        <div style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '12px',
                          color: '#8A7968',
                          lineHeight: 1.4,
                        }}>
                          {s.description}
                        </div>
                      </div>

                      {/* Price */}
                      <div style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        fontSize: '17px',
                        color: active ? '#E8C97A' : '#C9A84C',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}>
                        {s.price}
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
                fontSize: '28px',
                color: '#FAF6EF',
                marginBottom: '6px',
              }}>Choisissez votre date</h3>
              <p style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '12px',
                color: '#8A7968',
                marginBottom: '28px',
                letterSpacing: '0.05em',
              }}>
                Seules les dates dorées sont disponibles
              </p>

              {/* Week navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <button
                  onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                  disabled={weekOffset === 0}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: weekOffset === 0 ? 'not-allowed' : 'pointer',
                    opacity: weekOffset === 0 ? 0.3 : 1,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <ChevronLeft size={16} color="#C9A84C" />
                </button>

                {/* 7-day grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                  flex: 1,
                }}>
                  {visibleDays.map((date) => {
                    const avail = isDateAvailable(date);
                    const sel = selectedDate && isSameDay(date, selectedDate);
                    return (
                      <motion.button
                        key={date.toISOString()}
                        disabled={!avail}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        whileHover={avail ? { scale: 1.06 } : {}}
                        style={{
                          padding: '10px 4px',
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
                          gap: '3px',
                        }}
                      >
                        <span style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '9px',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: sel ? '#0A0A0A' : '#8A7968',
                        }}>
                          {format(date, 'EEE', { locale: fr })}
                        </span>
                        <span style={{
                          fontFamily: 'Cormorant Garamond, serif',
                          fontSize: '22px',
                          color: sel ? '#0A0A0A' : avail ? '#C9A84C' : '#8A7968',
                          lineHeight: 1,
                        }}>
                          {format(date, 'd')}
                        </span>
                        <span style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '9px',
                          color: sel ? '#0A0A0A' : '#8A7968',
                          textTransform: 'uppercase',
                        }}>
                          {format(date, 'MMM', { locale: fr })}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
                  disabled={weekOffset >= 3}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: weekOffset >= 3 ? 'not-allowed' : 'pointer',
                    opacity: weekOffset >= 3 ? 0.3 : 1,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <ChevronRight size={16} color="#C9A84C" />
                </button>
              </div>

              {/* Time slots */}
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
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {TIME_SLOTS.map((t) => {
                      const blocked = blockedSlots.includes(t);
                      const sel = selectedTime === t;
                      return (
                        <motion.button
                          key={t}
                          disabled={blocked}
                          onClick={() => setSelectedTime(t)}
                          whileHover={!blocked ? { scale: 1.06 } : {}}
                          style={{
                            padding: '10px 20px',
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
                </motion.div>
              )}
            </div>
          )}

          {/* ── STEP 3 : Infos ── */}
          {step === 3 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '28px',
                color: '#FAF6EF',
                marginBottom: '28px',
              }}>Vos informations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { label: 'Votre prénom *', value: name, setter: setName, placeholder: 'Ex: Aïssatou', type: 'text', required: true },
                  { label: 'Votre téléphone (optionnel)', value: phone, setter: setPhone, placeholder: 'Ex: 77 000 00 00', type: 'tel', required: false },
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
                fontSize: '28px',
                color: '#FAF6EF',
                marginBottom: '32px',
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
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(201,168,76,0.08)',
                }}>
                  <span style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#8A7968',
                  }}>{r.label}</span>
                  <span style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '18px',
                    color: '#FAF6EF',
                    textAlign: 'right',
                    maxWidth: '60%',
                    textTransform: 'capitalize',
                  }}>{r.value}</span>
                </div>
              ))}

              {/* Payment info */}
              <div style={{
                marginTop: '28px',
                padding: '20px',
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '4px',
                display: 'flex',
                gap: '14px',
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
                  marginTop: '28px',
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
            marginTop: '36px',
            paddingTop: '28px',
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
                  padding: '12px 24px',
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
                  padding: '12px 36px',
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
          #reserver { padding: 80px 20px !important; }
        }
        input::placeholder { color: rgba(138,121,104,0.5); }
      `}</style>
    </section>
  );
}