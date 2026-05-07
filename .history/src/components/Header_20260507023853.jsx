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
          whileHover={{ scale: 1.02 }}
          style={{ cursor: 'pointer' }}
          onClick={() => scrollTo('#hero')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '26px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              background: 'linear-gradient(135deg, #C9A84C, #E8C97A, #C9A84C)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s linear infinite',
            }}>
              Magical Hand
            </span>
            <span style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '10px',
              fontWeight: 300,
              letterSpacing: '0.25em',
              color: '#8A7968',
              textTransform: 'uppercase',
            }}>
              by Mamifa
            </span>
          </div>
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
          <motion.button
            onClick={() => scrollTo('#reserver')}
            whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(201,168,76,0.4)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(135deg, #C9A84C, #E8C97A)',
              color: '#0A0A0A',
              padding: '10px 26px',
              borderRadius: '2px',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 600,
              transition: 'all 0.3s',
            }}
          >
            Réserver
          </motion.button>
        </nav>

         

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
