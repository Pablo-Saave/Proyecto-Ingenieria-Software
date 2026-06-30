// pages/CanalesAvisosSupervisor.jsx
// Puede ver y publicar avisos solo en su propia cuadrilla.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/dashboard.css';
import { AlertCircle, Bell, Calendar, ChevronDown, Filter, MessageSquare, MoreVertical, Plus, Send, Tag, Trash2, X } from 'lucide-react';
import { getAvisosMiUnidad, crearAviso, eliminarAviso } from '../services/avisosService';

const EMPTY_FORM = { titulo: '', contenido: '', prioridad: 'normal' };
const PRIORIDAD_LABEL = { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };
const CONTENIDO_MAX = 500;

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

// ─── Barra de filtros (sin cuadrilla, es fija para el supervisor) ────────────
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

// ─── Modal nuevo aviso ──────────────────────────────────────────────────
function ModalNuevoAviso({ form, setForm, unidad, saving, onClose, onSubmit }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 22px 16px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={18} color="#4F46E5" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, color: '#111827' }}>Nuevo aviso</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#6B7280' }}>
                Publica información para {unidad?.nombre_cuadrilla ?? 'tu cuadrilla'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: '0 22px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Título *
              </label>
              <input
                value={form.titulo}
                onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Ej: Cambio de turno"
                required
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 9, padding: '10px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Prioridad
              </label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm((p) => ({ ...p, prioridad: e.target.value }))}
                style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 9, padding: '10px 12px', fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Contenido *
            </label>
            <textarea
              value={form.contenido}
              onChange={(e) => setForm((p) => ({ ...p, contenido: e.target.value.slice(0, CONTENIDO_MAX) }))}
              placeholder="Escribe el aviso para tu cuadrilla..."
              required
              rows={4}
              style={{ width: '100%', resize: 'vertical', border: '1px solid #E5E7EB', borderRadius: 9, padding: '10px 12px', fontSize: 13.5, boxSizing: 'border-box' }}
            />
            <div style={{ textAlign: 'right', fontSize: 11.5, color: '#9CA3AF', marginTop: 4 }}>
              {form.contenido.length}/{CONTENIDO_MAX}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              <Send size={14} /> {saving ? 'Publicando...' : 'Publicar aviso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal confirmar eliminar ──────────────────────────────────────────────────
function ConfirmEliminar({ aviso, onClose, onConfirmar, eliminando }) {
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: 15.5, color: '#111827' }}>Eliminar aviso</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '14px 20px 0' }}>
          <p style={{ fontSize: 13.5, color: '#374151', margin: 0 }}>¿Eliminar el aviso <strong>"{aviso.titulo}"</strong>?</p>
          <p style={{ fontSize: 12.5, color: '#EF4444', margin: '8px 0 0' }}>Esta acción no se puede deshacer.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px' }}>
          <button onClick={onClose}
            style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={eliminando}
            style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#EF4444', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', opacity: eliminando ? 0.7 : 1 }}>
            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Menú de acciones (kebab) ──────────────────────────────────────────────────
function MenuAcciones({ onEliminar }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Más acciones"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF', borderRadius: 6, display: 'flex', alignItems: 'center' }}
      >
        <MoreVertical size={17} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid #F1F5F9', minWidth: 150, zIndex: 20, overflow: 'hidden' }}>
          <button
            onClick={() => { setOpen(false); onEliminar(); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#EF4444', textAlign: 'left' }}
          >
            <Trash2 size={14} /> Eliminar aviso
          </button>
        </div>
      )}
    </div>
  );
}

function CanalesAvisosSupervisor({ usuario, onLogout }) {
  const [unidad,    setUnidad]    = useState(null);
  const [avisos,    setAvisos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [filtros,   setFiltros]   = useState({ estado: 'todos', desde: '', hasta: '' });
  const [filtrosAplicados, setFiltrosAplicados] = useState({ estado: 'todos', desde: '', hasta: '' });
  const [avisoDelete, setAvisoDelete] = useState(null);
  const [eliminando,  setEliminando]  = useState(false);

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
              <p className="vista-general-subtitle">Gestiona las comunicaciones de tu cuadrilla</p>
            </div>
            {unidad && (
              <button className="btn-nuevo-trabajador" onClick={() => setShowForm(true)}>
                <Plus size={14} /> Nuevo aviso
              </button>
            )}
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
              <Tag size={40} /><p>No tienes una cuadrilla asignada. Contacta al Administrador.</p>
            </div>
          ) : avisosFiltrados.length === 0 ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Bell size={40} /><p>{hayFiltrosActivos ? 'No hay avisos que coincidan con los filtros.' : 'No hay avisos publicados aún. ¡Crea el primero!'}</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="tw-badge" style={{ ...getPrioridadStyle(aviso.prioridad), whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
                        {PRIORIDAD_LABEL[aviso.prioridad] ?? aviso.prioridad}
                      </span>
                      {String(aviso.id_autor ?? aviso.autor_id ?? '') === String(usuario?.id ?? usuario?.id_usuario ?? '') && (
                        <MenuAcciones onEliminar={() => setAvisoDelete(aviso)} />
                      )}
                    </div>
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

      {showForm && (
        <ModalNuevoAviso
          form={form}
          setForm={setForm}
          unidad={unidad}
          saving={saving}
          onClose={() => { setShowForm(false); setForm(EMPTY_FORM); }}
          onSubmit={handleSubmit}
        />
      )}

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

export default CanalesAvisosSupervisor;