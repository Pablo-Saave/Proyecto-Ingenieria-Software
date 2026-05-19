import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

// ─── Configuración de la API ───────────────────────────────────────────────
// Cambia esta URL base a la de tu backend
const API_BASE = 'http://localhost:3000';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token'); // ajusta si guardas el JWT distinto
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

// ─── Valores por defecto del formulario ───────────────────────────────────
const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  rut: '',
  email: '',
  telefono: '',
  cargo: '',
  estado: 'activo',
};

// ─── Componente principal ─────────────────────────────────────────────────
function Trabajadores({ onLogout }) {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('crear'); // 'crear' | 'editar'
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null); // id a eliminar

  // ── Cargar trabajadores ──────────────────────────────────────────────────
  const fetchTrabajadores = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ajusta el endpoint según tu API, p.ej. /api/usuarios o /api/trabajadores
      const data = await apiFetch('/api/trabajadores');
      setTrabajadores(Array.isArray(data) ? data : data.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrabajadores();
  }, []);

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const filtered = trabajadores.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      `${t.nombre} ${t.apellido}`.toLowerCase().includes(q) ||
      t.rut?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.cargo?.toLowerCase().includes(q);
    const matchEstado =
      filterEstado === 'todos' || t.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  // ── Abrir modal ──────────────────────────────────────────────────────────
  const openCrear = () => {
    setFormData(EMPTY_FORM);
    setSelectedId(null);
    setFormError(null);
    setModalMode('crear');
    setShowModal(true);
  };

  const openEditar = (t) => {
    setFormData({
      nombre: t.nombre ?? '',
      apellido: t.apellido ?? '',
      rut: t.rut ?? '',
      email: t.email ?? '',
      telefono: t.telefono ?? '',
      cargo: t.cargo ?? '',
      estado: t.estado ?? 'activo',
    });
    setSelectedId(t.id);
    setFormError(null);
    setModalMode('editar');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  // ── Guardar (crear o editar) ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (modalMode === 'crear') {
        const nuevo = await apiFetch('/api/trabajadores', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setTrabajadores((prev) => [...prev, nuevo]);
      } else {
        const actualizado = await apiFetch(`/api/trabajadores/${selectedId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setTrabajadores((prev) =>
          prev.map((t) => (t.id === selectedId ? actualizado : t))
        );
      }
      closeModal();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/trabajadores/${id}`, { method: 'DELETE' });
      setTrabajadores((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const estadoBadgeClass = (estado) => {
    if (estado === 'activo') return 'badge-activo';
    if (estado === 'inactivo') return 'badge-inactivo';
    return 'badge-licencia';
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />

        <div className="dashboard-content">
          {/* Encabezado */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Trabajadores</h1>
              <p className="vista-general-subtitle">
                Gestión de personal del servicio de aseo
              </p>
            </div>
            <button className="btn-nuevo-trabajador" onClick={openCrear}>
              <Plus size={16} />
              Nuevo Trabajador
            </button>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className="tw-toolbar">
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input
                type="text"
                className="tw-search-input"
                placeholder="Buscar por nombre, RUT, cargo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="tw-filters">
              {['todos', 'activo', 'inactivo', 'licencia'].map((f) => (
                <button
                  key={f}
                  className={`tw-filter-btn ${filterEstado === f ? 'tw-filter-active' : ''}`}
                  onClick={() => setFilterEstado(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Contador */}
          <div className="tw-count">
            <Users size={14} />
            {filtered.length} trabajador{filtered.length !== 1 ? 'es' : ''}
            {filterEstado !== 'todos' && ` · ${filterEstado}`}
          </div>

          {/* Error global */}
          {error && (
            <div className="tw-error-banner">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Tabla */}
          <div className="tw-table-card">
            {loading ? (
              <div className="tw-loading">
                <div className="tw-spinner" />
                Cargando trabajadores...
              </div>
            ) : filtered.length === 0 ? (
              <div className="tw-empty">
                <UserCheck size={40} />
                <p>No se encontraron trabajadores</p>
              </div>
            ) : (
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>RUT</th>
                    <th>Cargo</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="tw-name-cell">
                          <div className="tw-avatar">
                            {(t.nombre?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div>
                            <div className="tw-fullname">
                              {t.nombre} {t.apellido}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="tw-rut">{t.rut ?? '—'}</td>
                      <td>{t.cargo ?? '—'}</td>
                      <td className="tw-email">{t.email ?? '—'}</td>
                      <td>{t.telefono ?? '—'}</td>
                      <td>
                        <span className={`tw-badge ${estadoBadgeClass(t.estado)}`}>
                          {t.estado ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div className="tw-actions">
                          <button
                            className="tw-btn-edit"
                            title="Editar"
                            onClick={() => openEditar(t)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="tw-btn-delete"
                            title="Eliminar"
                            onClick={() => setConfirmDelete(t.id)}
                          >
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

      {/* ── Modal Crear / Editar ──────────────────────────────────────────── */}
      {showModal && (
        <div className="tw-modal-overlay" onClick={closeModal}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>{modalMode === 'crear' ? 'Nuevo Trabajador' : 'Editar Trabajador'}</h2>
              <button className="tw-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="tw-form-error">
                <AlertCircle size={14} /> {formError}
              </div>
            )}

            <form className="tw-form" onSubmit={handleSubmit}>
              <div className="tw-form-grid">
                <div className="tw-field">
                  <label>Nombre *</label>
                  <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Juan"
                  />
                </div>
                <div className="tw-field">
                  <label>Apellido *</label>
                  <input
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Pérez"
                  />
                </div>
                <div className="tw-field">
                  <label>RUT *</label>
                  <input
                    name="rut"
                    value={formData.rut}
                    onChange={handleChange}
                    required
                    placeholder="Ej: 12.345.678-9"
                  />
                </div>
                <div className="tw-field">
                  <label>Email</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Ej: juan@empresa.cl"
                  />
                </div>
                <div className="tw-field">
                  <label>Teléfono</label>
                  <input
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="Ej: +56 9 1234 5678"
                  />
                </div>
                <div className="tw-field">
                  <label>Cargo *</label>
                  <input
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleChange}
                    required
                    placeholder="Ej: Operario de Aseo"
                  />
                </div>
                <div className="tw-field tw-field-full">
                  <label>Estado</label>
                  <select name="estado" value={formData.estado} onChange={handleChange}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="licencia">Con Licencia</option>
                  </select>
                </div>
              </div>

              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="tw-btn-save" disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Guardando...' : modalMode === 'crear' ? 'Crear Trabajador' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmación de eliminación ───────────────────────────────────── */}
      {confirmDelete !== null && (
        <div className="tw-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Confirmar eliminación</h2>
              <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="tw-confirm-text">
              ¿Estás seguro de que deseas eliminar este trabajador? Esta acción no se puede deshacer.
            </p>
            <div className="tw-modal-footer">
              <button className="tw-btn-cancel" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button
                className="tw-btn-delete-confirm"
                onClick={() => handleDelete(confirmDelete)}
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trabajadores;