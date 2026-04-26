import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/dashboard.css';
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  DollarSign,
  Users,
} from 'lucide-react';

function Dashboard({ userRole, onLogout }) {
  const metrics = [
    {
      id: 1,
      title: 'Turnos Activos',
      value: '142',
      badge: '94%',
      badgeColor: 'success',
      icon: Users,
    },
    {
      id: 2,
      title: 'Pagos Pendientes',
      value: '$12.4M',
      subtitle: 'Quincena actual',
      icon: DollarSign,
    },
    {
      id: 3,
      title: 'Contratos por Expirar',
      value: '8',
      badge: 'Próximos 7 días',
      badgeColor: 'warning',
      icon: Briefcase,
    },
  ];

  const alerts = [
    {
      id: 1,
      type: 'warning',
      title: 'Falta salida registrada',
      description: 'Juan Pérez no registró salida en el turno de mañana (Torre Titanium).',
      timestamp: 'Hace 2 horas',
      icon: AlertCircle,
    },
    {
      id: 2,
      type: 'default',
      title: 'Renovación de contrato',
      description: 'María González finaliza su contrato de plazo fijo este viernes.',
      timestamp: 'Vence en 3 días',
      icon: AlertTriangle,
    },
  ];

  const coverage = [
    {
      id: 1,
      name: 'Edificio Costanera',
      current: 45,
      total: 48,
      percentage: 93,
      color: '#4F46E5',
    },
    {
      id: 2,
      name: 'Torre Titanium',
      current: 32,
      total: 32,
      percentage: 100,
      color: '#10B981',
    },
    {
      id: 3,
      name: 'Mall Plaza',
      current: 65,
      total: 75,
      percentage: 86,
      color: '#F59E0B',
    },
  ];

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">
          {/* Vista General Header */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Vista General</h1>
              <p className="vista-general-subtitle">Resumen operativo para hoy, 24 de Octubre</p>
            </div>
            <button className="btn-nuevo-trabajador">
              <span>+</span> Nuevo Trabajador
            </button>
          </div>

          {/* Métricas */}
          <div className="metrics-grid">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.id} className="metric-card">
                  <div className="metric-header">
                    <h3 className="metric-title">{metric.title}</h3>
                    <Icon className="metric-icon" size={20} />
                  </div>
                  <div className="metric-value">{metric.value}</div>
                  {metric.subtitle && (
                    <p className="metric-subtitle">{metric.subtitle}</p>
                  )}
                  {metric.badge && (
                    <div className={`metric-badge badge-${metric.badgeColor}`}>
                      {metric.badge}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Alertas y Cobertura Container */}
          <div className="alerts-coverage-wrapper">
            {/* Alertas y Acciones */}
            <div className="alerts-section">
              <div className="section-header">
                <h2 className="section-title">Alertas y Acciones</h2>
                <button className="see-all-link" onClick={() => {}}>
                  Ver todas
                </button>
              </div>
              <div className="alerts-grid">
                {alerts.map((alert) => {
                  const AlertIcon = alert.icon;
                  return (
                    <div key={alert.id} className={`alert-card alert-${alert.type}`}>
                      <div className="alert-icon">
                        <AlertIcon size={16} />
                      </div>
                      <div className="alert-content">
                        <h4 className="alert-title">{alert.title}</h4>
                        <p className="alert-description">{alert.description}</p>
                      </div>
                      <div className="alert-timestamp">{alert.timestamp}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cobertura Actual */}
            <div className="coverage-section">
              <div className="section-header">
                <h2 className="section-title">
                  Cobertura Actual
                  <span className="badge-live">En vivo</span>
                </h2>
                <button className="coverage-map-link" onClick={() => {}}>
                  Ver mapa de cobertura
                </button>
              </div>
              <div className="coverage-list">
                {coverage.map((item) => (
                  <div key={item.id} className="coverage-item">
                    <div className="coverage-info">
                      <h4 className="coverage-name">{item.name}</h4>
                      <div className="coverage-stats">
                        <span className="coverage-fraction">
                          {item.current}/{item.total}
                        </span>
                        <span className="coverage-percentage">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="coverage-bar">
                      <div
                        className="coverage-bar-fill"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
