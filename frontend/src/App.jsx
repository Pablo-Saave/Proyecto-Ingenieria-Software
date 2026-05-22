import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contratos from './pages/Contratos';
import Trabajadores from './pages/Trabajadores';
import Ausencias from './pages/ausencias';
import './styles/globals.css';

function ProtectedRoute({ isLoggedIn, children }) {
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const handleLoginSuccess = (role = 'admin') => {
    setIsLoggedIn(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            isLoggedIn ? <Navigate to="/admin" replace /> : <Landing onLoginSuccess={handleLoginSuccess} />
          } 
        />
        <Route 
          path="/login" 
          element={
            isLoggedIn ? <Navigate to="/admin" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
          } 
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Dashboard userRole={userRole} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trabajadores"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
               <Trabajadores onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/ausencias" element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
             <Ausencias onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route
          path="/admin/contratos"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Contratos onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
