import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/dashboard.css';
import '../styles/Avisosfiltros.css';
import { AlertCircle, Bell, Filter, MessageSquare, Tag } from 'lucide-react';
import { getAvisosMiUnidad } from '../services/avisosService';

const PRIORIDAD_LABEL = { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };

const PRIORIDAD_OPCIONES = [
  { value: 'todas',   label: 'Todas las prioridades' },
  { value: 'baja',    label: 'Baja' },
  { value: 'normal',  label: 'Normal' },
  { value: 'alta',    label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

const FECHA_OPCIONES = [
  { value: 'todos',  label: 'Todas las fechas' },
  { value: '30dias', label: 'Últimos 30 días' },
  { value: '6meses', label: 'Últimos 6 meses' },
  { value: '1anio',  label: 'Último año' },
];

function getFechaLimite(rango) {
  const hoy = new Date();
  switch (rango) {
    case '30dias': return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 30);
    case '6meses': return new Date(hoy.getFullYear(), hoy.getMonth() - 6, hoy.getDate());
    case '1anio':  return new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());
    default:       return null;
  }
}

function formatFecha(fecha) {
  return fecha
    ? new Date(fecha).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';
}

function getPrioridadStyle(prioridad) {
  const p = String(prioridad ?? 'normal').toLowerCase();
  if (p === 'urgente') return { background: '#FEE2E2', color: '#B91C1C' };
  if (p === 'alta')    return { background: '#FEF3C7', color: '#B45309' };
  if (p === 'baja')    return { background: '#E0F2FE', color: '#0369A1' };
  return { background: '#DCFCE7', color: '#15803D' };
}

// ─── Selector con clases de Contratos ───────────────────────────────────────
function SelectFiltro({ label, value, onChange, options }) {
  return (
    <div className="avisos-filter-group">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Barra de filtros (Estado + Fecha) ───────────────────────────────────────
function BarraFiltros({ filtros, setFiltros, filtrosActivos, onFiltrar }) {
  return (
    <div className="avisos-filters">
      <div className="avisos-filter-controls">
        <SelectFiltro
          label="Prioridad"
          value={filtros.prioridad}
          onChange={(v) => setFiltros((p) => ({ ...p, prioridad: v }))}
          options={PRIORIDAD_OPCIONES}
        />
        <SelectFiltro
          label="Fecha"
          value={filtros.fecha}
          onChange={(v) => setFiltros((p) => ({ ...p, fecha: v }))}
          options={FECHA_OPCIONES}
        />
        <button
          className={`avisos-btn-filtros${filtrosActivos ? ' avisos-btn-filtros-activo' : ''}`}
          onClick={onFiltrar}
        >
          <Filter size={14} /> Filtrar
        </button>
      </div>
    </div>
  );
}

function CanalesAvisosTrabajador({ usuario, onLogout }) {
  const [unidad,  setUnidad]  = useState(null);
  const [avisos,  setAvisos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filtros, setFiltros] = useState({ prioridad: 'todas', fecha: 'todos' });
  const [filtrosActivos, setFiltrosActivos] = useState(false);

  useEffect(() => {
    getAvisosMiUnidad()
      .then(({ unidad, avisos }) => { setUnidad(unidad); setAvisos(avisos); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const avisosFiltrados = useMemo(() => {
    return avisos.filter((a) => {
      if (!filtrosActivos) return true;
      if (filtros.prioridad !== 'todas' && String(a.prioridad).toLowerCase() !== filtros.prioridad) return false;
      if (filtros.fecha !== 'todos' && a.fecha_publicacion) {
        const lim = getFechaLimite(filtros.fecha);
        if (lim && new Date(a.fecha_publicacion) < lim) return false;
      }
      return true;
    });
  }, [avisos, filtros, filtrosActivos]);

  const hayFiltrosActivos = filtrosActivos && (filtros.prioridad !== 'todas' || filtros.fecha !== 'todos');

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Canales de Avisos</h1>
              <p className="vista-general-subtitle">Comunicaciones de tu unidad organizacional</p>
            </div>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {unidad && (
            <BarraFiltros
              filtros={filtros}
              setFiltros={setFiltros}
              filtrosActivos={filtrosActivos}
              onFiltrar={() => setFiltrosActivos((p) => !p)}
            />
          )}

          {unidad && !loading && (
            <div className="avisos-count">
              {avisosFiltrados.length} aviso{avisosFiltrados.length !== 1 ? 's' : ''}
              {hayFiltrosActivos && filtros.prioridad !== 'todas' && ` · ${PRIORIDAD_OPCIONES.find(o => o.value === filtros.prioridad)?.label}`}
              {hayFiltrosActivos && filtros.fecha  !== 'todos' && ` · ${FECHA_OPCIONES.find(o => o.value === filtros.fecha)?.label}`}
            </div>
          )}

          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando avisos...</div>
          ) : !unidad ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Tag size={40} /><p>No tienes una unidad organizacional asignada</p>
            </div>
          ) : avisosFiltrados.length === 0 ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Bell size={40} /><p>{hayFiltrosActivos ? 'No hay avisos que coincidan con los filtros.' : 'No hay avisos publicados para tu unidad'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {avisosFiltrados.map((aviso) => (
                <article key={aviso.id_aviso} className="avisos-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MessageSquare size={17} color="#4F46E5" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 14.5, color: '#111827', margin: 0, fontWeight: 600 }}>{aviso.titulo}</h2>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>
                          {aviso.nombre_autor ?? 'Usuario'} · {formatFecha(aviso.fecha_publicacion)}
                        </p>
                      </div>
                    </div>
                    <span className="tw-badge" style={{ ...getPrioridadStyle(aviso.prioridad), whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
                      {PRIORIDAD_LABEL[aviso.prioridad] ?? aviso.prioridad}
                    </span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.55, margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>
                    {aviso.contenido}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <span className="tw-etiqueta-badge">{aviso.cuadrilla?.nombre_cuadrilla ?? unidad.nombre_cuadrilla}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CanalesAvisosTrabajador;