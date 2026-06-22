import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';
import '../styles/login-page.css';

// Server Login Request
import { loginRequest } from '../services/authService';


function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

    const handleLogin = async (email, password) => {
      try {
        const data = await loginRequest(email, password);
        // authService ya guarda token y usuario en localStorage
        onLoginSuccess(data.data); // pasar objeto completo
 
    // Redirigir según tipo de usuario
       if (data.data.tipo_usuario === 'administrador') {
          navigate('/admin');
       } else {
          navigate('/app/dashboard');
       }
     } catch (error) {
        alert(error.message);
      }
    };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  useEffect(() => {
    const handleBackButton = () => {
      navigate('/', { replace: false });
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [navigate]);



  return (
    <div className="login-page-container">
      <div className="login-page-content">
        <div className="login-card">

          {/* ── PANEL IZQUIERDO ── */}
          <div className="login-card-left">

            <div className="login-left-center">
                {/* Brand */}
                <div className="login-brand">
                  <img
                    src="/img/aseo-corp-logo.png"
                    alt="AseoCorp"
                    className="login-brand-logo"
                  />
                  <svg height="34" viewBox="0 0 150 34" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                    <text
                      y="26"
                      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: '26px', fontWeight: 700, letterSpacing: '-0.3px' }}
                    >
                      <tspan style={{ fill: '#ffffff' }}>Aseo</tspan><tspan style={{ fill: '#4466ff' }}>Corp</tspan>
                    </text>
                  </svg>
                </div>

              {/* Título + divider + subtítulo */}
              <div className="login-left-body">
                <h2 className="login-left-title">
                  Bienvenido a<br />Aseo<span style={{ color: '#4466ff' }}>Corp</span>
                </h2>
                <div className="login-left-divider"></div>
                <p className="login-left-subtitle">
                  Sistema de gestión para trabajadores,<br />
                  contratos, pagos y asistencia.
                </p>
              </div>
            </div>

            <div className="login-left-dots">
              {Array.from({ length: 25 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
          </div>

          {/* ── PANEL DERECHO ── */}
          <form className="login-card-right" onSubmit={handleSubmit}>
            <h1 className="login-title">Iniciar sesión</h1>
            <p className="login-subtitle">Accede a tu cuenta</p>

            {/* Email */}
            <div className="login-field">
              <label className="login-label" htmlFor="email">
                Correo electrónico
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  className="login-input"
                  type="email"
                  id="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="login-field">
              <label className="login-label" htmlFor="password">
                Contraseña
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Botones */}
            <div className="login-buttons">
              <button
                type="submit"
                className="login-button-primary"
                style={{
                  background: 'linear-gradient(135deg, #2244cc 0%, #2244cc 100%)',
                  opacity: 1,
                  boxShadow: 'none',
                }}
              >
                Ingresar
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>

            <p className="login-footer">
              ¿No tienes cuenta?{' '}
              <button type="button" className="login-link">Solicita acceso</button>
            </p>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Login;
