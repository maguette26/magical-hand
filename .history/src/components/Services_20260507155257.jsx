import React from 'react';
import { motion } from 'framer-motion';

const SERVICES = [
  {
    id: 1,
    title: 'Maquillage simple',
    subtitle: 'sortie,',
    price: 'À partir de 5 000 FCFA',
    priceShort: '5k+',
    description: 'Remise en beauté rapide pour un éclat instantané.',
    features: ['Peau fraîche', 'Lèvres ravivées', 'Finition naturelle'],
    tag: 'Express',
    tagColor: '#8A7968',
  },
  {
    id: 2,
    title: 'Maquillage Complet',
    subtitle: 'Full Glam — 10 Mil',
    price: '10 000 FCFA',
    priceShort: '10k',
    description: 'Un look complet et sublimé, prête à briller.',
    features: ['Base parfaite', 'Yeux travaillés', 'Lèvres définies', 'Contouring'],
    tag: 'Populaire',
    tagColor: '#C9A84C',
    featured: true,
  },
  {
    id: 3,
    title: 'Maquillage + Shooting',
    subtitle: 'Beauty & Photo',
    price: '15 000 FCFA',
    priceShort: '15k',
    description: 'Maquillage professionnel avec séance photo incluse.',
    features: ['Look photo-ready', 'Séance shooting', 'Photos retouchées', 'Rendu premium'],
    tag: 'Shooting',
    tagColor: '#D4956A',
  },
  {
    id: 4,
    title: 'Cérémonie',
    subtitle: 'Henné · Baptême · Mariage',
    price: 'À partir de 25 000 FCFA',
    priceShort: '25k+',
    description: 'Pour vos grands jours — mariage, baptême, cérémonie culturelle.',
    features: ['Consultation style', 'Durabilité longue', 'Maquillage résistant', 'Finition luxe'],
    tag: 'Premium',
    tagColor: '#E8C97A',
  },
];

export default function Services() {
  const scrollTo = (href) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="services" style={{
      padding: '120px 60px',
      background: '#0A0A0A',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: 'center', marginBottom: '80px' }}
      >
        <p style={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '11px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#C9A84C',
          marginBottom: '16px',
        }}>Tarifs</p>
        <h2 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(40px, 5vw, 64px)',
          fontWeight: 400,
          color: '#FAF6EF',
          marginBottom: '16px',
        }}>
          Mes Prestations
        </h2>
        <div style={{
          width: '40px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
          margin: '0 auto',
        }} />
      </motion.div>

      {/* Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {SERVICES.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            whileHover={{ y: -6, boxShadow: s.featured
              ? '0 20px 60px rgba(201,168,76,0.3)'
              : '0 20px 60px rgba(0,0,0,0.4)'
            }}
            style={{
              background: s.featured
                ? 'linear-gradient(160deg, #1A1714 0%, #2A2118 100%)'
                : 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
              border: s.featured
                ? '1px solid rgba(201,168,76,0.5)'
                : '1px solid rgba(201,168,76,0.12)',
              borderRadius: '4px',
              padding: '40px 32px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.4s ease',
            }}
          >
            {/* Tag badge */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: `${s.tagColor}22`,
              border: `1px solid ${s.tagColor}44`,
              color: s.tagColor,
              padding: '4px 12px',
              borderRadius: '2px',
              fontFamily: 'Jost, sans-serif',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>
              {s.tag}
            </div>

            {/* Gold accent line */}
            {s.featured && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
              }} />
            )}

            {/* Price big */}
            <div style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '48px',
              fontWeight: 500,
              color: s.featured ? '#C9A84C' : '#E8C97A',
              lineHeight: 1,
              marginBottom: '8px',
            }}>
              {s.priceShort}
            </div>
            <div style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '11px',
              color: '#8A7968',
              marginBottom: '24px',
              letterSpacing: '0.05em',
            }}>
              {s.price}
            </div>

            <h3 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '26px',
              fontWeight: 500,
              color: '#FAF6EF',
              marginBottom: '6px',
            }}>
              {s.title}
            </h3>
            <p style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.1em',
              color: '#C9A84C',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}>
              {s.subtitle}
            </p>

            <p style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '13px',
              fontWeight: 300,
              color: '#8A7968',
              lineHeight: 1.7,
              marginBottom: '28px',
            }}>
              {s.description}
            </p>

            {/* Features */}
            <ul style={{ listStyle: 'none', marginBottom: '36px' }}>
              {s.features.map((f) => (
                <li key={f} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  color: '#FAF6EF',
                  opacity: 0.8,
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(201,168,76,0.06)',
                }}>
                  <span style={{ color: '#C9A84C', fontSize: '14px' }}>✦</span>
                  {f}
                </li>
              ))}
            </ul>

            <motion.button
              onClick={() => scrollTo('#reserver')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                padding: '14px',
                background: s.featured
                  ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                  : 'transparent',
                color: s.featured ? '#0A0A0A' : '#C9A84C',
                border: s.featured ? 'none' : '1px solid rgba(201,168,76,0.4)',
                borderRadius: '2px',
                fontFamily: 'Jost, sans-serif',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: s.featured ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              Réserver
            </motion.button>
          </motion.div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          #services { padding: 80px 20px !important; }
        }
      `}</style>
    </section>
  );
}
