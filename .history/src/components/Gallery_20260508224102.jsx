import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const DEFAULT_PHOTOS = [
  { id: '1',  url: '/images/look1.jpg',    title: 'Glam Evening',      category: 'Glam' },
  { id: '2',  url: '/images/simple.jpeg',  title: 'Beauté Naturelle',  category: 'Naturel' },
  { id: '3',  url: '/images/look3.jpg',    title: 'Glam Evening',      category: 'Glam' },
  { id: '4',  url: '/images/look4.jpg',    title: 'Glam Sophistiqué',  category: 'Glam' },
  { id: '8',  url: '/images/look2.jpg',    title: 'Glam Sophistiqué',  category: 'Glam' },
  { id: '5',  url: '/images/look5.jpg',    title: 'Glam Evening',      category: 'Glam' },
  { id: '6',  url: '/images/look6.jpg',    title: 'Baptême',           category: 'Cérémonie' },
  { id: '7',  url: '/images/look7.jpg',    title: '',                  category: 'Cérémonie' },
  { id: '9',  url: '/images/simple2.jpeg', title: '',                  category: 'Naturel' },
  { id: '10', url: '/images/simple3.jpeg', title: '',                  category: 'Naturel' },
  { id: '11', url: '/images/glam.jpeg',    title: '',                  category: 'Glam' },
  { id: '12', url: '/images/mariage.jpeg', title: '',                  category: 'Cérémonie' },
  { id: '13', url: '/images/bapteme.jpeg', title: '',                  category: 'Cérémonie' },
];

const CATEGORIES = ['Tous', 'Glam', 'Cérémonie', 'Naturel'];

export default function Gallery() {
  // null = chargement en cours | [] = Firestore vide | [...] = données reçues
  const [firestorePhotos, setFirestorePhotos] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Met à jour à chaque changement Firestore (ajout, suppression, modif)
        setFirestorePhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      () => {
        // Erreur Firestore → on bascule sur les photos par défaut
        setFirestorePhotos([]);
      }
    );
    return unsub;
  }, []);

  // Priorité : photos Firestore si non vides, sinon DEFAULT_PHOTOS
  // Pendant le chargement initial (null) : affiche DEFAULT_PHOTOS pour éviter un écran vide
  const photos =
    firestorePhotos && firestorePhotos.length > 0
      ? firestorePhotos
      : DEFAULT_PHOTOS;

  const filtered =
    activeCategory === 'Tous'
      ? photos
      : photos.filter(p => p.category === activeCategory);

  return (
    <section className="ig-section">

      {/* HEADER */}
      <div className="ig-header">
        <h2>Mes Créations</h2>
       
      </div>

      {/* FILTERS */}
      <div className="ig-filters">
         <p>Défile su pour découvrir mes looks</p>
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
        {filtered.map((photo) => (
          <motion.div
            key={photo.id}
            className="ig-card"
            onClick={() => setSelected(photo)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <img src={photo.url} alt={photo.title || photo.category} />
            <div className="ig-overlay">
              {photo.title && <h3>{photo.title}</h3>}
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
              <img src={photo.url} alt={photo.title || photo.category} />
              {photo.title && (
                <div className="ig-slide-text">
                  <h3>{photo.title}</h3>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* LIGHTBOX */}
      {selected && (
        <div className="ig-lightbox" onClick={() => setSelected(null)}>
          <div className="ig-lightbox-content">
            <img src={selected.url} alt={selected.title || selected.category} />
            {selected.title && <h3>{selected.title}</h3>}
            <p>{selected.category}</p>
          </div>
        </div>
      )}
    </section>
  );
}