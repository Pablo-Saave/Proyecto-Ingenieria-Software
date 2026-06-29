// pages/CanalesAvisosSupervisor.jsx
// Puede ver y publicar avisos solo en su propia cuadrilla.
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/dashboard.css';
import { AlertCircle, Bell, MessageSquare, Plus, Send, Tag } from 'lucide-react';
import { getAvisosMiUnidad, crearAviso } from '../services/avisosService';

const EMPTY_FORM = { titulo: '', contenido: '', prioridad: 'normal' };
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

function CanalesAvisosSupervisor({ usuario, onLogout }) {
  const [unidad,    setUnidad]    = useState(null);
  const [avisos,    setAvisos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [showForm,  setShowForm]  = useState(false);

  const cargar = () => {
    setLoading(true);
    setError(null);
    getAvisosMiUnidad()
      .then(({ unidad, avisos }) => { setUnidad(unidad); setAvisos(avisos); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.contenido.trim()) {
      setError('Título y contenido son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const nuevo = await crearAviso({ ...form, id_cuadrilla: unidad?.id_cuadrilla });
      setAvisos((prev) => [nuevo, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Canales de Avisos</h1>
              <p className="vista-general-subtitle">Gestiona las comunicaciones de tu cuadrilla</p>
            </div>
            {unidad && (
              <button className="btn-nuevo-trabajador" onClick={() => setShowForm((v) => !v)}>
                <Plus size={14} /> Nuevo Aviso
              </button>
            )}
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {/* Formulario nuevo aviso */}
          {showForm && (
            <form onSubmit={handleSubmit} style={{ display: 'block', marginBottom: 20, padding: '16px 0', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
              <div className="tw-form-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label>Título *</label>
                  <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Cambio de turno" required />
                </div>
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label>Prioridad</label>
                  <select value={form.prioridad} onChange={(e) => setForm((p) => ({ ...p, prioridad: e.target.value }))}>
                    <option value="baja">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="tw-field" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label>Contenido *</label>
                  <textarea value={form.contenido} onChange={(e) => setForm((p) => ({ ...p, contenido: e.target.value }))}
                    placeholder="Escribe el aviso para tu cuadrilla..." required rows={4}
                    style={{ width: '100%', resize: 'vertical', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button type="button" className="tw-btn-cancel" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={saving}>
                  <Send size={14} /> {saving ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando avisos...</div>
          ) : !unidad ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Tag size={40} /><p>No tienes una cuadrilla asignada. Contacta al Administrador.</p>
            </div>
          ) : avisos.length === 0 ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Bell size={40} /><p>No hay avisos publicados aún. ¡Crea el primero!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {avisos.map((aviso) => (
                <article key={aviso.id_aviso} style={{ display: 'block', padding: '18px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MessageSquare size={17} color="#374151" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 16, color: '#111827', margin: 0 }}>{aviso.titulo}</h2>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>
                          {aviso.nombre_autor ?? 'Usuario'} · {formatFecha(aviso.fecha_publicacion)}
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

export default CanalesAvisosSupervisor;


