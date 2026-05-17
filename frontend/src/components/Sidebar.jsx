import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  DollarSign,
} from 'lucide-react';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState(() => {
    if (location.pathname === '/admin/contratos') return 'contratos';
    return 'dashboard';
  });

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin',
    },
    {
      id: 'trabajadores',
      label: 'Trabajadores',
      icon: Users,
    },
    {
      id: 'asistencia',
      label: 'Asistencia',
      icon: Clock,
    },
    {
      id: 'contratos',
      label: 'Contratos',
      icon: FileText,
      path: '/admin/contratos',
    },
    {
      id: 'pagos',
      label: 'Pagos',
      icon: DollarSign,
    },
  ];

  const handleMenuClick = (item) => {
    if (!item.path) {
      return;
    }
    setActiveItem(item.id);
    navigate(item.path);
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/img/aseo-corp-logo.png" alt="AseoCorp" className="logo-icon-image" />
        <span className="logo-text">Aseo<span className="logo-text-corp">Corp</span></span>
      </div>

      {/* Menu Items */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="sidebar-user">
        <img src="/img/usuario.png" alt="Usuario" className="user-avatar-img" />
        <div className="user-info">
          <p className="user-name">Admin</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
