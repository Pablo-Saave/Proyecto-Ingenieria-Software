import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSignature, Users, Wallet, Briefcase, AlertTriangle, Info, Folder,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  getTodosLosContratos,
  getTodasLasRemuneraciones,
  getTrabajadoresSinCuadrilla,
  getResumenProyectos,
} from '../services/dashboardService';

const DIAS_ALERTA_CONTRATO = 30;
const HOY = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const diasRestantes = (fecha) => {
  const term = new Date(fecha);
  return Math.round((term - HOY()) / (1000 * 60 * 60 * 24));
};

const formatTiempo = (dias) => {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`;
  if (dias === 0) return 'Vence hoy';
  return `Vence en ${dias}d`;
};

// ── Tarjeta de métrica (fila superior) ──────────────────────────────────────
function MetricCard({ icon: Icon, title, value, subtitle, badge }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <p className="metric-title">{title}</p>
        <Icon className="metric-icon" />
      </div>
      <div className="metric-value">{value}</div>
      {subtitle && <p className="metric-subtitle">{subtitle}</p>}
      {badge && <span className={`metric-badge badge-${badge.tone}`}>{badge.text}</span>}
    </div>
  );
}

// ── Tarjeta de alerta individual ─────────────────────────────────────────────
function AlertCard({ tone = 'default', icon: Icon, title, description, timestamp }) {
  return (
    <div className={`alert-card alert-${tone}`}>
      <div className="alert-icon">
        <Icon size={13} />
      </div>
      <div className="alert-content">
        <p className="alert-title">{title}</p>
        <p className="alert-description">{description}</p>
      </div>
      <span className="alert-timestamp">{timestamp}</span>
    </div>
  );
}

function AdminDashboard({ usuario, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [errores, setErrores] = useState({});
  const [contratosPorVencer, setContratosPorVencer] = useState([]);
  const [sinCuadrilla, setSinCuadrilla] = useState([]);
  const [remuneracionesPendientes, setRemuneracionesPendientes] = useState([]);
  const [proyectos, setProyectos] = useState({ activos: 0, inactivos: 0 });
  const [mostrarTodasAlertas, setMostrarTodasAlertas] = useState(false);

  useEffect(() => {
    const cargarTodo = async () => {
      setLoading(true);
      const nuevosErrores = {};

      const [rContratos, rSinCuadrilla, rRemun, rProyectos] = await Promise.allSettled([
        getTodosLosContratos(),
        getTrabajadoresSinCuadrilla(),
        getTodasLasRemuneraciones(),
        getResumenProyectos(),
      ]);

      if (rContratos.status === 'fulfilled') {
        const lista = rContratos.value?.data ?? [];
        const porVencer = lista
          .filter((c) => c.fecha_termino && diasRestantes(c.fecha_termino) <= DIAS_ALERTA_CONTRATO)
          .sort((a, b) => new Date(a.fecha_termino) - new Date(b.fecha_termino));
        setContratosPorVencer(porVencer);
      } else nuevosErrores.contratos = rContratos.reason?.message;

      if (rSinCuadrilla.status === 'fulfilled') {
        const lista = rSinCuadrilla.value?.data ?? [];
        // Solo "trabajadores" reales — un supervisor/admin sin cuadrilla es normal, no una alerta
        setSinCuadrilla(lista.filter((t) => t.tipo_usuario === 'trabajador'));
      } else nuevosErrores.sinCuadrilla = rSinCuadrilla.reason?.message;

      if (rRemun.status === 'fulfilled') {
        const lista = Array.isArray(rRemun.value) ? rRemun.value : rRemun.value?.data ?? [];
        setRemuneracionesPendientes(
          lista.filter((r) => r.estado_pago?.toLowerCase() === 'pendiente')
        );
      } else nuevosErrores.remuneraciones = rRemun.reason?.message;

      if (rProyectos.status === 'fulfilled') {
        const lista = rProyectos.value?.data ?? [];
        setProyectos({
          activos: lista.filter((p) => p.estado === 'activo').length,
          inactivos: lista.filter((p) => p.estado !== 'activo').length,
        });
      } else nuevosErrores.proyectos = rProyectos.reason?.message;

      setErrores(nuevosErrores);
      setLoading(false);
    };

    cargarTodo();
  }, []);

  // ── Alertas combinadas (contratos por vencer + sin cuadrilla + pagos) ──────
  const alertas = [
    ...contratosPorVencer.map((c) => ({
      key: `contrato-${c.id_contrato}`,
      tone: diasRestantes(c.fecha_termino) <= 7 ? 'warning' : 'default',
      icon: FileSignature,
      title: 'Renovación de contrato',
      description: `${c.trabajador?.nombres ?? ''} ${c.trabajador?.apellidos ?? ''} finaliza su contrato pronto.`,
      timestamp: formatTiempo(diasRestantes(c.fecha_termino)),
    })),
    ...sinCuadrilla.map((t) => ({
      key: `cuadrilla-${t.id_trabajador}`,
      tone: 'default',
      icon: Users,
      title: 'Sin cuadrilla asignada',
      description: `${t.nombres} ${t.apellidos} no tiene una cuadrilla asignada.`,
      timestamp: '',
    })),
    ...remuneracionesPendientes.map((r) => ({
      key: `pago-${r.id_remuneracion}`,
      tone: 'warning',
      icon: Wallet,
      title: 'Pago pendiente',
      description: `${r.trabajador?.nombres ?? ''} ${r.trabajador?.apellidos ?? ''} tiene un pago pendiente.`,
      timestamp: '',
    })),
  ];
  const alertasVisibles = mostrarTodasAlertas ? alertas : alertas.slice(0, 3);

  // ── Donut de proyectos ──────────────────────────────────────────────────────
  const totalProyectos = proyectos.activos + proyectos.inactivos;
  const pctActivos = totalProyectos > 0 ? Math.round((proyectos.activos / totalProyectos) * 100) : 0;
  const pctInactivos = totalProyectos > 0 ? 100 - pctActivos : 0;
  const RADIO = 46;
  const CIRC = 2 * Math.PI * RADIO;
  const activosOffset = totalProyectos > 0 ? CIRC - (proyectos.activos / totalProyectos) * CIRC : CIRC;

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Dashboard Administrativo</h1>
              <p className="vista-general-subtitle">Resumen general de AseoCorp</p>
            </div>
          </div>

          {loading ? (
            <div className="dashboard-loading">
              <div className="tw-spinner" /> Cargando panel administrativo...
            </div>
          ) : (
            <>
              {/* ── Métricas ──────────────────────────────────────────────── */}
              <div className="metrics-grid">
                <MetricCard
                  icon={FileSignature}
                  title="Contratos por vencer"
                  value={errores.contratos ? '—' : contratosPorVencer.length}
                  subtitle="Próximos 30 días"
                  badge={contratosPorVencer.length > 0 ? { tone: 'warning', text: 'Requiere acción' } : null}
                />
                <MetricCard
                  icon={Users}
                  title="Trabajadores sin cuadrilla"
                  value={errores.sinCuadrilla ? '—' : sinCuadrilla.length}
                  subtitle="Sin asignar"
                  badge={sinCuadrilla.length > 0 ? { tone: 'warning', text: 'Requiere acción' } : null}
                />
                <MetricCard
                  icon={Wallet}
                  title="Pagos pendientes"
                  value={errores.remuneraciones ? '—' : remuneracionesPendientes.length}
                  subtitle="Este período"
                  badge={remuneracionesPendientes.length === 0 ? { tone: 'success', text: 'Al día' } : null}
                />
                <MetricCard
                  icon={Briefcase}
                  title="Proyectos activos"
                  value={errores.proyectos ? '—' : proyectos.activos}
                  subtitle={`${proyectos.inactivos} inactivos`}
                />
              </div>

              {errores.proyectos && (
                <div className="tw-error-banner" style={{ marginBottom: '16px' }}>
                  <AlertTriangle size={16} /> No se pudo cargar el resumen de proyectos: {errores.proyectos}
                </div>
              )}

              {/* ── Alertas y Proyectos ───────────────────────────────────── */}
              <div className="alerts-coverage-wrapper">

                <div className="alerts-section">
                  <div className="section-header">
                    <h3 className="section-title">Alertas y Acciones</h3>
                    {alertas.length > 3 && (
                      <button
                        type="button"
                        className="see-all-link"
                        onClick={() => setMostrarTodasAlertas(prev => !prev)}
                      >
                        {mostrarTodasAlertas ? 'Ver menos' : 'Ver todas'}
                      </button>
                    )}
                  </div>
                  {alertas.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', padding: '8px 0' }}>
                      <Info size={13} /> No hay alertas activas por el momento
                    </div>
                  ) : (
                    <div className="alerts-grid">
                      {alertasVisibles.map((a) => (
                        <AlertCard key={a.key} tone={a.tone} icon={a.icon} title={a.title} description={a.description} timestamp={a.timestamp} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="coverage-section">
                  <div className="section-header">
                    <h3 className="section-title">
                      Proyectos
                      <span className="badge-live">En vivo</span>
                    </h3>
                  </div>

                  {errores.proyectos ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', padding: '8px 0' }}>
                      <Info size={13} /> Sin datos de proyectos
                    </div>
                  ) : (
                    <>
                      <div className="proyectos-donut-wrapper">
                        <div className="proyectos-donut">
                          <svg width="110" height="110" viewBox="0 0 110 110">
                            <circle cx="55" cy="55" r={RADIO} fill="none" stroke="var(--border-color)" strokeWidth="12" />
                            <circle
                              cx="55" cy="55" r={RADIO} fill="none"
                              stroke="var(--primary-color)" strokeWidth="12"
                              strokeDasharray={CIRC}
                              strokeDashoffset={activosOffset}
                              strokeLinecap="round"
                              transform="rotate(-90 55 55)"
                            />
                          </svg>
                          <div className="proyectos-donut-value">
                            <div className="proyectos-donut-number">{proyectos.activos}</div>
                            <div className="proyectos-donut-label">Activos</div>
                          </div>
                        </div>
                        <div className="proyectos-legend">
                          <div className="proyectos-legend-row">
                            <span className="proyectos-legend-dot" style={{ background: 'var(--primary-color)' }} />
                            <span className="proyectos-legend-name">Activos</span>
                            <span className="proyectos-legend-count">{proyectos.activos}</span>
                            <span className="proyectos-legend-pct">{pctActivos}%</span>
                          </div>
                          <div className="proyectos-legend-row">
                            <span className="proyectos-legend-dot" style={{ background: 'var(--border-color)' }} />
                            <span className="proyectos-legend-name">Inactivos</span>
                            <span className="proyectos-legend-count">{proyectos.inactivos}</span>
                            <span className="proyectos-legend-pct">{pctInactivos}%</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/admin/proyectos" className="btn-ver-proyectos">
                        <Folder size={12} /> Ver todos los proyectos
                      </Link>
                    </>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
