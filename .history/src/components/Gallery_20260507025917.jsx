import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// Photos par défaut (les tiennes importées localement)
const DEFAULT_PHOTOS = [
  { id: '1', url: '/images/look1.jpg', title: 'Glam Evening', category: 'Glam' },
  { id: '2', url: '/images/simple.jpeg', title: 'Beauté Naturelle', category: 'Naturel' },
  { id: '3', url: '/images/look3.jpg', title: 'Look Cérémonie', category: 'Glam' },
  { id: '4', url: '/images/look4.jpg', title: 'Glam Sophistiqué', category: 'Glam' },
   { id: '8', url: '/images/look4.jpg', title: 'Glam Sophistiqué', category: 'Glam' },
  { id: '5', url: '/images/look5.jpg', title: 'Mariée Voilée', category: 'Mariage' },
  { id: '6', url: '/images/look6.jpg', title: 'Soirée Radieuse', category: 'Cérémonie' },
  { id: '7', url: '/images/look7.jpg', title: 'Cérémonie Culturelle', category: 'Cérémonie' },
  
];

const CATEGORIES = ['Tous', 'Glam', 'Cérémonie', 'Naturel'];

export default function Gallery() {
  const [photos, setPhotos] = useState(DEFAULT_PHOTOS);
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPhotos(data);
      }
    }, () => {});
    return unsub;
  }, []);

  const filtered = activeCategory === 'Tous'
    ? photos
    : photos.filter(p => p.category === activeCategory);

  return (
    <section id="galerie" style={{
      padding: '120px 60px',
      background: 'linear-gradient(180deg, #0A0A0A 0%, #1A1714 50%, #0A0A0A 100%)',
    }}>
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: 'center', marginBottom: '60px' }}
      >
         
        <h2 style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 'clamp(40px, 5vw, 64px)',
          fontWeight: 400,
          color: '#FAF6EF',
          marginBottom: '16px',
        }}>
          Mes Créations
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
          lineHeight: 1.8,
        }}>
          Chaque transformation est unique. Découvrez mon travail à travers ces portraits.
        </p>
      </motion.div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '50px',
      }}>
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '8px 22px',
              borderRadius: '2px',
              fontFamily: 'Jost, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              transition: 'all 0.3s',
              background: activeCategory === cat
                ? 'linear-gradient(135deg, #C9A84C, #E8C97A)'
                : 'transparent',
              color: activeCategory === cat ? '#0A0A0A' : '#8A7968',
              border: activeCategory === cat
                ? '1px solid transparent'
                : '1px solid rgba(201,168,76,0.25)',
              fontWeight: activeCategory === cat ? 600 : 400,
            }}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {/* Masonry Grid */}
      <div style={{
        columns: '3 280px',
        columnGap: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {filtered.map((photo, i) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.07 }}
            onClick={() => setSelected(photo)}
            style={{
              breakInside: 'avoid',
              marginBottom: '16px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '4px',
              border: '1px solid rgba(201,168,76,0.1)',
            }}
          >
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.5 }}
              style={{ overflow: 'hidden' }}>
              <img
                src={photo.url}
                alt={photo.title}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  transition: 'transform 0.5s',
                }}
              />
            </motion.div>
            {/* Hover overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.3) 50%, transparent 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '20px',
              }}
            >
              <span style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '18px',
                color: '#FAF6EF',
              }}>{photo.title}</span>
              <span style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: '#C9A84C',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}>{photo.category}</span>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '80vh',
              maxHeight: '90vh',
              position: 'relative',
            }}
          >
            <img
              src={selected.url}
              alt={selected.title}
              style={{
                maxHeight: '80vh',
                maxWidth: '100%',
                borderRadius: '4px',
                objectFit: 'contain',
                border: '1px solid rgba(201,168,76,0.2)',
              }}
            />
            <div style={{
              textAlign: 'center',
              marginTop: '16px',
            }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#FAF6EF' }}>
                {selected.title}
              </p>
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {selected.category}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                background: '#C9A84C',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >×</button>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        @media (max-width: 768px) {
          #galerie { padding: 80px 20px !important; }
        }
      `}</style>
    </section>
  );
}
