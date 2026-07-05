// pages/CanalesAvisosAdmin.jsx
// Admin: ve todos los avisos, puede publicar en cualquier cuadrilla y eliminar cualquier aviso.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/dashboard.css';
import '../styles/Avisosfiltros.css';
import { AlertCircle, Bell, Edit2, Filter, MessageSquare, MoreVertical, Plus, Send, Tag, Trash2, Users, X } from 'lucide-react';
import { getTodosLosAvisos, getCuadrillasAviso, crearAviso, editarAviso, eliminarAviso } from '../services/avisosService';

const EMPTY_FORM = { titulo: '', contenido: '', prioridad: 'normal', id_cuadrilla: '' };
const PRIORIDAD_LABEL = { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };
const CONTENIDO_MAX = 500;

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

// ─── Selector con clases de Contratos ────────────────────────────────────────
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

// ─── Barra de filtros ────────────────────────────────────────────────────────
function BarraFiltros({ cuadrillas, filtros, setFiltros, filtrosActivos, onFiltrar }) {
  return (
    <div className="avisos-filters">
      <div className="avisos-filter-controls">
        <SelectFiltro
          label="Cuadrilla"
          value={filtros.cuadrilla}
          onChange={(v) => setFiltros((p) => ({ ...p, cuadrilla: v }))}
          options={[{ value: 'todas', label: 'Todas las cuadrillas' }, ...cuadrillas.map((c) => ({ value: String(c.id_cuadrilla), label: c.nombre_cuadrilla }))]}
        />
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

// ─── Modal nuevo / editar aviso ──────────────────────────────────────────────
function ModalNuevoAviso({ modo = 'crear', form, setForm, cuadrillas, saving, onClose, onSubmit }) {
  const esEdicion = modo === 'editar';
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 22px 16px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {esEdicion ? <Edit2 size={17} color="#4F46E5" /> : <Send size={18} color="#4F46E5" />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, color: '#111827' }}>{esEdicion ? 'Editar aviso' : 'Nuevo aviso'}</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#6B7280' }}>
                {esEdicion ? 'Actualiza el contenido de este aviso' : 'Publica información importante para la cuadrilla'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: '0 22px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: esEdicion ? '1fr' : '2fr 1fr', gap: 12, marginBottom: 14 }}>
            {!esEdicion && (
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Cuadrilla *
                </label>
                <select
                  value={form.id_cuadrilla}
                  onChange={(e) => setForm((p) => ({ ...p, id_cuadrilla: e.target.value }))}
                  required
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 9, padding: '10px 12px', fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="">Selecciona una cuadrilla</option>
                  {cuadrillas.map((c) => (
                    <option key={c.id_cuadrilla} value={c.id_cuadrilla}>{c.nombre_cuadrilla}</option>
                  ))}
                </select>
              </div>
            )}
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

          <div style={{ marginBottom: 14 }}>
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

          <div style={{ marginBottom: 6 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Contenido *
            </label>
            <textarea
              value={form.contenido}
              onChange={(e) => setForm((p) => ({ ...p, contenido: e.target.value.slice(0, CONTENIDO_MAX) }))}
              placeholder="Escribe el aviso..."
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
              {esEdicion ? <Edit2 size={14} /> : <Send size={14} />}
              {saving ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Publicar aviso'}
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
function MenuAcciones({ onEditar, onEliminar }) {
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
            onClick={() => { setOpen(false); onEditar(); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', textAlign: 'left' }}
          >
            <Edit2 size={14} /> Editar aviso
          </button>
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

function CanalesAvisosAdmin({ usuario, onLogout }) {
  const [avisos,      setAvisos]      = useState([]);
  const [cuadrillas,   setCuadrillas]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [filtros,     setFiltros]     = useState({ cuadrilla: 'todas', prioridad: 'todas', fecha: 'todos' });
  const [filtrosActivos, setFiltrosActivos] = useState(false);
  const [avisoDelete, setAvisoDelete] = useState(null);
  const [eliminando,  setEliminando]  = useState(false);
  const [avisoEditar, setAvisoEditar] = useState(null);
  const [formEditar,  setFormEditar]  = useState(EMPTY_FORM);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const cargar = () => {
    setLoading(true);
    setError(null);
    Promise.all([getTodosLosAvisos(), getCuadrillasAviso()])
      .then(([av, et]) => { setAvisos(av); setCuadrillas(et); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.contenido.trim()) { setError('Título y contenido son obligatorios.'); return; }
    if (!form.id_cuadrilla) { setError('Debes seleccionar una cuadrilla.'); return; }
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

  const abrirEditar = (aviso) => {
    setAvisoEditar(aviso);
    setFormEditar({ titulo: aviso.titulo, contenido: aviso.contenido, prioridad: aviso.prioridad, id_cuadrilla: aviso.id_cuadrilla });
  };

  const handleEditarSubmit = async (e) => {
    e.preventDefault();
    if (!formEditar.titulo.trim() || !formEditar.contenido.trim()) { setError('Título y contenido son obligatorios.'); return; }
    setGuardandoEdicion(true);
    setError(null);
    try {
      const actualizado = await editarAviso(avisoEditar.id_aviso, {
        titulo: formEditar.titulo,
        contenido: formEditar.contenido,
        prioridad: formEditar.prioridad,
      });
      setAvisos((prev) => prev.map((a) => (a.id_aviso === avisoEditar.id_aviso ? { ...a, ...actualizado } : a)));
      setAvisoEditar(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const avisosFiltrados = useMemo(() => {
    return avisos.filter((a) => {
      if (!filtrosActivos) return true;
      if (filtros.cuadrilla !== 'todas' && String(a.id_cuadrilla) !== String(filtros.cuadrilla)) return false;
      if (filtros.prioridad !== 'todas' && String(a.prioridad).toLowerCase() !== filtros.prioridad) return false;
      if (filtros.fecha !== 'todos' && a.fecha_publicacion) {
        const lim = getFechaLimite(filtros.fecha);
        if (lim && new Date(a.fecha_publicacion) < lim) return false;
      }
      return true;
    });
  }, [avisos, filtros, filtrosActivos]);

  const hayFiltrosActivos = filtrosActivos && (filtros.cuadrilla !== 'todas' || filtros.prioridad !== 'todas' || filtros.fecha !== 'todos');

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
            <button className="btn-nuevo-trabajador" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Nuevo aviso
            </button>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          <BarraFiltros
            cuadrillas={cuadrillas}
            filtros={filtros}
            setFiltros={setFiltros}
            filtrosActivos={filtrosActivos}
            onFiltrar={() => setFiltrosActivos((p) => !p)}
          />

          {!loading && (
            <div className="avisos-count">
              {avisosFiltrados.length} aviso{avisosFiltrados.length !== 1 ? 's' : ''}
              {hayFiltrosActivos && filtros.cuadrilla !== 'todas' && ` · ${cuadrillas.find(c => String(c.id_cuadrilla) === String(filtros.cuadrilla))?.nombre_cuadrilla ?? ''}`}
              {hayFiltrosActivos && filtros.prioridad !== 'todas' && ` · ${PRIORIDAD_OPCIONES.find(o => o.value === filtros.prioridad)?.label}`}
              {hayFiltrosActivos && filtros.fecha  !== 'todos' && ` · ${FECHA_OPCIONES.find(o => o.value === filtros.fecha)?.label}`}
            </div>
          )}

          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando avisos...</div>
          ) : avisosFiltrados.length === 0 ? (
            <div className="tw-empty" style={{ padding: '60px 20px' }}>
              <Bell size={40} /><p>No hay avisos{hayFiltrosActivos ? ' que coincidan con los filtros' : ''}.</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="tw-badge" style={{ ...getPrioridadStyle(aviso.prioridad), whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
                        {PRIORIDAD_LABEL[aviso.prioridad] ?? aviso.prioridad}
                      </span>
                      <MenuAcciones onEditar={() => abrirEditar(aviso)} onEliminar={() => setAvisoDelete(aviso)} />
                    </div>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.55, margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>
                    {aviso.contenido}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <span className="tw-etiqueta-badge">{aviso.cuadrilla?.nombre_cuadrilla ?? '—'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ModalNuevoAviso
          modo="crear"
          form={form}
          setForm={setForm}
          cuadrillas={cuadrillas}
          saving={saving}
          onClose={() => { setShowForm(false); setForm(EMPTY_FORM); }}
          onSubmit={handleSubmit}
        />
      )}

      {avisoEditar && (
        <ModalNuevoAviso
          modo="editar"
          form={formEditar}
          setForm={setFormEditar}
          cuadrillas={cuadrillas}
          saving={guardandoEdicion}
          onClose={() => setAvisoEditar(null)}
          onSubmit={handleEditarSubmit}
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

export default CanalesAvisosAdmin;