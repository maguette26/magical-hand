import React from 'react';
import { motion } from 'framer-motion';

// Image de la maquilleuse (dernière photo - noir et blanc)
const MAMIFA_PHOTO = '/images/look8.jpg';

export default function Hero() {
  const scrollTo = (href) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Left - Text */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '120px 60px 80px 80px',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1714 100%)',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{
            width: '60px',
            height: '1px',
            background: 'linear-gradient(90deg, #C9A84C, transparent)',
            marginBottom: '28px',
            transformOrigin: 'left',
          }}
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            marginBottom: '20px',
          }}
        >
          Artiste Maquilleuge Professionnelle
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(52px, 7vw, 86px)',
            fontWeight: 400,
            lineHeight: 1.05,
            color: '#FAF6EF',
            marginBottom: '12px',
          }}
        >
          Magical
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #C9A84C, #E8C97A)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Hand
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '22px',
            fontStyle: 'italic',
            color: '#8A7968',
            marginBottom: '40px',
            letterSpacing: '0.05em',
          }}
        >
          by Mamifa
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '15px',
            fontWeight: 300,
            color: '#8A7968',
            lineHeight: 1.8,
            maxWidth: '380px',
            marginBottom: '50px',
          }}
        >
          Sublimez votre beauté pour chaque occasion. Glam, Cérémonie, Mariage, Baptême — chaque visage est une œuvre d'art.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 8px 30px rgba(201,168,76,0.5)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => scrollTo('#reserver')}
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #E8C97A)',
              color: '#0A0A0A',
              padding: '16px 38px',
              borderRadius: '2px',
              fontSize: '12px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 600,
              fontFamily: 'Jost, sans-serif',
              transition: 'all 0.3s',
            }}
          >
            Prendre RDV
          </motion.button>

          <motion.button
            whileHover={{ borderColor: '#C9A84C', color: '#C9A84C' }}
            onClick={() => scrollTo('#galerie')}
            style={{
              background: 'transparent',
              color: '#FAF6EF',
              padding: '16px 38px',
              borderRadius: '2px',
              fontSize: '12px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 400,
              fontFamily: 'Jost, sans-serif',
              border: '1px solid rgba(201,168,76,0.4)',
              transition: 'all 0.3s',
            }}
          >
            Voir la Galerie
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          style={{
            display: 'flex',
            gap: '40px',
            marginTop: '60px',
            paddingTop: '40px',
            borderTop: '1px solid rgba(201,168,76,0.15)',
          }}
        >
          {[
            { n: '200+', label: 'Clientes satisfaites' },
            { n: '5★', label: 'Avis' },
            { n: '3+', label: 'Ans d\'expérience' },
          ].map((s) => (
            <div key={s.label}>
              <div style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '28px',
                fontWeight: 500,
                color: '#C9A84C',
                lineHeight: 1,
              }}>{s.n}</div>
              <div style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '10px',
                letterSpacing: '0.1em',
                color: '#8A7968',
                marginTop: '4px',
                textTransform: 'uppercase',
              }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right - Photo Mamifa */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <img
          src={MAMIFA_PHOTO}
          alt="Mamifa - Artiste Maquillruge"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
          }}
        />
        {/* Overlay gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(10,10,10,0.3) 0%, transparent 30%, transparent 70%, rgba(10,10,10,0.2) 100%)',
          pointerEvents: 'none',
        }} />
        {/* Gold bottom fade */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: 'linear-gradient(to top, rgba(10,10,10,0.7), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Label flottant */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '30px',
            background: 'rgba(10,10,10,0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(201,168,76,0.3)',
            padding: '14px 22px',
            borderRadius: '4px',
          }}
        >
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '18px',
            color: '#FAF6EF',
          }}>Mamifa</div>
          <div style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: '#C9A84C',
            textTransform: 'uppercase',
          }}>Make-up Artist</div>
        </motion.div>
      </motion.div>

      <style>{`
        @media (max-width: 900px) {
          #hero {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto auto;
          }
          #hero > div:first-child {
            padding: 120px 28px 60px !important;
          }
          #hero > div:last-child {
            height: 50vh;
          }
        }
      `}</style>
    </section>
  );
}
