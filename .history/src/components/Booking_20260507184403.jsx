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
    const message = `Bonjour Mamifa ! 💄\n\nJe souhaite réserver un rendez-vous chez *Magical Hand by Mamifa* :\n\n✨ *Prestation :* ${service.label} (${service.price})\n📅 *Date :* ${dateStr}\n🕐 *Heure :* ${selectedTime}\n👤 *Nom :* ${name}\n📱 *Téléphone :* ${phone || 'Non précisé'}\n\nJe vous contacterai pour confirmer le paiement via Wave ou Orange Money.\nMerci ! 🙏`;
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
      <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%', overflowX: 'hidden' }}>

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: '70px' }}
        >
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}>
            Prendre Rendez-Vous
          </h2>
        </motion.div>

        {/* PROGRESS */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '40px'
        }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ textAlign: 'center' }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: step >= s.n ? '#C9A84C' : 'transparent',
                color: step >= s.n ? '#000' : '#999',
                border: '1px solid #C9A84C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {s.n}
              </div>
              <span style={{ fontSize: 10 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* STEP CONTENT */}
        <div style={{
          background: '#111',
          padding: '20px',
          borderRadius: 8,
          overflowX: 'hidden'
        }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SERVICES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s.id)}
                  style={{
                    width: '100%',
                    padding: 15,
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    border: selectedService === s.id ? '1px solid #C9A84C' : '1px solid #333',
                    background: '#1a1a1a',
                    color: '#fff',
                    borderRadius: 6
                  }}
                >
                  <span>{s.label}</span>
                  <span>{s.price}</span>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={{ overflowX: 'hidden' }}>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                gap: 6
              }}>
                {visibleDays.map(date => (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      padding: 8,
                      fontSize: 10,
                      borderRadius: 6,
                      border: '1px solid #444',
                      background: isDateAvailable(date) ? '#222' : '#111',
                      color: '#fff'
                    }}
                  >
                    {format(date, 'dd')}
                  </button>
                ))}
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 15
              }}>
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 4,
                      border: '1px solid #C9A84C',
                      background: selectedTime === t ? '#C9A84C' : 'transparent',
                      color: selectedTime === t ? '#000' : '#fff'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nom"
                style={{ padding: 12, width: '100%' }}
              />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Téléphone"
                style={{ padding: 12, width: '100%' }}
              />
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div style={{ color: '#fff' }}>
              <p>Nom: {name}</p>
              <p>Heure: {selectedTime}</p>
            </div>
          )}

        </div>

        {/* NAV */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 20,
          flexWrap: 'wrap',
          gap: 10
        }}>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}>
              Retour
            </button>
          )}

          {step < 4 && (
            <button
              onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
            >
              Suivant
            </button>
          )}

          {step === 4 && (
            <button onClick={handleWhatsApp}>
              Envoyer WhatsApp
            </button>
          )}
        </div>

      </div>

      {/* MOBILE FIX GLOBAL */}
      <style>{`
        .booking-section {
          padding: 80px 16px !important;
          overflow-x: hidden;
        }

        * {
          box-sizing: border-box;
        }

        html, body {
          overflow-x: hidden;
        }

        input, button {
          max-width: 100%;
        }
      `}</style>
    </section>
  );
}