import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Landing           from './pages/Landing';
import Login             from './pages/Login';
import Dashboard         from './pages/Dashboard';
import Contratos         from './pages/Contratos';
import Trabajadores      from './pages/trabajadores';
import Ausencias         from './pages/ausencias';
import { Pagos }         from './pages/Pagos';
import Asignaciones      from './pages/asignaciones';

import MisAusencias      from './pages/misAusencias';
import MisAsignaciones   from './pages/misAsignaciones';
import DashboardPersonal from './pages/miDashboard';

import { getUsuarioLocal, logoutClean } from './services/authService';
import './styles/globals.css';

// ── Ruta protegida genérica ───────────────────────────────────────────────
function ProtectedRoute({ isLoggedIn, children }) {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

// ── Ruta protegida por rol ────────────────────────────────────────────────
function RolRoute({ isLoggedIn, usuario, rolesPermitidos, children }) {
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!rolesPermitidos.includes(usuario?.tipo_usuario)) {
    // Redirigir a su home según rol
    const home = usuario?.tipo_usuario === 'administrador' ? '/admin' : '/app/dashboard';
    return <Navigate to={home} replace />;
  }
  return children;
}

// ── Ruta home según rol ───────────────────────────────────────────────────
function HomeRol({ usuario }) {
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.tipo_usuario === 'administrador') return <Navigate to="/admin" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

// ── App ───────────────────────────────────────────────────────────────────
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuario, setUsuario]       = useState(null);

  // Restaurar sesión desde localStorage al recargar
  useEffect(() => {
    const usuarioGuardado = getUsuarioLocal();
    const token = localStorage.getItem('token');
    if (usuarioGuardado && token) {
      setUsuario(usuarioGuardado);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (usuarioData) => {
    setUsuario(usuarioData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    logoutClean();
    setUsuario(null);
    setIsLoggedIn(false);
  };

  // Props comunes que reciben todas las páginas
  const pageProps = { usuario, onLogout: handleLogout };

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Públicas ─────────────────────────────────────────────────── */}
        <Route path="/"      element={isLoggedIn ? <HomeRol usuario={usuario} /> : <Landing onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/login" element={isLoggedIn ? <HomeRol usuario={usuario} /> : <Login onLoginSuccess={handleLoginSuccess} />} />

        {/* ── Solo Administrador ────────────────────────────────────────── */}
        <Route path="/admin" element={
          <RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}>
            <Dashboard {...pageProps} />
          </RolRoute>
        } />
        <Route path="/admin/trabajadores" element={
          <RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}>
            <Trabajadores {...pageProps} />
          </RolRoute>
        } />
        <Route path="/admin/contratos" element={
          <RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}>
            <Contratos {...pageProps} />
          </RolRoute>
        } />
        <Route path="/admin/pagos" element={
         <RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}>
           <Pagos {...pageProps} usuario={usuario} />
         </RolRoute>
        } />
        <Route path="/admin/asignaciones" element={
          <RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}>
            <Asignaciones {...pageProps} />
          </RolRoute>
        } />

        {/* ── Administrador + Supervisor ────────────────────────────────── */}
        <Route path="/admin/ausencias" element={
          <RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador', 'supervisor']}>
            <Ausencias {...pageProps} />
          </RolRoute>
        } />

        {/* ── Todos los roles ───────────────────────────────────────────── */}
        <Route path="/app/dashboard" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <DashboardPersonal {...pageProps} />
          </ProtectedRoute>
        } />
        <Route path="/app/mis-ausencias" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <MisAusencias {...pageProps} />
          </ProtectedRoute>
        } />
        <Route path="/app/mis-asignaciones" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <MisAsignaciones {...pageProps} />
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;