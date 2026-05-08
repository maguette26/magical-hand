import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, storage } from '../firebase.js';
import {
  collection, onSnapshot, query, where, addDoc,
  serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Sparkles, Camera, Crown, Clock, ChevronLeft, ChevronRight,
  CreditCard, Check, Wand2, Upload, AlertCircle, CheckCircle2
} from 'lucide-react';

const WHATSAPP_NUMBER = '221776695790';
const ACOMPTE_PERCENT = 30;

const SERVICES = [
  {
    id: 1,
    label: 'Maquillage Simple',
    price: '7 000 FCFA',
    priceNum: 7000,
    description: 'Look naturel et soigné, idéal pour le quotidien',
    Icon: Wand2,
  },
  {
    id: 2,
    label: 'Maquillage Complet Glam',
    price: '10 000 FCFA',
    priceNum: 10000,
    description: 'Look complet, longue tenue, éclat assuré',
    Icon: Sparkles,
  },
  {
    id: 3,
    label: 'Maquillage + Shooting Photo',
    price: '15 000 FCFA',
    priceNum: 15000,
    description: 'Maquillage pro + séance photo incluse',
    Icon: Camera,
  },
  {
    id: 4,
    label: 'Cérémonie — Henné / Mariage',
    price: 'À partir de 25 000 FCFA',
    priceNum: 25000,
    description: 'Look royal garanti',
    Icon: Crown,
  },
];

const STEPS = [
  { n: 1, label: 'Prestation' },
  { n: 2, label: 'Date & Heure' },
  { n: 3, label: 'Infos' },
  { n: 4, label: 'Paiement' },
];

export default function Booking() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [availability, setAvailability] = useState({});
  const [bookedSlots, setBookedSlots] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [bookingId, setBookingId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPad = (monthStart.getDay() + 6) % 7;

  const paddedDays = [
    ...Array(startPad).fill(null),
    ...calDays,
  ];

  const acompteAmount = () => {
    const s = SERVICES.find(x => x.id === selectedService);
    return s ? Math.round(s.priceNum * ACOMPTE_PERCENT / 100) : 0;
  };

  const canProceed = () => {
    if (step === 1) return selectedService;
    if (step === 2) return selectedDate && selectedTime;
    if (step === 3) return name && phone;
    return false;
  };

  const handleCreateBooking = async () => {
    setCreatingBooking(true);
    try {
      const service = SERVICES.find(s => s.id === selectedService);
      const docRef = await addDoc(collection(db, 'bookings'), {
        name,
        phone,
        service: service.label,
        priceNum: service.priceNum,
        acompte: acompteAmount(),
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        status: 'pending_payment',
        createdAt: serverTimestamp(),
      });
      setBookingId(docRef.id);
      setStep(4);
    } catch (e) {
      console.error(e);
    }
    setCreatingBooking(false);
  };

  const handleWhatsApp = () => {
    const msg = `Réservation : ${name} - ${phone}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ padding: 20, color: 'white' }}>
      <h1>Booking</h1>

      {step === 1 && (
        <div>
          {SERVICES.map(s => (
            <button key={s.id} onClick={() => setSelectedService(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div>
          <input type="date" onChange={e => setSelectedDate(new Date(e.target.value))} />
          <input type="time" onChange={e => setSelectedTime(e.target.value)} />
        </div>
      )}

      {step === 3 && (
        <div>
          <input placeholder="Nom" onChange={e => setName(e.target.value)} />
          <input placeholder="Téléphone" onChange={e => setPhone(e.target.value)} />
        </div>
      )}

      <button disabled={!canProceed()} onClick={() => setStep(step + 1)}>
        Suivant
      </button>

      {step === 3 && (
        <button onClick={handleCreateBooking}>
          Confirmer
        </button>
      )}

      {step === 4 && (
        <div>
          <p>Acompte: {acompteAmount()} FCFA</p>
          <button onClick={handleWhatsApp}>WhatsApp</button>
        </div>
      )}
    </div>
  );
}