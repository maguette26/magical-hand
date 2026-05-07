import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
const DEFAULT_PHOTOS = [
  { id: '1', url: '/images/look1.jpg', title: 'Glam Evening', category: 'Glam' },
  { id: '2', url: '/images/simple.jpeg', title: 'Beauté Naturelle', category: 'Naturel' },
  { id: '3', url: '/images/look3.jpg', title: 'Look Cérémonie', category: 'Glam' },
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

onst CATEGORIES = ['Tous', 'Glam', 'Cérémonie', 'Naturel'];export default function Gallery() {  const [photos, setPhotos] = useState(DEFAULT_PHOTOS);  const [activeCategory, setActiveCategory] = useState('Tous');  const [selected, setSelected] = useState(null);  useEffect(() => {    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));    const unsub = onSnapshot(q, (snap) => {      if (!snap.empty) {        setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })));      }    });    return unsub;  }, []);  const filtered =    activeCategory === 'Tous'      ? photos      : photos.filter(p => p.category === activeCategory);  return (    <section className="ig-section">      {/* HEADER */}      <div className="ig-header">        <h2>Mes Créations</h2>        <p>Swipe pour découvrir mes looks</p>      </div>      {/* FILTERS */}      <div className="ig-filters">        {CATEGORIES.map(cat => (          <button            key={cat}            onClick={() => setActiveCategory(cat)}            className={activeCategory === cat ? 'active' : ''}          >            {cat}          </button>        ))}      </div>      {/* DESKTOP GRID */}      <div className="ig-grid">        {filtered.map((photo, i) => (          <motion.div            key={photo.id}            className="ig-card"            onClick={() => setSelected(photo)}            initial={{ opacity: 0, y: 20 }}            whileInView={{ opacity: 1, y: 0 }}          >            <img src={photo.url} alt={photo.title} />            <div className="ig-overlay">              <h3>{photo.title}</h3>              <span>{photo.category}</span>            </div>          </motion.div>        ))}      </div>      {/* MOBILE SWIPE */}      <div className="ig-swipe">        <div className="ig-track">          {filtered.map(photo => (            <div              key={photo.id}              className="ig-slide"              onClick={() => setSelected(photo)}            >              <img src={photo.url} alt={photo.title} />              <div className="ig-slide-text">                <h3>{photo.title}</h3>              </div>            </div>          ))}        </div>      </div>      {/* LIGHTBOX */}      {selected && (        <div className="ig-lightbox" onClick={() => setSelected(null)}>          <div className="ig-lightbox-content">            <img src={selected.url} alt={selected.title} />            <h3>{selected.title}</h3>            <p>{selected.category}</p>          </div>        </div>      )}    </section>  );}

🎨 2. CSS ULTRA LUXE + SWIPE MOBILE
👉 Ajoute ça dans ton index.css
/* =========================   INSTAGRAM LUXE GALLERY========================= */.ig-section {  padding: 100px 20px;  background: #0A0A0A;}/* HEADER */.ig-header {  text-align: center;  margin-bottom: 40px;}.ig-header h2 {  font-family: 'Cormorant Garamond', serif;  font-size: clamp(32px, 5vw, 60px);  color: #FAF6EF;}.ig-header p {  color: #8A7968;}/* FILTERS */.ig-filters {  display: flex;  justify-content: center;  gap: 10px;  flex-wrap: wrap;  margin-bottom: 30px;}.ig-filters button {  padding: 6px 14px;  font-size: 11px;  letter-spacing: 0.15em;  background: transparent;  border: 1px solid rgba(201,168,76,0.3);  color: #8A7968;  cursor: pointer;}.ig-filters .active {  background: #C9A84C;  color: #0A0A0A;}/* =========================   DESKTOP GRID========================= */.ig-grid {  display: grid;  grid-template-columns: repeat(3, 1fr);  gap: 16px;  max-width: 1200px;  margin: auto;}.ig-card {  position: relative;  overflow: hidden;  cursor: pointer;  border-radius: 8px;}.ig-card img {  width: 100%;  height: 100%;  object-fit: cover;  transition: 0.4s;}.ig-card:hover img {  transform: scale(1.05);}.ig-overlay {  position: absolute;  bottom: 0;  width: 100%;  padding: 10px;  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);  color: #FAF6EF;}/* =========================   MOBILE SWIPE (IMPORTANT)========================= */.ig-swipe {  display: none;  overflow-x: auto;  scroll-snap-type: x mandatory;  -webkit-overflow-scrolling: touch;}.ig-track {  display: flex;  gap: 12px;  padding: 10px;}.ig-slide {  min-width: 80%;  flex: 0 0 auto;  scroll-snap-align: center;  border-radius: 10px;  overflow: hidden;  position: relative;}.ig-slide img {  width: 100%;  height: 420px;  object-fit: cover;}.ig-slide-text {  position: absolute;  bottom: 0;  padding: 12px;  color: white;  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);}/* =========================   LIGHTBOX========================= */.ig-lightbox {  position: fixed;  inset: 0;  background: rgba(0,0,0,0.92);  display: flex;  justify-content: center;  align-items: center;  z-index: 999;}.ig-lightbox-content {  max-width: 90%;  text-align: center;  color: white;}.ig-lightbox-content img {  max-height: 70vh;  width: 100%;  object-fit: contain;}/* =========================   RESPONSIVE SWITCH========================= */@media (max-width: 768px) {  .ig-grid {    display: none;  }  .ig-swipe {    display: block;  }}

📱 RÉSULTAT FINAL
💻 Desktop
✔ grid 3 colonnes luxe Instagram
📲 Mobile
✔ swipe horizontal fluide (TikTok / Instagram stories style)
✔ scroll naturel
✔ cards larges + immersives

💄 UX PARFAITE POUR TON PROJET
👉 ton site devient :


salon de maquillage premium


expérience Instagram


navigation moderne


look “influenceuse beauté”



🚀 SI TU VEUX ALLER PLUS LOIN
Je peux t’ajouter :
🔥 swipe avec autoplay (style reels)
💄 animation blur + zoom ultra luxe
📲 bouton “Book this look”
💬 lien WhatsApp direct sur chaque photo
Dis-moi 👍