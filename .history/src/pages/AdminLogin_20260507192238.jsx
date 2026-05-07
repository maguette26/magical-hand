import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth } from '../firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Bienvenue Mamifa !');
      navigate('/admin');
    } catch {
      toast.error('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'linear-gradient(160deg, #111 0%, #1A1714 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '4px',
          padding: '54px 44px',
          position: 'relative',
        }}
      >
        {/* Top gold line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
          borderRadius: '4px 4px 0 0',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '32px',
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
          }}>Espace Admin · by Mamifa</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#8A7968',
              display: 'block',
              marginBottom: '8px',
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="entrer"
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '2px',
                color: '#FAF6EF',
                fontFamily: 'Jost, sans-serif',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#C9A84C'}
              onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
            />
          </div>
          <div>
            <label style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#8A7968',
              display: 'block',
              marginBottom: '8px',
            }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '2px',
                color: '#FAF6EF',
                fontFamily: 'Jost, sans-serif',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#C9A84C'}
              onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.25)'}
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.03, boxShadow: '0 8px 30px rgba(201,168,76,0.4)' } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
            style={{
              marginTop: '12px',
              padding: '16px',
              background: loading
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #C9A84C, #E8C97A)',
              color: loading ? '#8A7968' : '#0A0A0A',
              border: 'none',
              borderRadius: '2px',
              fontFamily: 'Jost, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </motion.button>
        </form>

        <motion.a
          href="/"
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: '24px',
            fontFamily: 'Jost, sans-serif',
            fontSize: '12px',
            color: '#8A7968',
            textDecoration: 'none',
            letterSpacing: '0.08em',
            transition: 'color 0.3s',
          }}
          whileHover={{ color: '#C9A84C' }}
        >
          ← Retour au site
        </motion.a>
      </motion.div>
    </div>
  );
}
