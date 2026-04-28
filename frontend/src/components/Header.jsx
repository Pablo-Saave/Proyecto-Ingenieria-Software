import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/header.css';
import { Bell, LogOut } from 'lucide-react';

function Header({ onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="breadcrumb">
        <span className="breadcrumb-item">AseoCorp</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">Dashboard</span>
      </div>

      <div className="header-actions">
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>
        <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

export default Header;
