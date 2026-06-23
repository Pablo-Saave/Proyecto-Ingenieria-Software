import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  Users, Plus, Search, Edit2, Trash2, X, Save, UserCheck, AlertCircle, Tag,
} from 'lucide-react';
import {
  getTrabajadores,
  createTrabajador,
  updateTrabajador,
  deleteTrabajador,
  getEtiquetas,
  createEtiqueta,
} from '../services/trabajadoresService';

const EMPTY_FORM = {
  nombres:            '',
  apellidos:          '',
  rut:                '',
  correo:             '',
  password:           '',
  tipo_usuario:       'trabajador',
  telefono:           '',
  sexo:               'M',
  direccion:          '',
  fecha_nacimiento:   '',
  fecha_ingreso:      '',
  estado_laboral:     'Activo',
  id_etiqueta:        '',
};

const EMPTY_ETIQUETA = { nombre_etiqueta: '', descripcion: '' };

function getIniciales(nombres = '', apellidos = '') {
  const n = String(nombres || '').trim();
  const a = String(apellidos || '').trim();
  return ((n[0] || '') + (a[0] || '')).toUpperCase();
}

function Trabajadores({ usuario, onLogout }) {
  const [trabajadores, setTrabajadores]     = useState([]);
  const [etiquetas, setEtiquetas]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterEstado, setFilterEstado]     = useState('Todos');

  // Modal trabajador
  const [showModal, setShowModal]           = useState(false);
  const [modalMode, setModalMode]           = useState('crear');
  const [formData, setFormData]             = useState(EMPTY_FORM);
  const [selectedId, setSelectedId]         = useState(null);
  const [formError, setFormError]           = useState(null);
  const [saving, setSaving]                 = useState(false);

  // Modal etiqueta
  const [showEtiquetaModal, setShowEtiquetaModal] = useState(false);
  const [etiquetaForm, setEtiquetaForm]           = useState(EMPTY_ETIQUETA);
  const [etiquetaError, setEtiquetaError]         = useState(null);
  const [savingEtiqueta, setSavingEtiqueta]       = useState(false);

  // Confirmar eliminación
  const [confirmDelete, setConfirmDelete]   = useState(null);

  /* ── Carga inicial ─────────────────────────────────────────── */
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tw, et] = await Promise.all([getTrabajadores(), getEtiquetas()]);
      setTrabajadores(tw);
      setEtiquetas(et);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── Filtrado ──────────────────────────────────────────────── */
  const ESTADOS = ['Todos', 'Activo', 'Inactivo', 'Licencia'];

  const filtered = trabajadores.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      `${t.nombres} ${t.apellidos}`.toLowerCase().includes(q) ||
      t.rut?.toLowerCase().includes(q) ||
      t.correo?.toLowerCase().includes(q) ||
      t.etiqueta?.nombre_etiqueta?.toLowerCase().includes(q);
    const matchEstado =
      filterEstado === 'Todos' ||
      t.estado_laboral?.toLowerCase() === filterEstado.toLowerCase();
    return matchSearch && matchEstado;
  });

  /* ── Modal trabajador ──────────────────────────────────────── */
  const openCrear = () => {
    setFormData(EMPTY_FORM);
    setSelectedId(null);
    setFormError(null);
    setModalMode('crear');
    setShowModal(true);
  };

  const openEditar = (t) => {
    setFormData({
      nombres:            t.nombres ?? '',
      apellidos:          t.apellidos ?? '',
      rut:                t.rut ?? '',
      correo:             t.correo ?? '',
      password:           '',
      tipo_usuario:       t.tipo_usuario ?? 'trabajador',
      telefono:           t.telefono ?? '',
      sexo:               t.sexo ?? 'M',
      direccion:          t.direccion ?? '',
      fecha_nacimiento:   t.fecha_nacimiento?.slice(0, 10) ?? '',
      fecha_ingreso:      t.fecha_ingreso?.slice(0, 10) ?? '',
      estado_laboral:     t.estado_laboral ?? 'Activo',
      id_etiqueta:        t.etiqueta?.id_etiqueta ?? '',
    });
    setSelectedId(t.id_trabajador);
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
      const payload = {
        ...formData,
        id_etiqueta: formData.id_etiqueta ? parseInt(formData.id_etiqueta) : null,
      };
      if (modalMode === 'crear') {
        const item = await createTrabajador(payload);
        setTrabajadores((prev) => [...prev, item]);
      } else {
        const item = await updateTrabajador(selectedId, payload);
        setTrabajadores((prev) =>
          prev.map((t) => (t.id_trabajador === selectedId ? item : t))
        );
      }
      closeModal();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  /* ── Modal etiqueta ────────────────────────────────────────── */
  const openEtiquetaModal = () => {
    setEtiquetaForm(EMPTY_ETIQUETA);
    setEtiquetaError(null);
    setShowEtiquetaModal(true);
  };

  const closeEtiquetaModal = () => { setShowEtiquetaModal(false); setEtiquetaError(null); };

  const handleEtiquetaSubmit = async (e) => {
    e.preventDefault();
    setEtiquetaError(null);
    setSavingEtiqueta(true);
    try {
      const nueva = await createEtiqueta(etiquetaForm);
      setEtiquetas((prev) => [...prev, nueva]);
      // Seleccionar automáticamente la etiqueta recién creada
      setFormData((prev) => ({ ...prev, id_etiqueta: String(nueva.id_etiqueta) }));
      closeEtiquetaModal();
    } catch (e) {
      setEtiquetaError(e.message);
    } finally {
      setSavingEtiqueta(false);
    }
  };

  /* ── Eliminar trabajador ───────────────────────────────────── */
  const handleDelete = async (id) => {
    try {
      await deleteTrabajador(id);
      setTrabajadores((prev) => prev.filter((t) => t.id_trabajador !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const estadoBadgeClass = (estado) => {
    const e = estado?.toLowerCase();
    if (e === 'activo')   return 'badge-activo';
    if (e === 'inactivo') return 'badge-inactivo';
    return 'badge-licencia';
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          {/* Encabezado */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Trabajadores</h1>
              <p className="vista-general-subtitle">Gestión de personal del servicio de aseo</p>
            </div>
            <div className="tw-header-actions">
              <button className="btn-nueva-etiqueta" onClick={openEtiquetaModal}>
                <Tag size={14} /> Nueva Etiqueta
              </button>
              <button className="btn-nuevo-trabajador" onClick={openCrear}>
                <Plus size={14} /> Nuevo Trabajador
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="tw-toolbar">
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input
                type="text"
                className="tw-search-input"
                placeholder="Buscar por nombre, RUT, etiqueta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="tw-filters">
              {ESTADOS.map((f) => (
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
            <Users size={14} />
            {filtered.length} trabajador{filtered.length !== 1 ? 'es' : ''}
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
                <div className="tw-spinner" /> Cargando trabajadores...
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
                    <th>Etiqueta</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id_trabajador}>
                      <td>
                        <div className="tw-name-cell">
                          <div className="tw-avatar">
                            {getIniciales(t.nombres, t.apellidos) || '?'}
                          </div>
                          <div className="tw-fullname">
                            {t.nombres} {t.apellidos}
                          </div>
                        </div>
                      </td>
                      <td className="tw-rut">{t.rut ?? '—'}</td>
                      <td>
                        {t.etiqueta?.nombre_etiqueta
                          ? <span className="tw-etiqueta-badge">{t.etiqueta.nombre_etiqueta}</span>
                          : '—'}
                      </td>
                      <td className="tw-email">{t.correo ?? '—'}</td>
                      <td>{t.telefono ?? '—'}</td>
                      <td>
                        <span className={`tw-badge ${estadoBadgeClass(t.estado_laboral)}`}>
                          {t.estado_laboral ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div className="tw-actions">
                          <button className="tw-btn-edit" title="Editar" onClick={() => openEditar(t)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="tw-btn-delete" title="Eliminar" onClick={() => setConfirmDelete(t.id_trabajador)}>
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

      {/* ── Modal Crear / Editar Trabajador ── */}
      {showModal && (
        <div className="tw-modal-overlay">
          <div className="tw-modal tw-modal-md" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '95vw' }}>
            <div className="tw-modal-header" style={{ padding: '14px 22px' }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>{modalMode === 'crear' ? 'Nuevo Trabajador' : 'Editar Trabajador'}</h2>
              <button className="tw-modal-close" onClick={closeModal}><X size={16} /></button>
            </div>

            {formError && (
              <div className="tw-form-error"><AlertCircle size={13} /> {formError}</div>
            )}

            <form className="tw-form" onSubmit={handleSubmit} style={{ padding: '14px 22px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 12px' }}>

                {/* Fila 1: Nombres · Apellidos · RUT */}
                {[
                  { label: 'Nombres *',   name: 'nombres',   type: 'text',     required: true,  placeholder: 'Juan Carlos' },
                  { label: 'Apellidos *', name: 'apellidos', type: 'text',     required: true,  placeholder: 'García López' },
                  { label: 'RUT *',       name: 'rut',       type: 'text',     required: true,  placeholder: '12345678-9' },
                  { label: 'Correo *',    name: 'correo',    type: 'email',    required: true,  placeholder: 'juan@empresa.cl' },
                  { label: 'Teléfono',    name: 'telefono',  type: 'text',     required: false, placeholder: '+56 9 1234 5678' },
                ].map(({ label, name, type, required, placeholder }) => (
                  <div key={name} className="tw-field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>{label}</label>
                    <input name={name} type={type} value={formData[name] ?? ''} onChange={handleChange} required={required} placeholder={placeholder}
                      style={{ height: 36, fontSize: 13, padding: '0 11px', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                ))}

                {/* Contraseña (solo crear) */}
                {modalMode === 'crear' && (
                  <div className="tw-field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>Contraseña *</label>
                    <input name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="Contraseña inicial"
                      style={{ height: 36, fontSize: 13, padding: '0 11px', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                )}

                {/* Tipo Usuario */}
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>Tipo Usuario *</label>
                  <select name="tipo_usuario" value={formData.tipo_usuario} onChange={handleChange} required
                    style={{ height: 36, fontSize: 13, padding: '0 8px', width: '100%', boxSizing: 'border-box' }}>
                    <option value="trabajador">Trabajador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>

                {/* Sexo */}
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>Sexo</label>
                  <select name="sexo" value={formData.sexo} onChange={handleChange}
                    style={{ height: 36, fontSize: 13, padding: '0 8px', width: '100%', boxSizing: 'border-box' }}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {/* Etiqueta */}
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>Etiqueta</label>
                  <select name="id_etiqueta" value={formData.id_etiqueta} onChange={handleChange} className="tw-etiqueta-select"
                    style={{ height: 36, fontSize: 13, padding: '0 8px', width: '100%', boxSizing: 'border-box' }}>
                    <option value="">Sin etiqueta</option>
                    {etiquetas.map((et) => (
                      <option key={et.id_etiqueta} value={et.id_etiqueta}>{et.nombre_etiqueta}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha Nacimiento */}
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>F. Nacimiento</label>
                  <input name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={handleChange}
                    style={{ height: 36, fontSize: 13, padding: '0 8px', width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* Fecha Ingreso */}
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>F. Ingreso *</label>
                  <input name="fecha_ingreso" type="date" value={formData.fecha_ingreso} onChange={handleChange} required
                    style={{ height: 36, fontSize: 13, padding: '0 8px', width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* Estado Laboral */}
                <div className="tw-field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>Estado Laboral</label>
                  <select name="estado_laboral" value={formData.estado_laboral} onChange={handleChange}
                    style={{ height: 36, fontSize: 13, padding: '0 8px', width: '100%', boxSizing: 'border-box' }}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Licencia">Con Licencia</option>
                  </select>
                </div>

                {/* Dirección: full width */}
                <div className="tw-field" style={{ gridColumn: 'span 3', marginBottom: 0 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>Dirección</label>
                  <input name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Ej: Calle Principal 123, Santiago"
                    style={{ height: 36, fontSize: 13, padding: '0 11px', width: '100%', boxSizing: 'border-box' }} />
                </div>

              </div>

              <div className="tw-modal-footer" style={{ padding: '12px 0 0', marginTop: 12 }}>
                <button type="button" className="tw-btn-cancel" onClick={closeModal} style={{ fontSize: 13, padding: '8px 18px' }}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={saving} style={{ fontSize: 13, padding: '8px 18px' }}>
                  <Save size={12} />
                  {saving ? 'Guardando...' : modalMode === 'crear' ? 'Crear Trabajador' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Nueva Etiqueta ── */}
      {showEtiquetaModal && (
        <div className="tw-modal-overlay">
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Nueva Etiqueta</h2>
              <button className="tw-modal-close" onClick={closeEtiquetaModal}><X size={18} /></button>
            </div>
            {etiquetaError && (
              <div className="tw-form-error"><AlertCircle size={14} /> {etiquetaError}</div>
            )}
            <form className="tw-form" onSubmit={handleEtiquetaSubmit}>
              <div className="tw-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="tw-field">
                  <label>Nombre de la Etiqueta *</label>
                  <input
                    value={etiquetaForm.nombre_etiqueta}
                    onChange={(e) => setEtiquetaForm((p) => ({ ...p, nombre_etiqueta: e.target.value }))}
                    required
                    placeholder="Ej: Cuadrilla Norte"
                  />
                </div>
                <div className="tw-field">
                  <label>Descripción</label>
                  <input
                    value={etiquetaForm.descripcion}
                    onChange={(e) => setEtiquetaForm((p) => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Ej: Equipo zona norte de la ciudad"
                  />
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={closeEtiquetaModal}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={savingEtiqueta}>
                  <Save size={14} />
                  {savingEtiqueta ? 'Guardando...' : 'Crear Etiqueta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ── */}
      {confirmDelete !== null && (
        <div className="tw-modal-overlay">
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Confirmar eliminación</h2>
              <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <p className="tw-confirm-text">
              ¿Estás seguro de que deseas eliminar este trabajador? Esta acción no se puede deshacer.
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

export default Trabajadores;
