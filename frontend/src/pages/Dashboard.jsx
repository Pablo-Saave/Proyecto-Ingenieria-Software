import React, { useState, useEffect } from 'react';
import {
  FileSignature, Users, Wallet, Briefcase, AlertCircle, Info, ArrowRight,
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

const formatFecha = (f) =>
  f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const diasRestantes = (fecha) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const term = new Date(fecha);
  return Math.round((term - hoy) / (1000 * 60 * 60 * 24));
};

// ── Tarjeta contador (fila superior) ────────────────────────────────────────
function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const tones = {
    default: { bg: '#eef2ff', color: '#4F46E5' },
    warning: { bg: '#fff7ed', color: '#ea580c' },
    danger:  { bg: '#fef2f2', color: '#dc2626' },
  };
  const t = tones[tone];
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
      padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px', background: t.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={19} color={t.color} />
      </div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '3px' }}>{label}</div>
      </div>
    </div>
  );
}

// ── Panel de lista (parte inferior) ─────────────────────────────────────────
function ListPanel({ icon: Icon, title, linkTo, emptyText, children, count }) {
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
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            {title}{typeof count === 'number' ? ` (${count})` : ''}
          </h3>
        </div>
        {linkTo && (
          <a href={linkTo} style={{
            fontSize: '12px', color: '#4F46E5', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none',
          }}>
            Ver más <ArrowRight size={12} />
          </a>
        )}
      </div>
      {React.Children.count(children) === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '13px' }}>
          <Info size={14} /> {emptyText}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
      )}
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
            <div className="tw-table-card">
              <div className="tw-loading"><div className="tw-spinner" /> Cargando panel administrativo...</div>
            </div>
          ) : (
            <>
              {/* ── Contadores ────────────────────────────────────────────── */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px', marginBottom: '22px',
              }}>
                <StatCard
                  icon={FileSignature}
                  label="Contratos por vencer"
                  value={errores.contratos ? '—' : contratosPorVencer.length}
                  tone={contratosPorVencer.length > 0 ? 'warning' : 'default'}
                />
                <StatCard
                  icon={Users}
                  label="Trabajadores sin cuadrilla"
                  value={errores.sinCuadrilla ? '—' : sinCuadrilla.length}
                  tone={sinCuadrilla.length > 0 ? 'warning' : 'default'}
                />
                <StatCard
                  icon={Wallet}
                  label="Pagos pendientes"
                  value={errores.remuneraciones ? '—' : remuneracionesPendientes.length}
                  tone={remuneracionesPendientes.length > 0 ? 'danger' : 'default'}
                />
                <StatCard
                  icon={Briefcase}
                  label="Proyectos activos"
                  value={errores.proyectos ? '—' : proyectos.activos}
                />
              </div>

              {errores.proyectos && (
                <div className="tw-error-banner" style={{ marginBottom: '16px' }}>
                  <AlertCircle size={16} /> No se pudo cargar el resumen de proyectos: {errores.proyectos}
                </div>
              )}

              {/* ── Paneles de detalle ────────────────────────────────────── */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px',
              }}>

                <ListPanel
                  icon={FileSignature}
                  title="Contratos próximos a vencer"
                  emptyText="No hay contratos venciendo en los próximos 30 días"
                >
                  {errores.contratos ? null : contratosPorVencer.slice(0, 5).map((c) => {
                    const dias = diasRestantes(c.fecha_termino);
                    return (
                      <div key={c.id_contrato} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: '#374151' }}>
                          {c.trabajador?.nombres} {c.trabajador?.apellidos}
                        </span>
                        <span className={`tw-badge ${dias < 0 ? 'badge-inactivo' : 'badge-por-justificar'}`} style={{ fontSize: '11px' }}>
                          {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : `${dias}d restantes`}
                        </span>
                      </div>
                    );
                  })}
                </ListPanel>

                <ListPanel
                  icon={Users}
                  title="Trabajadores sin cuadrilla"
                  emptyText="Todos los trabajadores están asignados a una cuadrilla"
                >
                  {errores.sinCuadrilla ? null : sinCuadrilla.slice(0, 5).map((t) => (
                    <div key={t.id_trabajador} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#374151' }}>{t.nombres} {t.apellidos}</span>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>{t.rut}</span>
                    </div>
                  ))}
                </ListPanel>

                <ListPanel
                  icon={Wallet}
                  title="Pagos pendientes"
                  emptyText="No hay pagos pendientes"
                >
                  {errores.remuneraciones ? null : remuneracionesPendientes.slice(0, 5).map((r) => (
                    <div key={r.id_remuneracion} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#374151' }}>
                        {r.trabajador?.nombres} {r.trabajador?.apellidos}
                      </span>
                      <span className="tw-badge badge-licencia" style={{ fontSize: '11px' }}>Pendiente</span>
                    </div>
                  ))}
                </ListPanel>

                <ListPanel
                  icon={Briefcase}
                  title="Proyectos"
                  emptyText="Sin datos de proyectos"
                >
                  {errores.proyectos ? null : (
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#374151' }}>
                      <span><strong style={{ color: '#111827' }}>{proyectos.activos}</strong> activos</span>
                      <span><strong style={{ color: '#111827' }}>{proyectos.inactivos}</strong> inactivos</span>
                    </div>
                  )}
                </ListPanel>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;