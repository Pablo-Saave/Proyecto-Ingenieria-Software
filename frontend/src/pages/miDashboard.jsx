import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, CalendarOff, FileSignature, Wallet, Megaphone,
  MapPin, Users, Info,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { getMisAsignaciones } from '../services/asignacionesService';
import { getAusencias, getAusenciasPorTrabajador } from '../services/ausenciasService';
import { getMisContratos, getMiRemuneracion } from '../services/dashboardService';
import { getAvisosMiUnidad, getAvisosDeCuadrilla, getMisCuadrillasSupervisor } from '../services/avisosService';

const formatFecha = (f) =>
  f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatMonto = (n) =>
  n === null || n === undefined ? '—' : `$${Number(n).toLocaleString('es-CL')}`;

const estadoBadgeClass = (estado) => {
  if (['activo', 'Aprobado', 'Justificada', 'vigente'].includes(estado)) return 'badge-activo';
  if (['inactivo', 'Rechazado'].includes(estado)) return 'badge-inactivo';
  if (estado === 'Por Justificar') return 'badge-por-justificar';
  return 'badge-licencia';
};

// ── Tarjeta de métrica (fila superior, igual que en el dashboard admin) ────
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

function EmptyMini({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', padding: '8px 0' }}>
      <Info size={13} /> {text}
    </div>
  );
}

