import React, { useState, useEffect } from 'react';
import {
  Briefcase, MapPin, Users, Calendar, ClipboardList,
  AlertCircle, Info, Clock,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { getMisAsignaciones } from '../services/asignacionesService';

const estadoBadgeClass = (estado) => {
  if (estado === 'activo') return 'badge-activo';
  return 'badge-inactivo';
};

const formatFecha = (f) =>
  f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function MisAsignaciones({ usuario, onLogout }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchAsignaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMisAsignaciones();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAsignaciones(); }, []);

  const esSupervisor = data?.tipo_usuario === 'supervisor';
  const esTrabajador  = data?.tipo_usuario === 'trabajador';

  // Normalizamos "actual" a un arreglo para poder renderizar con el mismo
  // componente tanto si es un solo objeto (trabajador) como una lista (supervisor)
  const proyectosActuales = esSupervisor
    ? (data?.actual ?? [])
    : (data?.actual ? [data.actual] : []);

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Mis Asignaciones</h1>
              <p className="vista-general-subtitle">
                {esSupervisor
                  ? 'Proyectos que supervisas actualmente y tu historial'
                  : 'Tu proyecto y cuadrilla actual'}
              </p>
            </div>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {loading ? (
            <div className="tw-table-card">
              <div className="tw-loading"><div className="tw-spinner" /> Cargando tus asignaciones...</div>
            </div>
          ) : (
            <>
              {/* ── Asignación(es) actual(es) ─────────────────────────────── */}
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>
                  Asignación actual
                </h2>

                {proyectosActuales.length === 0 ? (
                  <div className="tw-table-card">
                    <div className="tw-empty">
                      <Briefcase size={40} />
                      <p>
                        {esSupervisor
                          ? 'No tienes proyectos activos asignados como supervisor.'
                          : 'No estás asignado a ninguna cuadrilla actualmente.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '14px' }}>
                    {proyectosActuales.map((item) => {
                      // Para trabajador el shape es { proyecto, nombre_cuadrilla, ... }
                      // Para supervisor el shape es el Proyecto directo
                      const proyecto = esTrabajador ? item.proyecto : item;
                      return (
                        <div
                          key={esTrabajador ? item.id_cuadrilla : item.id_proyecto}
                          style={{
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '20px 24px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '18px',
                          }}
                        >
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '10px',
                            background: '#eef2ff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Briefcase size={20} color="#4F46E5" />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                                {proyecto?.nombre_proyecto ?? 'Proyecto sin nombre'}
                              </h3>
                              <span className={`tw-badge ${estadoBadgeClass(proyecto?.estado)}`}>
                                {proyecto?.estado ?? '—'}
                              </span>
                            </div>

                            <div style={{
                              display: 'flex', flexWrap: 'wrap', gap: '16px',
                              fontSize: '13px', color: '#6b7280',
                            }}>
                              {proyecto?.direccion && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <MapPin size={13} /> {proyecto.direccion}
                                </span>
                              )}

                              {esTrabajador && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Users size={13} /> Cuadrilla: {item.nombre_cuadrilla}
                                </span>
                              )}

                              {esTrabajador && item.cargo_operativo && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <ClipboardList size={13} /> {item.cargo_operativo} · {item.tipo_jornada}
                                </span>
                              )}

                              {esTrabajador && item.fecha_asignacion && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Calendar size={13} /> Asignado el {formatFecha(item.fecha_asignacion)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Historial ────────────────────────────────────────────── */}
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>
                  Historial
                </h2>

                {esTrabajador ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: '10px', padding: '14px 18px',
                  }}>
                    <Info size={20} color="#2563eb" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
                      Por ahora el sistema solo registra tu cuadrilla actual. El historial de
                      asignaciones pasadas todavía no está disponible.
                    </p>
                  </div>
                ) : (
                  <div className="tw-table-card">
                    {!data?.historial || data.historial.length === 0 ? (
                      <div className="tw-empty">
                        <Clock size={40} />
                        <p>Aún no tienes proyectos en tu historial.</p>
                      </div>
                    ) : (
                      <table className="tw-table">
                        <thead>
                          <tr>
                            <th>Proyecto</th>
                            <th>Dirección</th>
                            <th>Fecha creación</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.historial.map((p) => (
                            <tr key={p.id_proyecto}>
                              <td>{p.nombre_proyecto}</td>
                              <td style={{ fontSize: '13px', color: '#6b7280' }}>{p.direccion ?? '—'}</td>
                              <td>{formatFecha(p.fecha_creacion)}</td>
                              <td><span className={`tw-badge ${estadoBadgeClass(p.estado)}`}>{p.estado}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MisAsignaciones;