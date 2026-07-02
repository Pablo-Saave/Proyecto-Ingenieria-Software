import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';
import { LayoutDashboard, Users, Clock, FileText, DollarSign, CalendarOff, Briefcase, Bell, ClipboardList, Building2 } from 'lucide-react';

// Menu por tipo de usuario
const MENU_POR_ROL = {
  administrador: [
    { id: 'dashboard',    label: 'Dashboard',       icon: LayoutDashboard, path: '/admin' },
    { id: 'trabajadores', label: 'Trabajadores',    icon: Users,           path: '/admin/trabajadores' },
    { id: 'clientes',     label: 'Clientes',        icon: Building2,       path: '/admin/clientes' },
    { id: 'ausencias',    label: 'Ausencias',       icon: CalendarOff,     path: '/admin/ausencias' },
    { id: 'contratos',    label: 'Contratos',       icon: FileText,        path: '/admin/contratos' },
    { id: 'contratos-proyecto', label: 'Contratos de Proyecto', icon: ClipboardList, path: '/admin/contratos-proyecto' },
    { id: 'pagos',        label: 'Pagos',           icon: DollarSign,      path: '/admin/pagos' },
    { id: 'asignaciones', label: 'Asignaciones',    icon: Users,           path: '/admin/asignaciones' },
    { id: 'avisos',       label: 'Canales de Avisos', icon: Bell,          path: '/admin/avisos' },
  ],
  supervisor: [
    { id: 'dashboard',        label: 'Mi Dashboard',      icon: LayoutDashboard, path: '/app/dashboard' },
    { id: 'mis-ausencias',    label: 'Mis Ausencias',     icon: CalendarOff,     path: '/app/mis-ausencias' },
    { id: 'mis-asignaciones', label: 'Mis Asignaciones',  icon: Briefcase,       path: '/app/mis-asignaciones' },
    { id: 'mis-contratos',    label: 'Mis Contratos',     icon: FileText,        path: '/app/mis-contratos' },
    { id: 'ausencias',        label: 'Ausencias',         icon: Clock,           path: '/admin/ausencias' },
    { id: 'avisos',           label: 'Canales de Avisos', icon: Bell,            path: '/supervisor/avisos' },
  ],
  trabajador: [
    { id: 'dashboard',        label: 'Mi Dashboard',      icon: LayoutDashboard, path: '/app/dashboard' },
    { id: 'mis-ausencias',    label: 'Mis Ausencias',     icon: CalendarOff,     path: '/app/mis-ausencias' },
    { id: 'mis-asignaciones', label: 'Mis Asignaciones',  icon: Briefcase,       path: '/app/mis-asignaciones' },
    { id: 'mis-contratos',    label: 'Mis Contratos',     icon: FileText,        path: '/app/mis-contratos' },
    { id: 'avisos',           label: 'Canales de Avisos', icon: Bell,            path: '/app/avisos' },
  ],
};

// Detectar item activo según la ruta actual
function getActiveItem(pathname, menuItems) {
  const match = menuItems.find((item) => item.path === pathname);
  return match?.id ?? menuItems[0]?.id;
}

function Sidebar({ usuario }) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const tipoUsuario = usuario?.tipo_usuario ?? 'trabajador';
  const menuItems   = MENU_POR_ROL[tipoUsuario] ?? MENU_POR_ROL['trabajador'];

  const [activeItem, setActiveItem] = useState(() => getActiveItem(location.pathname, menuItems));

  const handleMenuClick = (item) => { setActiveItem(item.id); navigate(item.path); };

  const nombreMostrado = usuario
    ? `${usuario.nombres?.split(' ')[0]} ${usuario.apellidos?.split(' ')[0]}`
    : 'Usuario';

  const rolLabel = { administrador: 'Administrador', supervisor: 'Supervisor', trabajador: 'Trabajador' }[tipoUsuario] ?? tipoUsuario;

  return (
    <div className="sidebar">
      <button className="sidebar-logo"
        onClick={() => navigate(tipoUsuario === 'administrador' ? '/admin' : '/app/dashboard')}
        style={{ background: 'none', cursor: 'pointer', padding: '0 12px' }}>
        <img src="/img/aseo-corp-logo.png" alt="AseoCorp" className="logo-icon-image" />
        <span className="logo-text">Aseo<span className="logo-text-corp">Corp</span></span>
      </button>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id}
              className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item)}>
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5' }}>
            {(usuario?.nombres?.[0] ?? 'U').toUpperCase()}
          </span>
        </div>
        <div className="user-info">
          <p className="user-name">{nombreMostrado}</p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{rolLabel}</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;