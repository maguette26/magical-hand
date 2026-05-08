import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db, storage } from "../firebase.js";

import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";

import { fr } from "date-fns/locale";

import {
  Sparkles,
  Camera,
  Crown,
  Clock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Check,
  Wand2,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const WHATSAPP_NUMBER = "221776695790";
const ACOMPTE_PERCENT = 30;

const SERVICES = [
  {
    id: 1,
    label: "Maquillage Simple",
    price: "7 000 FCFA",
    priceNum: 7000,
    description: "Look naturel et soigné",
    Icon: Wand2,
  },
  {
    id: 2,
    label: "Maquillage Glam",
    price: "10 000 FCFA",
    priceNum: 10000,
    description: "Look complet longue tenue",
    Icon: Sparkles,
  },
  {
    id: 3,
    label: "Shooting Photo",
    price: "15 000 FCFA",
    priceNum: 15000,
    description: "Maquillage + photos",
    Icon: Camera,
  },
  {
    id: 4,
    label: "Cérémonie",
    price: "25 000 FCFA+",
    priceNum: 25000,
    description: "Mariage / baptême",
    Icon: Crown,
  },
];

const STEPS = [
  { n: 1, label: "Prestation" },
  { n: 2, label: "Date & Heure" },
  { n: 3, label: "Infos" },
  { n: 4, label: "Paiement" },
];

export default function Booking() {
  const [step, setStep] = useState(1);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [availability, setAvailability] = useState({});
  const [bookedSlots, setBookedSlots] = useState([]);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [bookingId, setBookingId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  // 🔹 Load availability
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "availability"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data().slots || [];
      });
      setAvailability(map);
    });

    return unsub;
  }, []);

  // 🔹 Load booked slots
  useEffect(() => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const q = query(
      collection(db, "bookings"),
      where("date", "==", dateStr)
    );

    const unsub = onSnapshot(q, (snap) => {
      setBookedSlots(
        snap.docs
          .filter((d) => d.data().status !== "cancelled")
          .map((d) => d.data().time)
      );
    });

    return unsub;
  }, [selectedDate]);

  const isDateAvailable = (date) => {
    if (!date) return false;
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return false;

    const dateStr = format(date, "yyyy-MM-dd");
    return availability[dateStr]?.length > 0;
  };

  const getSlots = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    return (availability[dateStr] || []).filter(
      (s) => !bookedSlots.includes(s)
    );
  };

  const acompteAmount = () => {
    const s = SERVICES.find((x) => x.id === selectedService);
    if (!s) return 0;
    return Math.round((s.priceNum * ACOMPTE_PERCENT) / 100);
  };

  const canProceed = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return selectedDate && selectedTime;
    if (step === 3)
      return name.trim().length > 2 && phone.trim().length > 5;
    return false;
  };

  const handleCreateBooking = async () => {
    setCreatingBooking(true);

    const service = SERVICES.find((s) => s.id === selectedService);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const docRef = await addDoc(collection(db, "bookings"), {
      name,
      phone,
      service: service.label,
      price: service.price,
      priceNum: service.priceNum,
      date: dateStr,
      time: selectedTime,
      status: "pending_payment",
      acompte: acompteAmount(),
      createdAt: serverTimestamp(),
    });

    setBookingId(docRef.id);
    setStep(4);
    setCreatingBooking(false);
  };

  const openSlots = getSlots();
  const service = SERVICES.find((s) => s.id === selectedService);

  return (
    <section id="reserver">
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* STEP CONTENT */}
        <motion.div>
          
          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h2>Choisissez une prestation</h2>

              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s.id)}
                >
                  {s.label} - {s.price}
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h2>Choisissez date & heure</h2>

              {selectedDate && (
                <div>
                  {openSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <input
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                placeholder="Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <h3>Payez {acompteAmount()} FCFA</h3>
              <p>Réservation créée: {bookingId}</p>
            </div>
          )}

        </motion.div>

        {/* NAVIGATION */}
        <div>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}>
              Retour
            </button>
          )}

          {step < 3 && (
            <button
              disabled={!canProceed()}
              onClick={() => setStep(step + 1)}
            >
              Suivant
            </button>
          )}

          {step === 3 && (
            <button
              disabled={!canProceed()}
              onClick={handleCreateBooking}
            >
              Confirmer
            </button>
          )}
        </div>
      </div>

      <style>{`
        #reserver {
          padding: 80px 20px;
          background: #0a0a0a;
          color: white;
        }
      `}</style>
    </section>
  );
}