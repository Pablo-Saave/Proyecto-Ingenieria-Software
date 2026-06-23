// pages/CanalesAvisosAdmin.jsx
// Admin: ve todos los avisos, puede publicar en cualquier cuadrilla y eliminar cualquier aviso.
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/dashboard.css';
import { AlertCircle, Bell, MessageSquare, Plus, Send, Tag, Trash2, X } from 'lucide-react';
import { getTodosLosAvisos, getEtiquetasAviso, crearAviso, eliminarAviso } from '../services/avisosService';

const EMPTY_FORM = { titulo: '', contenido: '', prioridad: 'normal', id_etiqueta: '' };
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

// ─── Modal confirmar eliminar ──────────────────────────────────────────────────
function ConfirmEliminar({ aviso, onClose, onConfirmar, eliminando }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Eliminar aviso</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p>¿Eliminar el aviso <strong>"{aviso.titulo}"</strong>?</p>
          <p className="modal-warn">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="btn-eliminar" onClick={onConfirmar} disabled={eliminando}>
            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CanalesAvisosAdmin({ usuario, onLogout }) {
  const [avisos,      setAvisos]      = useState([]);
  const [etiquetas,   setEtiquetas]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [filtroEtiq,  setFiltroEtiq]  = useState('todas');
  const [avisoDelete, setAvisoDelete] = useState(null);
  const [eliminando,  setEliminando]  = useState(false);

  const cargar = () => {
    setLoading(true);
    setError(null);
    Promise.all([getTodosLosAvisos(), getEtiquetasAviso()])
      .then(([av, et]) => { setAvisos(av); setEtiquetas(et); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.contenido.trim()) { setError('Título y contenido son obligatorios.'); return; }
    if (!form.id_etiqueta) { setError('Debes seleccionar una cuadrilla.'); return; }
    setSaving(true);
    setError(null);
    try {
      const nuevo = await crearAviso(form);
      setAvisos((prev) => [nuevo, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!avisoDelete) return;
    setEliminando(true);
    try {
      await eliminarAviso(avisoDelete.id_aviso);
      setAvisos((prev) => prev.filter((a) => a.id_aviso !== avisoDelete.id_aviso));
      setAvisoDelete(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setEliminando(false);
    }
  };

  const avisosFiltrados = filtroEtiq === 'todas'
    ? avisos
    : avisos.filter((a) => String(a.id_etiqueta) === String(filtroEtiq));

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Canales de Avisos</h1>
              <p className="vista-general-subtitle">Gestiona todas las comunicaciones por cuadrilla</p>
            </div>
            <button className="btn-nuevo-trabajador" onClick={() => setShowForm((v) => !v)}>
              <Plus size={14} /> Nuevo Aviso
            </button>
          </div>

          {/* Métricas rápidas */}
          <div className="metrics-grid" style={{ marginBottom: 20 }}>
            <div className="metric-card">
              <div className="metric-header"><h3 className="metric-title">Total Avisos</h3><Bell size={20} color="#4F46E5" /></div>
              <div className="metric-value">{avisos.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><h3 className="metric-title">Cuadrillas</h3><Tag size={20} color="#10B981" /></div>
              <div className="metric-value">{etiquetas.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><h3 className="metric-title">Urgentes</h3><AlertCircle size={20} color="#EF4444" /></div>
              <div className="metric-value" style={{ color: '#EF4444' }}>
                {avisos.filter((a) => a.prioridad === 'urgente').length}
              </div>
            </div>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {/* Formulario nuevo aviso */}
          {showForm && (
            <form className="metric-card" onSubmit={handleSubmit} style={{ display: 'block', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, color: '#111827' }}>Publicar nuevo aviso</h3>
              <div className="tw-form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label>Título *</label>
                  <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Cambio de turno" required />
                </div>
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label>Cuadrilla *</label>
                  <select value={form.id_etiqueta} onChange={(e) => setForm((p) => ({ ...p, id_etiqueta: e.target.value }))} required>
                    <option value="">— Seleccionar —</option>
                    {etiquetas.map((et) => (
                      <option key={et.id_etiqueta} value={et.id_etiqueta}>{et.nombre_etiqueta}</option>
                    ))}
                  </select>
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
                    placeholder="Escribe el aviso..." required rows={4}
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

          {/* Filtro por cuadrilla */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              onClick={() => setFiltroEtiq('todas')}
              style={{ padding: '5px 14px', borderRadius: 999, border: '1px solid', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                background: filtroEtiq === 'todas' ? '#4F46E5' : '#fff',
                color:      filtroEtiq === 'todas' ? '#fff'    : '#374151',
                borderColor: filtroEtiq === 'todas' ? '#4F46E5' : '#D1D5DB',
              }}
            >
              Todas
            </button>
            {etiquetas.map((et) => (
              <button key={et.id_etiqueta}
                onClick={() => setFiltroEtiq(String(et.id_etiqueta))}
                style={{ padding: '5px 14px', borderRadius: 999, border: '1px solid', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                  background: filtroEtiq === String(et.id_etiqueta) ? '#4F46E5' : '#fff',
                  color:      filtroEtiq === String(et.id_etiqueta) ? '#fff'    : '#374151',
                  borderColor: filtroEtiq === String(et.id_etiqueta) ? '#4F46E5' : '#D1D5DB',
                }}
              >
                {et.nombre_etiqueta}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando avisos...</div>
          ) : avisosFiltrados.length === 0 ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Bell size={40} /><p>No hay avisos{filtroEtiq !== 'todas' ? ' para esta cuadrilla' : ''}.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {avisosFiltrados.map((aviso) => (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="tw-badge" style={{ ...getPrioridadStyle(aviso.prioridad), whiteSpace: 'nowrap' }}>
                        {PRIORIDAD_LABEL[aviso.prioridad] ?? aviso.prioridad}
                      </span>
                      <button
                        onClick={() => setAvisoDelete(aviso)}
                        title="Eliminar aviso"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#EF4444', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, margin: '14px 0 0', whiteSpace: 'pre-wrap' }}>
                    {aviso.contenido}
                  </p>
                  <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="tw-etiqueta-badge">{aviso.etiqueta?.nombre_etiqueta ?? '—'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {avisoDelete && (
        <ConfirmEliminar
          aviso={avisoDelete}
          onClose={() => setAvisoDelete(null)}
          onConfirmar={handleEliminar}
          eliminando={eliminando}
        />
      )}
    </div>
  );
}

export default CanalesAvisosAdmin;