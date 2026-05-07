import React from "react";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";

const MAMIFA_PHOTO = "/images/look8.jpg";

export default function Hero() {
  const whatsappLink =
    "https://wa.me/221710077673?text=Bonjour%20Mamifa%20je%20souhaite%20prendre%20un%20rendez-vous";

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "#0A0A0A",
      }}
    >
      {/* LEFT */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 60px",
          background: "linear-gradient(135deg, #0A0A0A 0%, #1A1714 100%)",
        }}
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            color: "#C9A84C",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            fontSize: "12px",
            marginBottom: "20px",
            fontFamily: "Jost, sans-serif",
          }}
        >
          Make-up Artist
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          style={{
            fontSize: "clamp(50px, 8vw, 90px)",
            lineHeight: 1,
            color: "#FAF6EF",
            fontFamily: "Cormorant Garamond, serif",
            marginBottom: "10px",
          }}
        >
          Magical
          <br />
          <span
            style={{
              color: "#C9A84C",
            }}
          >
            Hand
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            color: "#8A7968",
            fontSize: "22px",
            marginBottom: "35px",
            fontStyle: "italic",
            fontFamily: "Cormorant Garamond, serif",
          }}
        >
          by Mamifa
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            color: "#B7A99A",
            fontSize: "15px",
            lineHeight: 1.8,
            maxWidth: "450px",
            marginBottom: "40px",
            fontFamily: "Jost, sans-serif",
          }}
        >
          Maquillage glamour, mariage, cérémonie et événements.
          Réservation rapide via WhatsApp.
        </motion.p>

        
        {/* INFOS */}
        <div
          style={{
            borderTop: "1px solid rgba(201,168,76,0.2)",
            paddingTop: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <p
            style={{
              color: "#FAF6EF",
              fontSize: "14px",
              fontFamily: "Jost, sans-serif",
            }}
          >
            📞 +221 71 007 76 73
          </p>

          <p
            style={{
              color: "#C9A84C",
              fontSize: "14px",
              fontFamily: "Jost, sans-serif",
            }}
          >
            💳 Paiement via Wave & Orange Money
          </p>
        </div>
      </div>

      {/* RIGHT IMAGE */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        <img
          src={MAMIFA_PHOTO}
          alt="Mamifa"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(10,10,10,0.5), transparent)",
          }}
        />
      </motion.div>

      {/* MOBILE */}
      <style>{`
        @media (max-width: 900px) {
          section {
            grid-template-columns: 1fr !important;
          }

          section > div:first-child {
            padding: 100px 25px 60px !important;
          }

          section > div:last-child {
            height: 50vh;
          }
        }
      `}</style>
    </section>
  );
}