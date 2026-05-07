import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home.jsx';
import Admin from './pages/Admin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1A1714',
              color: '#FAF6EF',
              border: '1px solid #C9A84C',
              fontFamily: 'Jost, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#0A0A0A' } },
          }}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
