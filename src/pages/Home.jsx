import React from 'react';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import Gallery from '../components/Gallery.jsx';
import Services from '../components/Services.jsx';
import Booking from '../components/Booking.jsx';
import Footer from '../components/Footer.jsx';

export default function Home() {
  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh' }}>
      <Header />
      <Hero />
      <Gallery />
      <Services />
      <Booking />
      <Footer />
    </div>
  );
}