function Dashboard({ usuario, onLogout }) {
  const [loading, setLoading]       = useState(true);
  const [asignacion, setAsignacion] = useState(null);
  const [ausencias, setAusencias]   = useState([]);
  const [contrato, setContrato]     = useState(null);
  const [remuneracion, setRemuneracion] = useState(null);
  const [avisos, setAvisos]         = useState([]);
  const [errores, setErrores]       = useState({});

  const esSupervisor = usuario?.tipo_usuario === 'supervisor';

  // Cada módulo vive en una ruta distinta según el rol del usuario
  const rutas = esSupervisor
    ? {
        asignaciones: '/app/mis-asignaciones',
        contratos:    '/app/mis-contratos',
        ausencias:    '/admin/ausencias',
        avisos:       '/supervisor/avisos',
      }
    : {
        asignaciones: '/app/mis-asignaciones',
        contratos:    '/app/mis-contratos',
        ausencias:    '/app/mis-ausencias',
        avisos:       '/app/avisos',
      };

  useEffect(() => {
    const cargarTodo = async () => {
      setLoading(true);
      const nuevosErrores = {};

      // El trabajador no tiene permiso 'ausencias:ver_todas' (GET /), así que
      // debe consultar su propio historial por 'ausencias:ver_propias'
      // (GET /trabajador/:id). Supervisor sí puede usar el listado general.
      const ausenciaPromise = esSupervisor
        ? getAusencias()
        : usuario?.id_trabajador
          ? getAusenciasPorTrabajador(usuario.id_trabajador)
          : Promise.resolve([]);

      // Trabajador: avisos de su cuadrilla (/mi-unidad).
      // Supervisor: no tiene "unidad" propia -> se agregan los avisos de
      // todas las cuadrillas de los proyectos que supervisa.
      const avisosPromise = esSupervisor
        ? (async () => {
            const cuadrillas = await getMisCuadrillasSupervisor();
            const resultados = await Promise.all(
              cuadrillas.map((c) =>
                getAvisosDeCuadrilla(c.id_cuadrilla).catch(() => ({ avisos: [] }))
              )
            );
            const todos = resultados.flatMap((r) => r.avisos);
            todos.sort((a, b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));
            return todos;
          })()
        : getAvisosMiUnidad().then((r) => r.avisos);

      const [rAsign, rAusenc, rContrato, rRemun, rAvisos] = await Promise.allSettled([
        getMisAsignaciones(),
        ausenciaPromise,
        usuario?.id_trabajador ? getMisContratos(usuario.id_trabajador) : Promise.resolve(null),
        usuario?.rut ? getMiRemuneracion(usuario.rut) : Promise.resolve(null),
        avisosPromise,
      ]);

      if (rAsign.status === 'fulfilled') {
        const d = rAsign.value;
        const actual = d?.tipo_usuario === 'supervisor' ? (d?.actual?.[0] ?? null) : d?.actual;
        setAsignacion(actual);
      } else nuevosErrores.asignacion = rAsign.reason?.message;

      if (rAusenc.status === 'fulfilled') {
        const lista = Array.isArray(rAusenc.value) ? rAusenc.value : rAusenc.value?.data ?? [];
        setAusencias(lista);
      } else nuevosErrores.ausencias = rAusenc.reason?.message;

      if (rContrato.status === 'fulfilled' && rContrato.value) {
        const lista = rContrato.value?.data ?? [];
        setContrato(lista[0] ?? null); // el más reciente (ya viene ordenado DESC)
      } else if (rContrato.status === 'rejected') nuevosErrores.contrato = rContrato.reason?.message;

      if (rRemun.status === 'fulfilled' && rRemun.value) {
        setRemuneracion(rRemun.value);
      } else if (rRemun.status === 'rejected') nuevosErrores.remuneracion = rRemun.reason?.message;

      if (rAvisos.status === 'fulfilled') {
        setAvisos(rAvisos.value ?? []);
      } else nuevosErrores.avisos = rAvisos.reason?.message;

      setErrores(nuevosErrores);
      setLoading(false);
    };

    cargarTodo();
  }, [usuario?.id_trabajador, usuario?.rut]);

  // Para trabajador: sus propias ausencias más recientes.
  // Para supervisor: las que están a la espera de su revisión.
  const ausenciasRelevantes = esSupervisor
    ? ausencias.filter((a) => a.estado === 'Pendiente' || a.estado === 'Justificada')
    : ausencias;
  const ausenciasRecientes = [...ausenciasRelevantes]
    .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
    .slice(0, 3);

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Mi Dashboard</h1>
              <p className="vista-general-subtitle">
                Hola {usuario?.nombres}, este es tu resumen personal
              </p>
            </div>
          </div>

          {loading ? (
            <div className="dashboard-loading">
              <div className="tw-spinner" /> Cargando tu dashboard...
            </div>
          ) : (
            <>
              {/* ── Métricas ──────────────────────────────────────────────── */}
              <div className="metrics-grid">
                <MetricCard
                  icon={Briefcase}
                  title={esSupervisor ? 'Mis Proyectos' : 'Mis Asignaciones'}
                  value={errores.asignacion ? '—' : (asignacion ? 1 : 0)}
                  subtitle={asignacion ? 'Asignación activa' : 'Sin asignación'}
                />
                <MetricCard
                  icon={CalendarOff}
                  title={esSupervisor ? 'Ausencias por revisar' : 'Mis Ausencias'}
                  value={errores.ausencias ? '—' : ausenciasRelevantes.length}
                  subtitle={ausenciasRelevantes.length === 0 ? 'Sin pendientes' : 'Requiere atención'}
                  badge={esSupervisor && ausenciasRelevantes.length > 0 ? { tone: 'warning', text: 'Por revisar' } : null}
                />
                <MetricCard
                  icon={FileSignature}
                  title="Mi Contrato"
                  value={errores.contrato ? '—' : (contrato ? (contrato.tipo_contrato || 'Contrato') : 'Sin contrato')}
                  subtitle={contrato ? `Desde ${formatFecha(contrato.fecha_inicio)}` : ''}
                  badge={contrato ? { tone: contrato.estado_contrato === 'Activo' ? 'success' : 'warning', text: contrato.estado_contrato } : null}
                />
                <MetricCard
                  icon={Wallet}
                  title="Mi Pago"
                  value={errores.remuneracion ? '—' : (remuneracion
                    ? formatMonto(Number(remuneracion.sueldo ?? 0) + Number(remuneracion.bono ?? 0) - Number(remuneracion.descuento ?? 0))
                    : 0)}
                  subtitle={remuneracion ? remuneracion.estado_pago : 'Sin pagos disponibles'}
                />
              </div>

              {/* ── Mi Asignación y Avisos, uno al lado del otro ───────────── */}
              <div className="alerts-coverage-wrapper">

                <div className="coverage-section" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="section-header">
                    <h3 className="section-title">
                      <Briefcase size={13} /> {esSupervisor ? 'Mi Asignación Actual' : 'Mi Asignación'}
                    </h3>
                    <Link className="coverage-map-link" to={rutas.asignaciones}>Ver detalles →</Link>
                  </div>

                  {errores.asignacion ? (
                    <EmptyMini text="No se pudo cargar" />
                  ) : !asignacion ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <EmptyMini text={esSupervisor ? 'Sin proyectos activos asignados' : 'Sin cuadrilla asignada'} />
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px', padding: '10px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '52px', height: '52px', borderRadius: '14px', background: 'var(--secondary-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Briefcase size={24} color="var(--primary-color)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '16px', color: '#000' }}>
                              {esSupervisor ? asignacion.nombre_proyecto : asignacion.proyecto?.nombre_proyecto}
                            </strong>
                            <span className="metric-badge badge-success">Activo</span>
                          </div>
                          {!esSupervisor && (
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Users size={13} /> {asignacion.nombre_cuadrilla}
                            </p>
                          )}
                        </div>
                      </div>

                      {(esSupervisor ? asignacion.direccion : asignacion.proyecto?.direccion) && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
                          color: 'var(--text-secondary)', background: 'var(--secondary-color)',
                          borderRadius: '8px', padding: '9px 12px',
                        }}>
                          <MapPin size={14} color="var(--primary-color)" />
                          {esSupervisor ? asignacion.direccion : asignacion.proyecto?.direccion}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="alerts-section">
                  <div className="section-header">
                    <h3 className="section-title">
                      <Megaphone size={13} /> Avisos Recientes
                    </h3>
                    <Link className="see-all-link" to={rutas.avisos}>Ver todos</Link>
                  </div>

                  {errores.avisos ? (
                    <EmptyMini text="No se pudo cargar" />
                  ) : avisos.length === 0 ? (
                    <EmptyMini text="Sin avisos recientes" />
                  ) : (
                    <div className="alerts-grid">
                      {avisos.slice(0, 3).map((av) => (
                        <div key={av.id_aviso} className={`alert-card ${av.prioridad === 'urgente' ? 'alert-warning' : 'alert-default'}`}>
                          <div className="alert-icon">
                            <Megaphone size={12} />
                          </div>
                          <div className="alert-content">
                            <p className="alert-title">{av.titulo}</p>
                            <p className="alert-description">{formatFecha(av.fecha_publicacion)}</p>
                          </div>
                          {av.prioridad === 'urgente' && (
                            <span className="alert-timestamp" style={{ color: 'var(--warning-color)', fontWeight: 600 }}>Urgente</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* ── Ausencias recientes ───────────────────────────────────── */}
              {ausenciasRecientes.length > 0 && (
                <div className="coverage-section" style={{ marginTop: '10px' }}>
                  <div className="section-header">
                    <h3 className="section-title">
                      <CalendarOff size={13} /> {esSupervisor ? 'Ausencias por revisar' : 'Mis Ausencias Recientes'}
                    </h3>
                    <Link className="coverage-map-link" to={rutas.ausencias}>Ver más →</Link>
                  </div>
                  <div className="coverage-list">
                    {ausenciasRecientes.map((a) => (
                      <div key={a.id_ausencia} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#000' }}>
                          {esSupervisor ? `${a.trabajador?.nombres ?? 'Trabajador'} — ` : ''}{formatFecha(a.fecha_inicio)}
                        </span>
                        <span className={`tw-badge ${estadoBadgeClass(a.estado)}`} style={{ fontSize: '9px' }}>
                          {a.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;