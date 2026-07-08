import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Landing                from './pages/Landing';
import Login                  from './pages/Login';
import Dashboard              from './pages/Dashboard';
import Contratos              from './pages/Contratos'; // Administrador
import ContratoProyectos      from './pages/ContratoProyectos'; // Administrador
import ContratosSupervisor    from './pages/ContratosSupervisor'; // Supervisor
import ContratosTrabajador    from './pages/ContratosTrabajador'; // Trabajador
import Trabajadores           from './pages/trabajadores';
import Clientes               from './pages/Clientes'; // Administrador
import Ausencias              from './pages/ausencias';
import PagosSupervisor        from './pages/PagosSupervisor'; // Supervisor
import PagosTrabajador        from './pages/PagosTrabajador'; // Trabajador
import Asignaciones           from './pages/asignaciones';
import MisAusencias           from './pages/misAusencias';
import MisAsignaciones        from './pages/misAsignaciones';
import DashboardPersonal      from './pages/miDashboard';
import CanalesAvisosAdmin     from './pages/CanalesAvisosAdmin';
import CanalesAvisosSupervisor from './pages/CanalesAvisosSupervisor';
import CanalesAvisosTrabajador from './pages/CanalesAvisosTrabajador';
import AccidentesModuloTrabajador from './pages/AccidentesModuloTrabajador';
import AccidentesModuloSupervisor from './pages/AccidentesModuloSupervisor';
import CambiarPassword from './pages/CambiarPassword';
import Proyectos  from './pages/Proyectos';
import RemuneracionesAdmin from './pages/RemuneracionesAdmin';



import { getUsuarioLocal, logoutClean } from './services/authService';
import { NotificacionesProvider } from './context/NotificacionesContext';
import './styles/globals.css';
import Inventarios from './pages/Inventario';
import AccidentesModuloAdministrador from './pages/AccidentesModuloAdministrador';
import RegistrarAccidentesModuloSupervisor from './pages/RegistrarAccidentesModuloSupervisor';

function ProtectedRoute({ isLoggedIn, children }) {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function RolRoute({ isLoggedIn, usuario, rolesPermitidos, children }) {
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!rolesPermitidos.includes(usuario?.tipo_usuario)) {
    const home = usuario?.tipo_usuario === 'administrador' ? '/admin' : '/app/dashboard';
    return <Navigate to={home} replace />;
  }
  return children;
}

function HomeRol({ usuario }) {
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.tipo_usuario === 'administrador') return <Navigate to="/admin" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuario,    setUsuario]    = useState(null);

  useEffect(() => {
    const usuarioGuardado = getUsuarioLocal();
    const token = localStorage.getItem('token');
    if (usuarioGuardado && token) { setUsuario(usuarioGuardado); setIsLoggedIn(true); }
  }, []);

  const handleLoginSuccess = (usuarioData) => { setUsuario(usuarioData); setIsLoggedIn(true); };
  const handleLogout = () => { logoutClean(); setUsuario(null); setIsLoggedIn(false); };
  const pageProps = { usuario, onLogout: handleLogout };

  return (
    <BrowserRouter>
      <NotificacionesProvider usuario={usuario}>
      <Routes>
        {/* Públicas */}
        <Route path="/"      element={isLoggedIn ? <HomeRol usuario={usuario} /> : <Landing onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/login" element={isLoggedIn ? <HomeRol usuario={usuario} /> : <Login   onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/cambiar-password" element={<CambiarPassword />} />

        {/* Solo Administrador */}
        <Route path="/admin" element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}><Dashboard {...pageProps} /></RolRoute>} />
        <Route path="/admin/trabajadores" element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}> <Trabajadores {...pageProps} /> </RolRoute>} />
        <Route path="/admin/clientes"     element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}><Clientes {...pageProps} /></RolRoute>} />
        <Route path="/admin/contratos"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}><Contratos {...pageProps} /></RolRoute>} />
        <Route path="/admin/contratos-proyecto" element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}><ContratoProyectos {...pageProps} /></RolRoute>} />
        <Route path="/admin/pagos"        element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}><RemuneracionesAdmin {...pageProps} ></RemuneracionesAdmin></RolRoute>} />
        <Route path="/admin/asignaciones" element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}><Asignaciones {...pageProps} /></RolRoute>} />
        <Route path="/admin/avisos"       element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}><CanalesAvisosAdmin {...pageProps} /></RolRoute>} />
        <Route path="/admin/proyectos"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}><Proyectos {...pageProps} ></Proyectos></RolRoute>}/>
        <Route path="/admin/accidentes-laborales"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador']}> <AccidentesModuloAdministrador {...pageProps} ></AccidentesModuloAdministrador> </RolRoute>}/>


        {/* Administrador + Supervisor */}
        <Route path="/admin/ausencias"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['administrador', 'supervisor']}><Ausencias {...pageProps} /></RolRoute>} />

        {/* Solo Supervisor */}
        <Route path="/supervisor/contratos" element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['supervisor']}><ContratosSupervisor {...pageProps} /></RolRoute>} />
        <Route path="/supervisor/pagos"      element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['supervisor']}><PagosSupervisor {...pageProps} /></RolRoute>} />
        <Route path="/supervisor/avisos"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['supervisor']}><CanalesAvisosSupervisor {...pageProps} /></RolRoute>} />
        <Route path="/supervisor/inventario"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['supervisor']}> <Inventarios {...pageProps} ></Inventarios> </RolRoute>} />
        <Route path="/supervisor/accidentes-laborales"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['supervisor']}> <AccidentesModuloSupervisor {...pageProps} /> </RolRoute>} />
        <Route path="/supervisor/registrar-accidente"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['supervisor']}><RegistrarAccidentesModuloSupervisor {...pageProps} ></RegistrarAccidentesModuloSupervisor></RolRoute>} />


        {/* Solo Trabajador */}
        <Route path="/app/mis-accidentes"    element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['trabajador']} > <AccidentesModuloTrabajador {...pageProps} >a</AccidentesModuloTrabajador> </RolRoute>} />

        {/* Todos los roles */}
        <Route path="/app/dashboard"       element={<ProtectedRoute isLoggedIn={isLoggedIn}><DashboardPersonal {...pageProps} /></ProtectedRoute>} />
        <Route path="/app/mis-ausencias"   element={<ProtectedRoute isLoggedIn={isLoggedIn}><MisAusencias {...pageProps} /></ProtectedRoute>} />
        <Route path="/app/mis-asignaciones" element={<ProtectedRoute isLoggedIn={isLoggedIn}><MisAsignaciones {...pageProps} /></ProtectedRoute>} />
        <Route path="/app/mis-contratos"   element={<ProtectedRoute isLoggedIn={isLoggedIn}><ContratosTrabajador {...pageProps} /></ProtectedRoute>} />
        <Route path="/app/mis-pagos"       element={<RolRoute isLoggedIn={isLoggedIn} usuario={usuario} rolesPermitidos={['trabajador']}><PagosTrabajador {...pageProps} /></RolRoute>} />
        <Route path="/app/avisos"          element={<ProtectedRoute isLoggedIn={isLoggedIn}><CanalesAvisosTrabajador {...pageProps} /></ProtectedRoute>} />
      </Routes>
      </NotificacionesProvider>
    </BrowserRouter>
  );
}

export default App;