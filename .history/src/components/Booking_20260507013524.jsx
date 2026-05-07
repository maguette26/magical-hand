import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { format, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const WHATSAPP_NUMBER = '221776695790';

const SERVICES = [
  { id: 1, label: 'Retouche Express', price: 'À partir de 5 000 FCFA', emoji: '✨' },
  { id: 2, label: 'Maquillage Complet Glam', price: '10 000 FCFA', emoji: '💄' },
  { id: 3, label: 'Maquillage + Shooting Photo', price: '15 000 FCFA', emoji: '📸' },
  { id: 4, label: 'Cérémonie (Henné / Baptême / Mariage)', price: 'À partir de 25 000 FCFA', emoji: '👑' },
];

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

export default function Booking() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);

  // Générer les 30 prochains jours
  const next30Days = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i + 1));

  useEffect(() => {
    // Charger disponibilités depuis Firebase
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
    // Charger créneaux déjà réservés
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const q = query(collection(db, 'bookings'), where('date', '==', dateStr));
    const unsub = onSnapshot(q, (snap) => {
      setBlockedSlots(snap.docs.map(d => d.data().time));
    }, () => {});
    return unsub;
  }, [selectedDate]);

  const isDateAvailable = (date) => {
    return availableDates.some(d => isSameDay(d, date));
  };

  const handleWhatsApp = () => {
    const service = SERVICES.find(s => s.id === selectedService);
    const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
    const message = `Bonjour Mamifa ! 💄

Je souhaite réserver un rendez-vous chez *Magical Hand by Mamifa* :

✨ *Prestation :* ${service.label} (${service.price})
📅 *Date :* ${dateStr}
🕐 *Heure :* ${selectedTime}
👤 *Nom :* ${name}
📱 *Téléphone :* ${phone || 'Non précisé'}

Je vous contacterai pour confirmer le paiement via Wave ou Orange Money.
Merci ! 🙏`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const canProceed = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return selectedDate !== null && selectedTime !== null;
    if (step === 3) return name.trim().length > 2;
    return false;
  };

  return (
    <section id="reserver" style={{
      padding: '120px 60px',
      background: 'linear-gradient(180deg, #0A0A0A 0%, #1A1714 100%)',
    }}>
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

      {/* Stepper */}
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '50px', gap: '0' }}>
          {[
            { n: 1, label: 'Prestation' },
            { n: 2, label: 'Date & Heure' },
            { n: 3, label: 'Vos infos' },
            { n: 4, label: 'Confirmer' },
          ].map((s, i) => (
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
                  background: step > s.n
                    ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                    : step === s.n
                      ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                      : 'transparent',
                  color: step >= s.n ? '#0A0A0A' : '#8A7968',
                  border: step >= s.n ? 'none' : '1px solid rgba(201,168,76,0.3)',
                  transition: 'all 0.4s',
                }}>
                  {step > s.n ? '✓' : s.n}
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
          {/* STEP 1: Choose service */}
          {step === 1 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '28px',
                color: '#FAF6EF',
                marginBottom: '28px',
              }}>Choisissez votre prestation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {SERVICES.map((s) => (
                  <motion.button
                    key={s.id}
                    onClick={() => setSelectedService(s.id)}
                    whileHover={{ x: 4 }}
                    style={{
                      background: selectedService === s.id
                        ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,122,0.08))'
                        : 'rgba(255,255,255,0.02)',
                      border: selectedService === s.id
                        ? '1px solid rgba(201,168,76,0.6)'
                        : '1px solid rgba(201,168,76,0.12)',
                      borderRadius: '4px',
                      padding: '18px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '22px' }}>{s.emoji}</span>
                      <div>
                        <div style={{
                          fontFamily: 'Jost, sans-serif',
                          fontSize: '14px',
                          color: '#FAF6EF',
                          fontWeight: 500,
                        }}>{s.label}</div>
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: '18px',
                      color: '#C9A84C',
                      whiteSpace: 'nowrap',
                    }}>{s.price}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Choose date and time */}
          {step === 2 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '28px',
                color: '#FAF6EF',
                marginBottom: '10px',
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

              {/* Date picker scroll */}
              <div style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                paddingBottom: '12px',
                marginBottom: '32px',
                scrollbarWidth: 'thin',
              }}>
                {next30Days.map((date) => {
                  const avail = isDateAvailable(date);
                  const sel = selectedDate && isSameDay(date, selectedDate);
                  return (
                    <motion.button
                      key={date.toISOString()}
                      disabled={!avail}
                      onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                      whileHover={avail ? { scale: 1.05 } : {}}
                      style={{
                        minWidth: '64px',
                        padding: '12px 8px',
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
                        borderRadius: '4px',
                        cursor: avail ? 'pointer' : 'not-allowed',
                        opacity: avail ? 1 : 0.3,
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '9px',
                        letterSpacing: '0.1em',
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

              {/* Time slots */}
              {selectedDate && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '12px',
                    color: '#8A7968',
                    marginBottom: '16px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
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
                          whileHover={!blocked ? { scale: 1.05 } : {}}
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
                            borderRadius: '2px',
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

          {/* STEP 3: Contact info */}
          {step === 3 && (
            <div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '28px',
                color: '#FAF6EF',
                marginBottom: '28px',
              }}>Vos informations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#8A7968',
                    display: 'block',
                    marginBottom: '8px',
                  }}>
                    Votre prénom *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Aïssatou"
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
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
                  />
                </div>
                <div>
                  <label style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#8A7968',
                    display: 'block',
                    marginBottom: '8px',
                  }}>
                    Votre téléphone (optionnel)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Ex: 77 000 00 00"
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
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Summary + WhatsApp */}
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
                phone && { label: 'Téléphone', value: phone },
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
              }}>
                <p style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '12px',
                  color: '#C9A84C',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}>💳 Paiement</p>
                <p style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  color: '#8A7968',
                  lineHeight: 1.7,
                }}>
                  Paiement par <strong style={{ color: '#FAF6EF' }}>Wave</strong> ou <strong style={{ color: '#FAF6EF' }}>Orange Money</strong> au numéro <strong style={{ color: '#C9A84C' }}>+221 77 669 57 90</strong>. Le RDV sera confirmé après réception du paiement.
                </p>
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
                <span style={{ fontSize: '20px' }}>💬</span>
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
                  padding: '12px 28px',
                  borderRadius: '2px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                ← Retour
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
                  transition: 'all 0.3s',
                }}
              >
                Suivant →
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #reserver { padding: 80px 20px !important; }
          #reserver .booking-card { padding: 24px !important; }
        }
      `}</style>
    </section>
  );
}
