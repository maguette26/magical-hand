import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Accueil', href: '#hero' },
    { label: 'Galerie', href: '#galerie' },
    { label: 'Services', href: '#services' },
    { label: 'Réserver', href: '#reserver' },
  ];

  const scrollTo = (href) => {
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: scrolled ? '12px 40px' : '22px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: scrolled
            ? 'rgba(10,10,10,0.95)'
            : 'linear-gradient(to bottom, rgba(10,10,10,0.8), transparent)',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(201,168,76,0.15)' : 'none',
          transition: 'all 0.4s ease',
        }}
      >
    {/* Logo */}
<motion.div
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.98 }}
  style={{ cursor: 'pointer', position: 'relative' }}
  onClick={() => scrollTo('#hero')}
>
  {/* Logo */}
<motion.div
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.98 }}
  style={{ cursor: 'pointer', position: 'relative' }}
  onClick={() => scrollTo('#hero')}
>
  <motion.div
    animate={{ opacity: [0.4, 0.7, 0.4] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute',
      inset: '-10px -16px',
      background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.12) 0%, transparent 70%)',
      borderRadius: '12px',
      pointerEvents: 'none',
    }}
  />
  <img
    src="/images/logo.png"
    alt="Magical Hand by Mamifa"
    style={{
      height: window.innerWidth < 768 ? '52px' : '68px',
      width: 'auto',
      objectFit: 'contain',
      display: 'block',
      position: 'relative',
      filter: scrolled
        ? 'drop-shadow(0 0 8px rgba(201,168,76,0.25)) brightness(1.05)'
        : 'drop-shadow(0 2px 12px rgba(201,168,76,0.15)) brightness(1)',
      transition: 'filter 0.4s ease, height 0.4s ease',
    }}
  />
</motion.div>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', gap: '36px', alignItems: 'center' }}
          className="desktop-nav">
          {navLinks.map((link) => (
            <motion.button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              whileHover={{ color: '#C9A84C' }}
              style={{
                background: 'none',
                border: 'none',
                color: '#FAF6EF',
                fontFamily: 'Jost, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'color 0.3s',
                opacity: 0.85,
              }}
            >
              {link.label}
            </motion.button>
          ))}
        
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'none',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={menuOpen ? {
                rotate: i === 0 ? 45 : i === 2 ? -45 : 0,
                y: i === 0 ? 8 : i === 2 ? -8 : 0,
                opacity: i === 1 ? 0 : 1,
              } : { rotate: 0, y: 0, opacity: 1 }}
              style={{
                display: 'block',
                width: '24px',
                height: '1.5px',
                background: '#C9A84C',
                borderRadius: '2px',
                transformOrigin: 'center',
              }}
            />
          ))}
        </button>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '60px',
              left: 0,
              right: 0,
              zIndex: 99,
              background: 'rgba(10,10,10,0.98)',
              backdropFilter: 'blur(20px)',
              padding: '30px 40px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              borderBottom: '1px solid rgba(201,168,76,0.2)',
            }}
          >
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FAF6EF',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '14px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(201,168,76,0.1)',
                }}
              >
                {link.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          header { padding: 16px 24px !important; }
        }
      `}</style>
    </>
  );
}
