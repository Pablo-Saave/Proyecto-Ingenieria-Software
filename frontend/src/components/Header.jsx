import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/header.css';
import { LogOut } from 'lucide-react';
import NotificationBell from './NotificationBell';

function Header({ onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-actions">
        <NotificationBell />
        <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

export default Header;