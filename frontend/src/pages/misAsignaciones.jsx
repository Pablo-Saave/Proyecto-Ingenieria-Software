import React, { useState, useEffect } from 'react';
import {
  Briefcase, MapPin, Users, Calendar, ClipboardList,
  AlertCircle, Info, Clock, ChevronDown, ChevronRight,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { getMisAsignaciones } from '../services/asignacionesService';
import { getMyCuadrillasAndIntegrantesFromToken, getIntegrantesOfCuadrilla } from '../services/cuadrillasService';
import '../styles/Asignaciones.css';

const estadoBadgeClass = (estado) => {
  if (estado === 'activo') return 'badge-activo';
  return 'badge-inactivo';
};

const formatFecha = (f) =>
  f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function getIniciales(nombres = '', apellidos = '') {
  const n = String(nombres || '').trim();
  const a = String(apellidos || '').trim();
  return ((n[0] || '') + (a[0] || '')).toUpperCase();
}

function MisAsignaciones({ usuario, onLogout }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [cuadrillas, setCuadrillas]               = useState([]);
  const [loadingCuadrillas, setLoadingCuadrillas]   = useState(false);
  const [errorCuadrillas, setErrorCuadrillas]       = useState(null);
  const [expandidas, setExpandidas]                 = useState({});

  const toggleExpandida = (id_cuadrilla) =>
    setExpandidas((prev) => ({ ...prev, [id_cuadrilla]: !prev[id_cuadrilla] }));

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

  useEffect(() => {
    if (!esSupervisor) return;

    const fetchCuadrillas = async () => {
      setLoadingCuadrillas(true);
      setErrorCuadrillas(null);
      try {
        const res = await getMyCuadrillasAndIntegrantesFromToken();
        setCuadrillas(res?.data ?? []);
      } catch (e) {
        // Si no supervisa ningún proyecto activo, el backend responde 403 —
        // lo tratamos como "sin cuadrillas" en vez de mostrar un error.
        setCuadrillas([]);
        setErrorCuadrillas(e.message);
      } finally {
        setLoadingCuadrillas(false);
      }
    };

    fetchCuadrillas();
  }, [esSupervisor]);

  // ── Integrantes de mi propia cuadrilla (solo trabajador) ──────────────────
  const [integrantesMiCuadrilla, setIntegrantesMiCuadrilla] = useState([]);
  const [loadingIntegrantes, setLoadingIntegrantes]         = useState(false);
  const [errorIntegrantes, setErrorIntegrantes]             = useState(null);
  const [miCuadrillaAbierta, setMiCuadrillaAbierta]         = useState(false);

  const miCuadrillaActual = esTrabajador ? proyectosActuales[0] : null;

  useEffect(() => {
    if (!esTrabajador || !miCuadrillaActual?.id_cuadrilla) return;

    const fetchIntegrantes = async () => {
      setLoadingIntegrantes(true);
      setErrorIntegrantes(null);
      try {
        const res = await getIntegrantesOfCuadrilla(miCuadrillaActual.id_cuadrilla);
        setIntegrantesMiCuadrilla(res?.data ?? []);
      } catch (e) {
        setErrorIntegrantes(e.message);
      } finally {
        setLoadingIntegrantes(false);
      }
    };

    fetchIntegrantes();
  }, [esTrabajador, miCuadrillaActual?.id_cuadrilla]);

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
                  ? 'Proyectos que supervisas actualmente'
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

              {/* ── Mi cuadrilla (solo trabajador) ──────────────────────────── */}
              {esTrabajador && miCuadrillaActual && (
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>
                    Mi cuadrilla
                  </h2>

                  {loadingIntegrantes ? (
                    <div className="tw-table-card">
                      <div className="tw-loading"><div className="tw-spinner" /> Cargando integrantes...</div>
                    </div>
                  ) : errorIntegrantes ? (
                    <div className="tw-error-banner"><AlertCircle size={16} /> {errorIntegrantes}</div>
                  ) : (
                    <div className="asig-table-wrapper">
                      <table className="asig-table">
                        <thead>
                          <tr>
                            <th>Cuadrilla</th>
                            <th>Trabajadores</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="asig-row-cuadrilla" onClick={() => setMiCuadrillaAbierta((v) => !v)}>
                            <td>
                              <div className="asig-cell-cuadrilla">
                                {miCuadrillaAbierta ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                                <div className="asig-avatar asig-avatar-cuadrilla">
                                  {getIniciales(miCuadrillaActual.nombre_cuadrilla, '')}
                                </div>
                                <div className="asig-cell-title">{miCuadrillaActual.nombre_cuadrilla}</div>
                              </div>
                            </td>
                            <td>{integrantesMiCuadrilla.length}</td>
                          </tr>

                          {miCuadrillaAbierta && (
                            integrantesMiCuadrilla.length === 0 ? (
                              <tr className="asig-row-trabajador">
                                <td></td>
                                <td className="asig-empty-cell">Sin trabajadores asignados</td>
                              </tr>
                            ) : (
                              integrantesMiCuadrilla.map((t) => (
                                <tr key={t.id_trabajador} className="asig-row-trabajador">
                                  <td></td>
                                  <td>
                                    <div className="asig-cell-trabajador">
                                      <div className="asig-avatar asig-avatar-trabajador">
                                        {getIniciales(t.nombres, t.apellidos)}
                                      </div>
                                      <div>
                                        <div className="asig-cell-title">{t.nombres} {t.apellidos}</div>
                                        <div className="asig-cell-sub">
                                          {t.cargo_operativo || 'Sin cargo'} · {t.tipo_jornada}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Cuadrillas de tu proyecto (solo supervisor) ─────────────── */}
              {esSupervisor && (
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>
                    Cuadrillas de tu proyecto
                  </h2>

                  {loadingCuadrillas ? (
                    <div className="tw-table-card">
                      <div className="tw-loading"><div className="tw-spinner" /> Cargando cuadrillas...</div>
                    </div>
                  ) : cuadrillas.length === 0 ? (
                    <div className="tw-table-card">
                      <div className="tw-empty">
                        <Users size={40} />
                        <p>
                          {errorCuadrillas
                            ? 'No tienes cuadrillas para mostrar.'
                            : 'Tu proyecto todavía no tiene cuadrillas creadas.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="asig-table-wrapper">
                      <table className="asig-table">
                        <thead>
                          <tr>
                            <th>Cuadrilla</th>
                            <th>Trabajadores</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cuadrillas.map((c) => {
                            const abierta = !!expandidas[c.id_cuadrilla];
                            return (
                              <React.Fragment key={c.id_cuadrilla}>
                                <tr className="asig-row-cuadrilla" onClick={() => toggleExpandida(c.id_cuadrilla)}>
                                  <td>
                                    <div className="asig-cell-cuadrilla">
                                      {abierta ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                                      <div className="asig-avatar asig-avatar-cuadrilla">
                                        {getIniciales(c.nombre_cuadrilla, '')}
                                      </div>
                                      <div>
                                        <div className="asig-cell-title">{c.nombre_cuadrilla}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>{c.integrantes.length}</td>
                                </tr>

                                {abierta && (
                                  c.integrantes.length === 0 ? (
                                    <tr className="asig-row-trabajador">
                                      <td></td>
                                      <td className="asig-empty-cell">Sin trabajadores asignados</td>
                                    </tr>
                                  ) : (
                                    c.integrantes.map((t) => (
                                      <tr key={t.id_trabajador} className="asig-row-trabajador">
                                        <td></td>
                                        <td>
                                          <div className="asig-cell-trabajador">
                                            <div className="asig-avatar asig-avatar-trabajador">
                                              {getIniciales(t.nombres, t.apellidos)}
                                            </div>
                                            <div>
                                              <div className="asig-cell-title">{t.nombres} {t.apellidos}</div>
                                              <div className="asig-cell-sub">
                                                {t.cargo_operativo || 'Sin cargo'} · {t.tipo_jornada}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  )
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MisAsignaciones;