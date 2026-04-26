import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAdminDemo = () => {
    setTimeout(() => {
      onLoginSuccess('admin');
      navigate('/admin');
    }, 300);
  };

  const handleTrabajadorDemo = () => {
    setTimeout(() => {
      onLoginSuccess('trabajador');
      navigate('/admin');
    }, 300);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Ingresar a tu cuenta</h1>
        <p className="login-subtitle">Accede al sistema de gestión de AseoCorp</p>

        <form className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </form>

        <div className="login-buttons">
          <button type="button" className="login-button-primary" disabled>
            Iniciar Sesión
          </button>

          <button
            type="button"
            className="login-button-demo"
            onClick={handleAdminDemo}
          >
            Iniciar Sesión como Admin Demo
          </button>

          <button 
            type="button" 
            className="login-button-demo"
            disabled
          >
            Iniciar Sesión como Trabajador Demo
          </button>
        </div>

        <p className="login-footer">
          ¿No tienes cuenta? <a href="#">Solicita acceso</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
