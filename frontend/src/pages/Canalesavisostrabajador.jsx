// pages/CanalesAvisosTrabajador.jsx
// Solo lectura: ve los avisos de su cuadrilla, sin poder publicar.
import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/dashboard.css';
import { AlertCircle, Bell, Calendar, ChevronDown, Filter, MessageSquare, Tag } from 'lucide-react';
import { getAvisosMiUnidad } from '../services/avisosService';

const PRIORIDAD_LABEL = { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };

const ESTADO_OPCIONES = [
  { value: 'todos',   label: 'Todos los estados' },
  { value: 'activo',  label: 'Activo' },
  { value: 'vencido', label: 'Vencido' },
];

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

// ─── Selector con icono ──────────────────────────────────────────────────────
function SelectConIcono({ icon, label, value, onChange, options }) {
  return (
    <div style={{ minWidth: 200, flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#111827', marginBottom: 7 }}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: 9, padding: '9px 12px', background: '#fff' }}>
        {icon}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, color: '#111827', appearance: 'none', marginLeft: 8, cursor: 'pointer' }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={15} color="#9CA3AF" style={{ pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

// ─── Barra de filtros (Estado + Fecha) ───────────────────────────────────────
function BarraFiltros({ filtros, setFiltros, onFiltrar }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', background: '#fff', border: '1px solid #F1F5F9', borderRadius: 14, padding: '16px 18px', marginBottom: 18 }}>
      <SelectConIcono
        icon={<Tag size={15} color="#4F46E5" />}
        label="Estado"
        value={filtros.estado}
        onChange={(v) => setFiltros((p) => ({ ...p, estado: v }))}
        options={ESTADO_OPCIONES}
      />
      <div style={{ minWidth: 240, flex: 1 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#111827', marginBottom: 7 }}>Fecha</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #E5E7EB', borderRadius: 9, padding: '9px 12px', background: '#fff' }}>
          <Calendar size={15} color="#4F46E5" style={{ flexShrink: 0 }} />
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => setFiltros((p) => ({ ...p, desde: e.target.value }))}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: filtros.desde ? '#111827' : '#9CA3AF', minWidth: 0 }}
          />
          <span style={{ color: '#9CA3AF' }}>–</span>
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => setFiltros((p) => ({ ...p, hasta: e.target.value }))}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: filtros.hasta ? '#111827' : '#9CA3AF', minWidth: 0 }}
          />
        </div>
      </div>
      <button
        onClick={onFiltrar}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 9, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        <Filter size={14} color="#4F46E5" /> Filtrar
      </button>
    </div>
  );
}

function CanalesAvisosTrabajador({ usuario, onLogout }) {
  const [unidad,  setUnidad]  = useState(null);
  const [avisos,  setAvisos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filtros, setFiltros] = useState({ estado: 'todos', desde: '', hasta: '' });
  const [filtrosAplicados, setFiltrosAplicados] = useState({ estado: 'todos', desde: '', hasta: '' });

  useEffect(() => {
    getAvisosMiUnidad()
      .then(({ unidad, avisos }) => { setUnidad(unidad); setAvisos(avisos); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const avisosFiltrados = useMemo(() => {
    return avisos.filter((a) => {
      if (filtrosAplicados.estado !== 'todos' && a.estado && String(a.estado).toLowerCase() !== filtrosAplicados.estado) return false;
      if (filtrosAplicados.desde && a.fecha_publicacion && new Date(a.fecha_publicacion) < new Date(filtrosAplicados.desde)) return false;
      if (filtrosAplicados.hasta && a.fecha_publicacion && new Date(a.fecha_publicacion) > new Date(`${filtrosAplicados.hasta}T23:59:59`)) return false;
      return true;
    });
  }, [avisos, filtrosAplicados]);

  const hayFiltrosActivos = filtrosAplicados.estado !== 'todos' || filtrosAplicados.desde || filtrosAplicados.hasta;

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
              onFiltrar={() => setFiltrosAplicados(filtros)}
            />
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
                <article key={aviso.id_aviso}
                  style={{ background: '#fff', border: '1px solid #F1F5F9', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
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