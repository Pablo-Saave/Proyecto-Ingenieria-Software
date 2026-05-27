import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/ausencias.css';
import {
  CalendarOff, Plus, Search, Edit2, Trash2, X, Save, AlertCircle, ClipboardList,
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status}`);
  }
  return res.json();
}

const EMPTY_FORM = {
  id_ausencia: '',
  fecha_inicio: '',
  fecha_termino: '',
  motivo: '',
  estado: 'Pendiente',
  id_trabajador: '',
};

// ── Tipos de ausencia disponibles ─────────────────────────────────────────
const ESTADOS_AUSENCIA = ['Pendiente', 'Aprobada', 'Rechazada'];
const FILTROS = ['Todos', 'Pendiente', 'Aprobada', 'Rechazada'];

function getIniciales(nombres = '', apellidos = '') {
  const n = String(nombres || '').trim();
  const a = String(apellidos || '').trim();
  return ((n[0] || '') + (a[0] || '')).toUpperCase();
}

function Ausencias({ onLogout }) {
  const [ausencias, setAusencias]       = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [showModal, setShowModal]       = useState(false);
  const [modalMode, setModalMode]       = useState('crear');
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [selectedId, setSelectedId]     = useState(null);
  const [formError, setFormError]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchAusencias = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resA, resT] = await Promise.all([
        apiFetch('/api/ausencias'),
        apiFetch('/api/trabajadores'),
      ]);
      setAusencias(Array.isArray(resA) ? resA : resA.data ?? []);
      setTrabajadores(Array.isArray(resT) ? resT : resT.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAusencias(); }, []);

  // Mapa id → nombre completo para mostrar en tabla
  const nombreTrabajador = (id) => {
    const t = trabajadores.find((w) => w.id_trabajador === id);
    return t ? `${t.nombres} ${t.apellidos}` : `ID ${id}`;
  };

  const filtered = ausencias.filter((a) => {
    const q = searchQuery.toLowerCase();
    const nombre = nombreTrabajador(a.id_trabajador).toLowerCase();
    const matchSearch =
      !q ||
      nombre.includes(q) ||
      a.motivo?.toLowerCase().includes(q);
    const matchEstado =
      filterEstado === 'Todos' || a.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const openCrear = () => {
    setFormData(EMPTY_FORM);
    setSelectedId(null);
    setFormError(null);
    setModalMode('crear');
    setShowModal(true);
  };

  const openEditar = (a) => {
    setFormData({
      id_trabajador: a.id_trabajador ?? '',
      fecha_inicio:  a.fecha_inicio?.slice(0, 10) ?? '',
      fecha_termino: a.fecha.termino?.slice(0, 10) ?? '',
      motivo:        a.motivo ?? '',
      estado:        a.estado ?? 'Pendiente',
    });
    setSelectedId(a.id_ausencia);
    setFormError(null);
    setModalMode('editar');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormError(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = { ...formData, id_trabajador: Number(formData.id_trabajador) };
      if (modalMode === 'crear') {
        const res  = await apiFetch('/api/ausencias', { method: 'POST', body: JSON.stringify(payload) });
        const item = res.data ?? res;
        setAusencias((prev) => [...prev, item]);
      } else {
        const res  = await apiFetch(`/api/ausencias/${selectedId}`, { method: 'PUT', body: JSON.stringify(payload) });
        const item = res.data ?? res;
        setAusencias((prev) => prev.map((a) => (a.id_ausencia === selectedId ? item : a)));
      }
      closeModal();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/ausencias/${id}`, { method: 'DELETE' });
      setAusencias((prev) => prev.filter((a) => a.id_ausencia !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const estadoBadgeClass = (estado) => {
    if (estado === 'Aprobada')  return 'badge-activo';
    if (estado === 'Rechazada') return 'badge-inactivo';
    return 'badge-licencia'; // Pendiente
  };

  const diasAusencia = (inicio, fin) => {
    if (!inicio || !fin) return '—';
    const diff = (new Date(fin) - new Date(inicio)) / (1000 * 60 * 60 * 24);
    return diff >= 0 ? `${diff + 1} día${diff !== 0 ? 's' : ''}` : '—';
  };

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          {/* Encabezado */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Ausencias</h1>
              <p className="vista-general-subtitle">Registro de licencias, permisos e inasistencias</p>
            </div>
            <button className="btn-nuevo-trabajador" onClick={openCrear}>
              <Plus size={16} /> Nueva Ausencia
            </button>
          </div>

          {/* Toolbar */}
          <div className="tw-toolbar">
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input
                type="text"
                className="tw-search-input"
                placeholder="Buscar por trabajador, motivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="tw-filters">
              {FILTROS.map((f) => (
                <button
                  key={f}
                  className={`tw-filter-btn ${filterEstado === f ? 'tw-filter-active' : ''}`}
                  onClick={() => setFilterEstado(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Contador */}
          <div className="tw-count">
            <CalendarOff size={14} />
            {filtered.length} ausencia{filtered.length !== 1 ? 's' : ''}
            {filterEstado !== 'Todos' && ` · ${filterEstado}`}
          </div>

          {error && (
            <div className="tw-error-banner">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Tabla */}
          <div className="tw-table-card">
            {loading ? (
              <div className="tw-loading">
                <div className="tw-spinner" /> Cargando ausencias...
              </div>
            ) : filtered.length === 0 ? (
              <div className="tw-empty">
                <ClipboardList size={40} />
                <p>No se encontraron ausencias</p>
              </div>
            ) : (
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>Trabajador</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Termino</th>
                    <th>Duración</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id_ausencia}>
                      <td>
                        <div className="tw-name-cell">
                          <div className="tw-avatar">
                            {a.trabajador 
                              ? getIniciales(a.trabajador.nombres, a.trabajador.apellidos) || '?'
                              : '?'}
                          </div>
                          <div className="tw-fullname">
                            {a.trabajador
                              ? `${a.trabajador.nombres} ${a.trabajador.apellidos}`
                              : 'Sin trabajador'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="aus-tipo-badge">{a.motivo?.slice(0, 15) ?? '—'}</span>
                      </td>
                      <td>{formatFecha(a.fecha_inicio)}</td>
                      <td>{formatFecha(a.fecha_termino)}</td>
                      <td className="aus-duracion">{diasAusencia(a.fecha_inicio, a.fecha_termino)}</td>
                      <td className="aus-motivo">{a.motivo ?? '—'}</td>
                      <td>
                        <span className={`tw-badge ${estadoBadgeClass(a.estado)}`}>
                          {a.estado ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div className="tw-actions">
                          <button className="tw-btn-edit" title="Editar" onClick={() => openEditar(a)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="tw-btn-delete" title="Eliminar" onClick={() => setConfirmDelete(a.id_ausencia)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="tw-modal-overlay" onClick={closeModal}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>{modalMode === 'crear' ? 'Nueva Ausencia' : 'Editar Ausencia'}</h2>
              <button className="tw-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            {formError && (
              <div className="tw-form-error"><AlertCircle size={14} /> {formError}</div>
            )}
            <form className="tw-form" onSubmit={handleSubmit}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Trabajador *</label>
                  <select name="id_trabajador" value={formData.id_trabajador} onChange={handleChange} required>
                    <option value="">— Seleccionar —</option>
                    {trabajadores.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>
                        {t.nombres} {t.apellidos} — {t.rut}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Tipo de Ausencia *</label>
                  <select name="tipo_ausencia" value={formData.tipo_ausencia} onChange={handleChange} required>
                    <option value="">— Seleccionar —</option>
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Estado</label>
                  <select name="estado" value={formData.estado} onChange={handleChange}>
                    {ESTADOS_AUSENCIA.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Fecha Inicio *</label>
                  <input name="fecha_inicio" type="date" value={formData.fecha_inicio} onChange={handleChange} required />
                </div>
                <div className="tw-field">
                  <label>Fecha Fin</label>
                  <input name="fecha_fin" type="date" value={formData.fecha_fin} onChange={handleChange} />
                </div>
                <div className="tw-field tw-field-full">
                  <label>Motivo</label>
                  <input name="motivo" value={formData.motivo} onChange={handleChange} placeholder="Descripción breve del motivo" />
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Guardando...' : modalMode === 'crear' ? 'Registrar Ausencia' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {confirmDelete !== null && (
        <div className="tw-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Confirmar eliminación</h2>
              <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <p className="tw-confirm-text">
              ¿Estás seguro de que deseas eliminar esta ausencia? Esta acción no se puede deshacer.
            </p>
            <div className="tw-modal-footer">
              <button className="tw-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="tw-btn-delete-confirm" onClick={() => handleDelete(confirmDelete)}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ausencias;