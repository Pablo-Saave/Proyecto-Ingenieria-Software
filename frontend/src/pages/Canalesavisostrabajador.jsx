// pages/CanalesAvisosTrabajador.jsx
// Solo lectura: ve los avisos de su cuadrilla, sin poder publicar.
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/dashboard.css';
import { AlertCircle, Bell, MessageSquare, Tag } from 'lucide-react';
import { getAvisosMiUnidad } from '../services/avisosService';

const PRIORIDAD_LABEL = { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };

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
  return { background: '#EEF2FF', color: '#4F46E5' };
}

function CanalesAvisosTrabajador({ usuario, onLogout }) {
  const [unidad,  setUnidad]  = useState(null);
  const [avisos,  setAvisos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    getAvisosMiUnidad()
      .then(({ unidad, avisos }) => { setUnidad(unidad); setAvisos(avisos); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

          {/* Tarjeta de unidad */}
          <div className="metric-card" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Tag size={20} color="#4F46E5" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Unidad organizacional</p>
              <h2 style={{ margin: '2px 0 0', fontSize: 18, color: '#111827' }}>{unidad?.nombre_etiqueta ?? 'Sin unidad asignada'}</h2>
              {unidad?.descripcion && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{unidad.descripcion}</p>}
            </div>
            <span className="tw-badge badge-activo">{avisos.length} aviso{avisos.length !== 1 ? 's' : ''}</span>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando avisos...</div>
          ) : !unidad ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Tag size={40} /><p>No tienes una unidad organizacional asignada</p>
            </div>
          ) : avisos.length === 0 ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Bell size={40} /><p>No hay avisos publicados para tu unidad</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {avisos.map((aviso) => (
                <article key={aviso.id_aviso} className="metric-card" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MessageSquare size={17} color="#374151" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, color: '#111827', margin: 0 }}>{aviso.titulo}</h2>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>
                          {aviso.autor?.nombres ?? 'Usuario'} {aviso.autor?.apellidos ?? ''} · {formatFecha(aviso.fecha_publicacion)}
                        </p>
                      </div>
                    </div>
                    <span className="tw-badge" style={{ ...getPrioridadStyle(aviso.prioridad), whiteSpace: 'nowrap' }}>
                      {PRIORIDAD_LABEL[aviso.prioridad] ?? aviso.prioridad}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, margin: '14px 0 0', whiteSpace: 'pre-wrap' }}>
                    {aviso.contenido}
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <span className="tw-etiqueta-badge">{aviso.etiqueta?.nombre_etiqueta ?? unidad.nombre_etiqueta}</span>
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