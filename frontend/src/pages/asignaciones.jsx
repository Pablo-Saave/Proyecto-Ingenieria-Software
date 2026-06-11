import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  Plus, Search, Trash2, X, Save, AlertCircle, Users, Briefcase, UserCheck,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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
    throw new Error(err.message || err.error || `Error ${res.status}`);
  }
  return res.json();
}

const EMPTY_FORM = {
  id_trabajador: '',
  tipo_jornada: 'Diurna',
  cargo_operativo: '',
  fecha_asignacion: new Date().toISOString().slice(0, 10),
  fecha_retiro: '',
};

const JORNADAS = ['Diurna', 'Nocturna', 'Mixta'];

function Asignaciones({ usuario, onLogout }) {
  const [asignaciones, setAsignaciones]   = useState([]);
  const [trabajadores, setTrabajadores]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [formError, setFormError]         = useState(null);
  const [saving, setSaving]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Carga ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resA, resT] = await Promise.all([
        apiFetch('/api/asignados'),
        apiFetch('/api/trabajadores'),
      ]);
      setAsignaciones(Array.isArray(resA) ? resA : resA.data ?? []);
      setTrabajadores(Array.isArray(resT) ? resT : resT.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const nombreTrabajador = (id) => {
    const t = trabajadores.find((w) => w.id_trabajador === id);
    return t ? `${t.nombres} ${t.apellidos}` : `ID ${id}`;
  };

  const tipoTrabajador = (id) => {
    const t = trabajadores.find((w) => w.id_trabajador === id);
    return t?.tipo_usuario ?? '—';
  };

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // Separar supervisores y trabajadores para el formulario
  const supervisores = trabajadores.filter((t) => t.tipo_usuario === 'supervisor');
  const operarios    = trabajadores.filter((t) => t.tipo_usuario === 'trabajador');

  const filtered = asignaciones.filter((a) => {
    const q = searchQuery.toLowerCase();
    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
    const nombre = nombreTrabajador(idT).toLowerCase();
    return !q || nombre.includes(q) || a.cargo_operativo?.toLowerCase().includes(q);
  });

  // Conteos para métricas
  const activas      = asignaciones.filter((a) => !a.fecha_retiro).length;
  const supervisoresAsignados = asignaciones.filter((a) => {
    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
    return !a.fecha_retiro && tipoTrabajador(idT) === 'supervisor';
  }).length;
  const operariosAsignados = asignaciones.filter((a) => {
    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
    return !a.fecha_retiro && tipoTrabajador(idT) === 'trabajador';
  }).length;

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openCrear = () => {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormError(null); };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        ...formData,
        id_trabajador:   Number(formData.id_trabajador),
        fecha_retiro:    formData.fecha_retiro || null,
      };
      await apiFetch('/api/asignados', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      closeModal();
      fetchData();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/asignados/${id}`, { method: 'DELETE' });
      setAsignaciones((prev) => prev.filter((a) => a.id_asignado !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          {/* Encabezado */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Asignaciones</h1>
              <p className="vista-general-subtitle">Gestión de cuadrillas y asignación de personal</p>
            </div>
            <button className="btn-nuevo-trabajador" onClick={openCrear}>
              <Plus size={16} /> Nueva Asignación
            </button>
          </div>

          {/* Métricas */}
          <div className="metrics-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-title">Asignaciones Activas</h3>
                <Users size={20} color="#4F46E5" />
              </div>
              <div className="metric-value">{activas}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-title">Supervisores</h3>
                <UserCheck size={20} color="#10B981" />
              </div>
              <div className="metric-value" style={{ color: '#10B981' }}>{supervisoresAsignados}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <h3 className="metric-title">Operarios</h3>
                <Briefcase size={20} color="#F59E0B" />
              </div>
              <div className="metric-value" style={{ color: '#F59E0B' }}>{operariosAsignados}</div>
            </div>
          </div>

          {/* Buscador */}
          <div className="tw-toolbar">
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input
                type="text"
                className="tw-search-input"
                placeholder="Buscar por nombre o cargo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="tw-count" style={{ marginBottom: '16px' }}>
            <Users size={14} />
            {filtered.length} asignación{filtered.length !== 1 ? 'es' : ''}
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {/* Tabla */}
          <div className="tw-table-card">
            {loading ? (
              <div className="tw-loading"><div className="tw-spinner" /> Cargando asignaciones...</div>
            ) : filtered.length === 0 ? (
              <div className="tw-empty">
                <Users size={40} />
                <p>No hay asignaciones registradas</p>
              </div>
            ) : (
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>Trabajador</th>
                    <th>Rol</th>
                    <th>Cargo Operativo</th>
                    <th>Jornada</th>
                    <th>Fecha Asignación</th>
                    <th>Fecha Retiro</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const idT    = a.trabajador?.id_trabajador ?? a.id_trabajador;
                    const activa = !a.fecha_retiro;
                    return (
                      <tr key={a.id_asignado}>
                        <td>
                          <div className="tw-name-cell">
                            <div className="tw-avatar">
                              {(nombreTrabajador(idT)[0] ?? '?').toUpperCase()}
                            </div>
                            <div className="tw-fullname">{nombreTrabajador(idT)}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`tw-badge ${tipoTrabajador(idT) === 'supervisor' ? 'badge-activo' : 'badge-licencia'}`}>
                            {tipoTrabajador(idT)}
                          </span>
                        </td>
                        <td>{a.cargo_operativo ?? '—'}</td>
                        <td>{a.tipo_jornada ?? '—'}</td>
                        <td>{formatFecha(a.fecha_asignacion)}</td>
                        <td>{a.fecha_retiro ? formatFecha(a.fecha_retiro) : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                        <td>
                          <span className={`tw-badge ${activa ? 'badge-activo' : 'badge-inactivo'}`}>
                            {activa ? 'Activa' : 'Finalizada'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="tw-btn-delete"
                            title="Eliminar asignación"
                            onClick={() => setConfirmDelete(a.id_asignado)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Asignación */}
      {showModal && (
        <div className="tw-modal-overlay" onClick={closeModal}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Nueva Asignación</h2>
              <button className="tw-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            {formError && <div className="tw-form-error"><AlertCircle size={14} /> {formError}</div>}
            <form className="tw-form" onSubmit={handleSubmit}>
              <div className="tw-form-grid">

                {/* Supervisor */}
                <div className="tw-field tw-field-full">
                  <label>Supervisor de la cuadrilla *</label>
                  <select
                    name="id_trabajador"
                    value={formData.id_trabajador}
                    onChange={handleChange}
                    required
                    style={{ borderLeft: '3px solid #10B981' }}
                  >
                    <option value="">— Seleccionar supervisor —</option>
                    {supervisores.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>
                        {t.nombres} {t.apellidos} — {t.rut}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    O selecciona un operario abajo si es una asignación individual
                  </span>
                </div>

                {/* Operario (alternativo) */}
                <div className="tw-field tw-field-full">
                  <label>— O — Operario individual</label>
                  <select
                    name="id_trabajador"
                    value={formData.id_trabajador}
                    onChange={handleChange}
                    style={{ borderLeft: '3px solid #F59E0B' }}
                  >
                    <option value="">— Seleccionar trabajador —</option>
                    {operarios.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>
                        {t.nombres} {t.apellidos} — {t.rut}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tw-field">
                  <label>Cargo Operativo *</label>
                  <input
                    name="cargo_operativo"
                    value={formData.cargo_operativo}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Operario de Aseo"
                  />
                </div>

                <div className="tw-field">
                  <label>Tipo de Jornada *</label>
                  <select name="tipo_jornada" value={formData.tipo_jornada} onChange={handleChange}>
                    {JORNADAS.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>

                <div className="tw-field">
                  <label>Fecha Asignación *</label>
                  <input
                    name="fecha_asignacion"
                    type="date"
                    value={formData.fecha_asignacion}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="tw-field">
                  <label>Fecha Retiro <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
                  <input
                    name="fecha_retiro"
                    type="date"
                    value={formData.fecha_retiro}
                    onChange={handleChange}
                  />
                </div>

              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={saving}>
                  <Save size={14} /> {saving ? 'Guardando...' : 'Crear Asignación'}
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
              ¿Estás seguro de que deseas eliminar esta asignación? El trabajador perderá el acceso a esta cuadrilla.
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

export default Asignaciones;