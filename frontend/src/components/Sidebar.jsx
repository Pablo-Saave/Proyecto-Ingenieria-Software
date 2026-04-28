import React, { useState } from 'react';
import '../styles/sidebar.css';
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  DollarSign,
  Trash2,
} from 'lucide-react';

function Sidebar() {
  const [activeItem, setActiveItem] = useState('dashboard');

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
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
    },
    {
      id: 'pagos',
      label: 'Pagos',
      icon: DollarSign,
    },
  ];

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon-broom">
          <Trash2 size={22} />
        </div>
        <span className="logo-text">AseoCorp</span>
      </div>

      {/* Menu Items */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveItem(item.id);
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="sidebar-user">
        <div className="user-avatar">A</div>
        <div className="user-info">
          <p className="user-name">Admin</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
