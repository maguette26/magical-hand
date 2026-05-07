import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
const DEFAULT_PHOTOS = [
  { id: '1', url: '/images/look1.jpg', title: 'Glam Evening', category: 'Glam' },
  { id: '2', url: '/images/simple.jpeg', title: 'Beauté Naturelle', category: 'Naturel' },
  { id: '3', url: '/images/look3.jpg', title: 'Glam Evening', category: 'Glam' },
  { id: '4', url: '/images/look4.jpg', title: 'Glam Sophistiqué', category: 'Glam' },
  { id: '8', url: '/images/look2.jpg', title: 'Glam Sophistiqué', category: 'Glam' },
  { id: '5', url: '/images/look5.jpg', title: 'Mariée Voilée', category: 'Mariage' },
  { id: '6', url: '/images/look6.jpg', title: 'Soirée Radieuse', category: 'Cérémonie' },
  { id: '7', url: '/images/look7.jpg', category: 'Cérémonie' },
  { id: '9', url: '/images/simple2.jpeg', category: 'Naturel' },
  { id: '10', url: '/images/simple3.jpeg', category: 'Naturel' },
  { id: '11', url: '/images/glam.jpeg', category: 'Glam' },
  { id: '12', url: '/images/mariage.jpeg', category: 'Cérémonie' },
  { id: '13', url: '/images/bapteme.jpeg', category: 'Cérémonie' },
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
        setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });
    return unsub;
  }, []);

  const filtered =
    activeCategory === 'Tous'
      ? photos
      : photos.filter(p => p.category === activeCategory);

  return (
    <section className="ig-section">

      {/* HEADER */}
      <div className="ig-header">
        <h2>Mes Créations</h2>
        <p>Swipe pour découvrir mes looks</p>
      </div>

      {/* FILTERS */}
      <div className="ig-filters">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={activeCategory === cat ? 'active' : ''}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* DESKTOP GRID */}
      <div className="ig-grid">
        {filtered.map((photo, i) => (
          <motion.div
            key={photo.id}
            className="ig-card"
            onClick={() => setSelected(photo)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <img src={photo.url} alt={photo.title} />
            <div className="ig-overlay">
              <h3>{photo.title}</h3>
              <span>{photo.category}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MOBILE SWIPE */}
      <div className="ig-swipe">
        <div className="ig-track">
          {filtered.map(photo => (
            <div
              key={photo.id}
              className="ig-slide"
              onClick={() => setSelected(photo)}
            >
              <img src={photo.url} alt={photo.title} />
              <div className="ig-slide-text">
                <h3>{photo.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIGHTBOX */}
      {selected && (
        <div className="ig-lightbox" onClick={() => setSelected(null)}>
          <div className="ig-lightbox-content">
            <img src={selected.url} alt={selected.title} />
            <h3>{selected.title}</h3>
            <p>{selected.category}</p>
          </div>
        </div>
      )}
    </section>
  );
}