import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/dashboard.css';
import { User, CalendarOff, Briefcase, CheckCircle, Clock, XCircle } from 'lucide-react';

const API_BASE = 'http://localhost:3000';

async function apiFetch(path) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

function DashboardPersonal({ usuario, onLogout }) {
  const [ausencias, setAusencias]     = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading]         = useState(true);

  const idTrabajador = usuario?.id_trabajador;

  useEffect(() => {
    if (!idTrabajador) return;
    Promise.all([
      apiFetch(`/api/ausencias/trabajador/${idTrabajador}`),
      apiFetch(`/api/asignados/trabajador/${idTrabajador}`),
    ]).then(([resA, resAs]) => {
      setAusencias(Array.isArray(resA) ? resA : resA.data ?? []);
      setAsignaciones(Array.isArray(resAs) ? resAs : resAs.data ?? []);
    }).finally(() => setLoading(false));
  }, [idTrabajador]);

  const aprobadas  = ausencias.filter((a) => a.estado === 'Aprobada').length;
  const pendientes = ausencias.filter((a) => a.estado === 'Pendiente').length;
  const rechazadas = ausencias.filter((a) => a.estado === 'Rechazada').length;
  const activasCount = asignaciones.filter((a) => !a.fecha_retiro).length;

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const estadoBadgeClass = (estado) => {
    if (estado === 'Aprobada')  return 'badge-activo';
    if (estado === 'Rechazada') return 'badge-inactivo';
    return 'badge-licencia';
  };

  const ultimasAusencias = [...ausencias]
    .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
    .slice(0, 3);

  const rolLabel = {
    trabajador:    'Trabajador',
    supervisor:    'Supervisor',
    administrador: 'Administrador',
  }[usuario?.tipo_usuario] ?? usuario?.tipo_usuario;

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          {/* Encabezado */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Mi Dashboard</h1>
              <p className="vista-general-subtitle">Resumen personal de tu actividad</p>
            </div>
          </div>

          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando tu información...</div>
          ) : (
            <>
              {/* Perfil */}
              <div className="metric-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '20px 24px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: '#EEF2FF', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#4F46E5' }}>
                    {(usuario?.nombres?.[0] ?? '?').toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    {usuario?.nombres} {usuario?.apellidos}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
                    {usuario?.correo} · {rolLabel}
                  </p>
                </div>
                <span className="tw-badge badge-activo">{usuario?.estado_laboral ?? 'Activo'}</span>
              </div>

              {/* Métricas */}
              <div className="metrics-grid" style={{ marginBottom: '24px' }}>
                <div className="metric-card">
                  <div className="metric-header">
                    <h3 className="metric-title">Asignaciones Activas</h3>
                    <Briefcase size={20} color="#4F46E5" />
                  </div>
                  <div className="metric-value">{activasCount}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <h3 className="metric-title">Ausencias Aprobadas</h3>
                    <CheckCircle size={20} color="#10B981" />
                  </div>
                  <div className="metric-value" style={{ color: '#10B981' }}>{aprobadas}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <h3 className="metric-title">Solicitudes Pendientes</h3>
                    <Clock size={20} color="#F59E0B" />
                  </div>
                  <div className="metric-value" style={{ color: '#F59E0B' }}>{pendientes}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <h3 className="metric-title">Ausencias Rechazadas</h3>
                    <XCircle size={20} color="#EF4444" />
                  </div>
                  <div className="metric-value" style={{ color: '#EF4444' }}>{rechazadas}</div>
                </div>
              </div>

              {/* Últimas ausencias */}
              <div className="alerts-coverage-wrapper">
                <div className="alerts-section">
                  <div className="section-header">
                    <h2 className="section-title">Últimas Ausencias</h2>
                  </div>
                  {ultimasAusencias.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#9ca3af', padding: '12px 0' }}>
                      No tienes ausencias registradas.
                    </p>
                  ) : (
                    <div className="tw-table-card" style={{ marginTop: '8px' }}>
                      <table className="tw-table">
                        <thead>
                          <tr>
                            <th>Inicio</th>
                            <th>Término</th>
                            <th>Motivo</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ultimasAusencias.map((a) => (
                            <tr key={a.id_ausencia}>
                              <td>{formatFecha(a.fecha_inicio)}</td>
                              <td>{formatFecha(a.fecha_termino)}</td>
                              <td className="aus-motivo">{a.motivo ?? '—'}</td>
                              <td>
                                <span className={`tw-badge ${estadoBadgeClass(a.estado)}`}>
                                  {a.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Asignaciones activas */}
                <div className="coverage-section">
                  <div className="section-header">
                    <h2 className="section-title">Asignaciones Activas</h2>
                  </div>
                  {asignaciones.filter((a) => !a.fecha_retiro).length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#9ca3af', padding: '12px 0' }}>
                      No tienes asignaciones activas.
                    </p>
                  ) : (
                    <div className="coverage-list">
                      {asignaciones.filter((a) => !a.fecha_retiro).map((a) => (
                        <div key={a.id_asignado} className="coverage-item">
                          <div className="coverage-info">
                            <h4 className="coverage-name">{a.cargo_operativo ?? 'Sin cargo'}</h4>
                            <div className="coverage-stats">
                              <span className="coverage-fraction">{a.tipo_jornada ?? '—'}</span>
                              <span className="coverage-percentage">desde {formatFecha(a.fecha_asignacion)}</span>
                            </div>
                          </div>
                          <span className="tw-badge badge-activo" style={{ fontSize: '11px' }}>Activa</span>
                        </div>
                      ))}
                    </div>
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

export default DashboardPersonal;