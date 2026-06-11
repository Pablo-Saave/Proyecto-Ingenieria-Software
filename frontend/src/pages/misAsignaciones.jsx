import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import { Briefcase, AlertCircle, CalendarDays, ClipboardList } from 'lucide-react';

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

function MisAsignaciones({ usuario, onLogout }) {
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const idTrabajador = usuario?.id_trabajador;

  useEffect(() => {
    if (!idTrabajador) return;
    setLoading(true);
    apiFetch(`/api/asignados/trabajador/${idTrabajador}`)
      .then((res) => setAsignaciones(Array.isArray(res) ? res : res.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [idTrabajador]);

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const activas   = asignaciones.filter((a) => !a.fecha_retiro);
  const historicas = asignaciones.filter((a) => a.fecha_retiro);

  const AsignacionCard = ({ a }) => (
    <div className="metric-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={18} color="#4F46E5" />
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
            {a.cargo_operativo ?? 'Sin cargo'}
          </span>
        </div>
        <span className={`tw-badge ${a.fecha_retiro ? 'badge-inactivo' : 'badge-activo'}`}>
          {a.fecha_retiro ? 'Finalizada' : 'Activa'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
        <div>
          <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
            Tipo de Jornada
          </p>
          <p style={{ fontSize: '13px', color: '#374151' }}>{a.tipo_jornada ?? '—'}</p>
        </div>
        <div>
          <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
            Fecha Asignación
          </p>
          <p style={{ fontSize: '13px', color: '#374151' }}>{formatFecha(a.fecha_asignacion)}</p>
        </div>
        {a.fecha_retiro && (
          <div>
            <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
              Fecha Retiro
            </p>
            <p style={{ fontSize: '13px', color: '#374151' }}>{formatFecha(a.fecha_retiro)}</p>
          </div>
        )}
      </div>
    </div>
  );

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
                Proyectos y espacios de trabajo de {usuario?.nombres} {usuario?.apellidos}
              </p>
            </div>
          </div>

          {/* Métricas rápidas */}
          <div className="metrics-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-title">Asignaciones Activas</h3>
                <Briefcase size={20} color="#4F46E5" />
              </div>
              <div className="metric-value" style={{ color: '#4F46E5' }}>{activas.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-title">Historial</h3>
                <CalendarDays size={20} color="#6b7280" />
              </div>
              <div className="metric-value" style={{ color: '#6b7280' }}>{historicas.length}</div>
            </div>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando asignaciones...</div>
          ) : asignaciones.length === 0 ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <ClipboardList size={40} />
              <p>No tienes asignaciones registradas</p>
            </div>
          ) : (
            <>
              {activas.length > 0 && (
                <>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Activas
                  </h2>
                  <div className="metrics-grid" style={{ marginBottom: '24px' }}>
                    {activas.map((a) => <AsignacionCard key={a.id_asignado} a={a} />)}
                  </div>
                </>
              )}
              {historicas.length > 0 && (
                <>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Historial
                  </h2>
                  <div className="metrics-grid">
                    {historicas.map((a) => <AsignacionCard key={a.id_asignado} a={a} />)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MisAsignaciones;