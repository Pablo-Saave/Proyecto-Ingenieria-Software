import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/dashboard.css';

function AdminLayout({ children, usuario, onLogout }) {
  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
