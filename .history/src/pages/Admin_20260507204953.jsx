import React, { useState, useEffect } from ‘react’;
import { motion, AnimatePresence } from ‘framer-motion’;
import { db } from ‘../firebase.js’;
import { collection, onSnapshot, query, where } from ‘firebase/firestore’;
import { format, addDays, isSameDay } from ‘date-fns’;
import { fr } from ‘date-fns/locale’;
import { Sparkles, Camera, Crown, Clock, ChevronLeft, ChevronRight, MessageCircle, CreditCard, Check, Wand2 } from ‘lucide-react’;

const WHATSAPP_NUMBER = ‘221776695790’;

const SERVICES = [
{
id: 1,
label: ‘Maquillage Simple’,
price: ‘7 000 FCFA’,
description: ‘Look naturel et soigné, idéal pour le quotidien’,
Icon: Wand2,
},
{
id: 2,
label: ‘Maquillage Complet Glam’,
price: ‘10 000 FCFA’,
description: ‘Look complet, longue tenue, éclat assuré’,
Icon: Sparkles,
},
{
id: 3,
label: ‘Maquillage + Shooting Photo’,
price: ‘15 000 FCFA’,
description: ‘Maquillage pro + séance photo incluse’,
Icon: Camera,
},
{
id: 4,
label: ‘Cérémonie — Henné / Baptême / Mariage’,
price: ‘À partir de 25 000 FCFA’,
description: ‘Look royal garanti · Retouche express disponible en supplément (+5 000 FCFA)’,
Icon: Crown,
},
];

const STEPS = [
{ n: 1, label: ‘Prestation’ },
{ n: 2, label: ‘Date & Heure’ },
{ n: 3, label: ‘Vos infos’ },
{ n: 4, label: ‘Confirmer’ },
];

export default function Booking() {
const [step, setStep] = useState(1);
const [selectedService, setSelectedService] = useState(null);
const [selectedDate, setSelectedDate] = useState(null);
const [selectedTime, setSelectedTime] = useState(null);
const [name, setName] = useState(’’);
const [phone, setPhone] = useState(’’);

// availability: array of { date: ‘yyyy-MM-dd’, slots: [‘08:00’, …] }
const [availability, setAvailability] = useState([]);
// bookings on selected date: array of time strings already taken
const [bookedSlots, setBookedSlots] = useState([]);

const [weekOffset, setWeekOffset] = useState(0);

const visibleDays = Array.from({ length: 7 }, (_, i) =>
addDays(new Date(), weekOffset * 7 + i + 1)
);

// ── Load all availability (slots per day) ──
useEffect(() => {
const unsub = onSnapshot(collection(db, ‘availability’), (snap) => {
setAvailability(
snap.docs.map(d => ({ id: d.id, …d.data() }))
);
}, () => {});
return unsub;
}, []);

// ── Load bookings for selected date ──
useEffect(() => {
if (!selectedDate) { setBookedSlots([]); return; }
const dateStr = format(selectedDate, ‘yyyy-MM-dd’);
const q = query(
collection(db, ‘bookings’),
where(‘date’, ‘==’, dateStr)
);
const unsub = onSnapshot(q, (snap) => {
// Only count non-cancelled bookings as “blocked”
setBookedSlots(
snap.docs
.filter(d => d.data().status !== ‘cancelled’)
.map(d => d.data().time)
);
}, () => {});
return unsub;
}, [selectedDate]);

// ── Helpers ──
const getAvailDoc = (date) => {
const dateStr = format(date, ‘yyyy-MM-dd’);
return availability.find(a => a.date === dateStr);
};

// A day is selectable if it has at least one available slot
const isDateAvailable = (date) => {
const doc = getAvailDoc(date);
return doc && Array.isArray(doc.slots) && doc.slots.length > 0;
};

// Available time slots for the selected date = admin-enabled slots minus already booked
const getAvailableSlots = () => {
if (!selectedDate) return [];
const doc = getAvailDoc(selectedDate);
if (!doc || !Array.isArray(doc.slots)) return [];
return doc.slots.filter(s => !bookedSlots.includes(s));
};

// ── WhatsApp message ──
const handleWhatsApp = () => {
const service = SERVICES.find(s => s.id === selectedService);
const dateStr = format(selectedDate, ‘EEEE d MMMM yyyy’, { locale: fr });
const message =
`MAGICAL HAND BY MAMIFA Studio de Maquillage Professionnel_ NOUVELLE RÉSERVATION Nom:${name} Numéro de téléphone ${phone ? `\n${phone}`: ''} ${service.label} ${service.price} 🗓${dateStr} ${selectedTime} Paiement wave ou Orange  sur ce numéro:+221 77 669 57 90 Votre RDV sera confirmé dès réception du paiement. Merci de votre confiance`;
window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, ‘_blank’);
};

const canProceed = () => {
if (step === 1) return selectedService !== null;
if (step === 2) return selectedDate !== null && selectedTime !== null;
if (step === 3) return name.trim().length > 2;
return false;
};

const availableSlots = getAvailableSlots();

return (
<section id="reserver" className="booking-section">

```
  {/* ── Header ── */}
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

    {/* ── Progress steps ── */}
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

    {/* ── Step card ── */}
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
                      width: '40px', height: '40px',
                      borderRadius: '50%',
                      background: active
                        ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                        : 'rgba(201,168,76,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#8A7968', lineHeight: 1.4, flex: 1 }}>
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
            Les dates dorées ont des créneaux disponibles
          </p>

          {/* Week navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}>
            <button
              onClick={() => { setWeekOffset(Math.max(0, weekOffset - 1)); setSelectedDate(null); setSelectedTime(null); }}
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
              onClick={() => { setWeekOffset(Math.min(7, weekOffset + 1)); setSelectedDate(null); setSelectedTime(null); }}
              disabled={weekOffset >= 7}
              style={{
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '50%',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: weekOffset >= 7 ? 'not-allowed' : 'pointer',
                opacity: weekOffset >= 7 ? 0.3 : 1,
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
                </motion.button>
              );
            })}
          </div>

          {/* Time slots — only those enabled by admin AND not yet booked */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: '28px' }}
            >
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

              {availableSlots.length === 0 ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  color: '#8A7968',
                  border: '1px dashed rgba(201,168,76,0.2)',
                  borderRadius: '4px',
                }}>
                  Tous les créneaux de cette journée sont complets.
                  <br />
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>Choisissez une autre date.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {availableSlots.map((t) => {
                    const sel = selectedTime === t;
                    return (
                      <motion.button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        whileHover={{ scale: 1.06 }}
                        style={{
                          padding: '9px 16px',
                          background: sel
                            ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                            : 'transparent',
                          border: sel
                            ? '1px solid #C9A84C'
                            : '1px solid rgba(201,168,76,0.3)',
                          borderRadius: '4px',
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '13px',
                          color: sel ? '#0A0A0A' : '#FAF6EF',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
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

      {/* ── Navigation ── */}
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
```)

);
}