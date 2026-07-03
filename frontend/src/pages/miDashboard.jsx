import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, CalendarOff, FileSignature, Wallet, Megaphone,
  AlertCircle, MapPin, Users, ArrowRight, Info,
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

// ── Tarjeta contenedora reutilizable ────────────────────────────────────────
function DashboardCard({ icon: Icon, title, linkTo, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px', background: '#eef2ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={17} color="#4F46E5" />
          </div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>{title}</h3>
        </div>
        {linkTo && (
          <Link to={linkTo} style={{
            fontSize: '12px', color: '#4F46E5', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none',
          }}>
            Ver más <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyMini({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '13px' }}>
      <Info size={14} /> {text}
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
            <div className="tw-table-card">
              <div className="tw-loading"><div className="tw-spinner" /> Cargando tu dashboard...</div>
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px',
            }}>

              {/* ── Asignación actual ─────────────────────────────────────── */}
              <DashboardCard icon={Briefcase} title="Mi Asignación" linkTo={rutas.asignaciones}>
                {errores.asignacion ? (
                  <EmptyMini text="No se pudo cargar" />
                ) : !asignacion ? (
                  <EmptyMini text={esSupervisor ? 'Sin proyectos activos asignados' : 'Sin cuadrilla asignada'} />
                ) : (
                  <div style={{ fontSize: '13px', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ color: '#111827', fontSize: '14px' }}>
                      {esSupervisor ? asignacion.nombre_proyecto : asignacion.proyecto?.nombre_proyecto}
                    </strong>
                    {!esSupervisor && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={12} /> {asignacion.nombre_cuadrilla}
                      </span>
                    )}
                    {(esSupervisor ? asignacion.direccion : asignacion.proyecto?.direccion) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={12} /> {esSupervisor ? asignacion.direccion : asignacion.proyecto?.direccion}
                      </span>
                    )}
                  </div>
                )}
              </DashboardCard>

              {/* ── Ausencias ─────────────────────────────────────────────── */}
              <DashboardCard
                icon={CalendarOff}
                title={esSupervisor ? 'Ausencias por revisar' : 'Mis Ausencias'}
                linkTo={rutas.ausencias}
              >
                {errores.ausencias ? (
                  <EmptyMini text="No se pudo cargar" />
                ) : ausenciasRecientes.length === 0 ? (
                  <EmptyMini text={esSupervisor ? 'Nada pendiente de revisión' : 'Sin ausencias registradas'} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ausenciasRecientes.map((a) => (
                      <div key={a.id_ausencia} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px',
                      }}>
                        <span style={{ color: '#4b5563' }}>
                          {esSupervisor ? `${a.trabajador?.nombres ?? 'Trabajador'} — ` : ''}{formatFecha(a.fecha_inicio)}
                        </span>
                        <span className={`tw-badge ${estadoBadgeClass(a.estado)}`} style={{ fontSize: '11px' }}>
                          {a.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>

              {/* ── Contrato ──────────────────────────────────────────────── */}
              <DashboardCard icon={FileSignature} title="Mi Contrato" linkTo={rutas.contratos}>
                {errores.contrato ? (
                  <EmptyMini text="No se pudo cargar" />
                ) : !contrato ? (
                  <EmptyMini text="Sin contrato registrado" />
                ) : (
                  <div style={{ fontSize: '13px', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{contrato.tipo_contrato}</span>
                      <span className={`tw-badge ${estadoBadgeClass(contrato.estado_contrato)}`} style={{ fontSize: '11px' }}>
                        {contrato.estado_contrato}
                      </span>
                    </div>
                    <span>Desde {formatFecha(contrato.fecha_inicio)}
                      {contrato.fecha_termino ? ` hasta ${formatFecha(contrato.fecha_termino)}` : ' (indefinido)'}
                    </span>
                  </div>
                )}
              </DashboardCard>

              {/* ── Pago ──────────────────────────────────────────────────── */}
              <DashboardCard icon={Wallet} title="Mi Pago">
                {errores.remuneracion ? (
                  <EmptyMini text="No se pudo cargar" />
                ) : !remuneracion ? (
                  <EmptyMini text="Sin información de remuneración" />
                ) : (
                  <div style={{ fontSize: '13px', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#111827', fontSize: '15px' }}>
                        {formatMonto(
                          Number(remuneracion.sueldo ?? 0) + Number(remuneracion.bono ?? 0) - Number(remuneracion.descuento ?? 0)
                        )}
                      </strong>
                      <span className={`tw-badge ${estadoBadgeClass(remuneracion.estado_pago)}`} style={{ fontSize: '11px' }}>
                        {remuneracion.estado_pago}
                      </span>
                    </div>
                    <span>Sueldo {formatMonto(remuneracion.sueldo)} · Bono {formatMonto(remuneracion.bono)} · Descuento {formatMonto(remuneracion.descuento)}</span>
                    <span>Fecha de pago: {formatFecha(remuneracion.fecha_pago)}</span>
                  </div>
                )}
              </DashboardCard>

              {/* ── Avisos ────────────────────────────────────────────────── */}
              <DashboardCard icon={Megaphone} title="Avisos" linkTo={rutas.avisos}>
                {errores.avisos ? (
                  <EmptyMini text="No se pudo cargar" />
                ) : avisos.length === 0 ? (
                  <EmptyMini text="Sin avisos recientes" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {avisos.slice(0, 3).map((av) => (
                      <div key={av.id_aviso}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px', color: '#111827' }}>{av.titulo}</strong>
                          {av.prioridad === 'urgente' && (
                            <span className="tw-badge badge-inactivo" style={{ fontSize: '10px' }}>urgente</span>
                          )}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                          {formatFecha(av.fecha_publicacion)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;