import React from 'react';
import { motion } from 'framer-motion';

export default function Footer() {
  return (
    <footer style={{
      background: '#0A0A0A',
      borderTop: '1px solid rgba(201,168,76,0.12)',
      padding: '60px 60px 40px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '60px',
        marginBottom: '50px',
      }}>
        {/* Brand */}
        <div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '28px',
              background: 'linear-gradient(135deg, #C9A84C, #E8C97A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px',
            }}>Magical Hand</div>
            <div style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '10px',
              letterSpacing: '0.25em',
              color: '#8A7968',
              textTransform: 'uppercase',
            }}>by Mamifa</div>
          </div>
          <p style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '13px',
            color: '#8A7968',
            lineHeight: 1.8,
            maxWidth: '300px',
          }}>
            Artiste maquillage professionnelle. Sublimez votre beauté pour chaque moment qui compte.
          </p>

          {/* WhatsApp CTA */}
          <motion.a
            href="https://wa.me/221776695790"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '24px',
              padding: '12px 24px',
              background: 'rgba(37,211,102,0.1)',
              border: '1px solid rgba(37,211,102,0.3)',
              borderRadius: '2px',
              color: '#25D366',
              fontFamily: 'Jost, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.1em',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '18px' }}>💬</span>
            +221 77 669 57 90
          </motion.a>
        </div>

        {/* Links */}
        <div>
          <h4 style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            marginBottom: '20px',
          }}>Navigation</h4>
          {['Accueil', 'Galerie', 'Services', 'Réserver'].map((l) => (
            <div key={l} style={{ marginBottom: '12px' }}>
              <a href={`#${l.toLowerCase().replace('é', 'e').replace('è', 'e')}`}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  color: '#8A7968',
                  textDecoration: 'none',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={e => e.target.style.color = '#FAF6EF'}
                onMouseLeave={e => e.target.style.color = '#8A7968'}
              >
                {l}
              </a>
            </div>
          ))}
        </div>

        {/* Payment */}
        <div>
          <h4 style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            marginBottom: '20px',
          }}>Paiement</h4>
          {['Wave', 'Orange Money'].map((p) => (
            <div key={p} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <span style={{ color: '#C9A84C' }}>✦</span>
              <span style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '13px',
                color: '#8A7968',
              }}>{p}</span>
            </div>
          ))}
          <p style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '12px',
            color: '#8A7968',
            marginTop: '16px',
            lineHeight: 1.7,
          }}>
            Numéro :<br />
            <span style={{ color: '#C9A84C' }}>+221 77 669 57 90</span>
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        borderTop: '1px solid rgba(201,168,76,0.08)',
        paddingTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <p style={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '11px',
          color: '#8A7968',
          letterSpacing: '0.08em',
        }}>
          © 2025 Magical Hand by Mamifa. Tous droits réservés.
        </p>
        <a href="/admin/login" style={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '10px',
          color: 'rgba(201,168,76,0.2)',
          letterSpacing: '0.1em',
          textDecoration: 'none',
          transition: 'color 0.3s',
        }}
          onMouseEnter={e => e.target.style.color = 'rgba(201,168,76,0.5)'}
          onMouseLeave={e => e.target.style.color = 'rgba(201,168,76,0.2)'}
        >
          espace admin
        </a>
      </div>

      <style>{`
        @media (max-width: 768px) {
          footer > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
          footer { padding: 50px 24px 30px !important; }
        }
      `}</style>
    </footer>
  );
}
