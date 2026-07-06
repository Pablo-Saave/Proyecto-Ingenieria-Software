import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  getProyectos,
  crearProyecto,
  inactivarProyecto,
  reactivarProyecto,
  actualizarProyecto,
  cambiarSupervisor,
  removerSupervisor,
  getClientes,
  getSupervisoresSinProyecto,
  getTrabajadorById,
} from '../services/proyectosService';
import '../styles/proyectos.css';

// ─── Constantes ────────────────────────────────────────────────────────────
const CREAR_FORM_INITIAL = {
  id_cliente: '',
  id_supervisor: '',
  nombre_proyecto: '',
  tipo_instalacion: '',
  direccion: '',
  nivel_exigencia: '',
  cantidad_personal_requerido: '',
};

const EDITAR_FORM_FIELDS = [
  'nombre_proyecto',
  'tipo_instalacion',
  'direccion',
  'nivel_exigencia',
  'cantidad_personal_requerido',
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CL');
}

function getPageNumbers(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function Proyectos({ usuario, onLogout }) {

  // ── Datos ──────────────────────────────────────────────────────────────
  const [proyectos, setProyectos]               = useState([]);
  const [meta, setMeta]                         = useState({ total: 0, page: 1, limit: 8, totalPages: 1 });
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [supervisorInfo, setSupervisorInfo]     = useState(null);
  const [clientes, setClientes]                 = useState([]);
  const [supervisoresSP, setSupervisoresSP]     = useState([]);

  // ── Filtros ────────────────────────────────────────────────────────────
  const [page, setPage]   = useState(1);
  const [orden, setOrden] = useState('nombre_proyecto');
  const [filtro, setFiltro] = useState('');

  // ── UI ─────────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [actionError, setActionError]   = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // ── Modales ────────────────────────────────────────────────────────────
  const [showCrear, setShowCrear]                 = useState(false);
  const [showEditar, setShowEditar]               = useState(false);
  const [showConfirmInactivar, setShowConfirmInactivar] = useState(false);
  const [showCambiarSup, setShowCambiarSup]       = useState(false);
  const [showConfirmRemoverSup, setShowConfirmRemoverSup] = useState(false);

  // ── Formularios ────────────────────────────────────────────────────────
  const [crearForm, setCrearForm]       = useState(CREAR_FORM_INITIAL);
  const [editarForm, setEditarForm]     = useState({});
  const [nuevoSupId, setNuevoSupId]     = useState('');
  const [formError, setFormError]       = useState('');

  // ── Fetch proyectos ────────────────────────────────────────────────────
  const fetchProyectos = useCallback(async (keepSelected = true) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProyectos({ page, limit: 8, orden, filtro });
      setProyectos(res.data);
      setMeta(res.meta);

      if (keepSelected && selectedProyecto) {
        const updated = res.data.find(p => p.id_proyecto === selectedProyecto.id_proyecto);
        if (updated) setSelectedProyecto(updated);
        else setSelectedProyecto(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, orden, filtro, selectedProyecto?.id_proyecto]);

  useEffect(() => { fetchProyectos(true); }, [page, orden, filtro]);

  // ── Fetch supervisor cuando cambia el proyecto seleccionado ───────────
  useEffect(() => {
    if (!selectedProyecto?.id_supervisor) {
      setSupervisorInfo(null);
      return;
    }
    getTrabajadorById(selectedProyecto.id_supervisor)
      .then(setSupervisorInfo)
      .catch(() => setSupervisorInfo(null));
  }, [selectedProyecto?.id_supervisor]);

  // ── Seleccionar proyecto ───────────────────────────────────────────────
  function handleSelectProyecto(proyecto) {
    setSelectedProyecto(proyecto);
    setActionError(null);
    setShowConfirmInactivar(false);
  }

  // ─────────────────────────────────────────────────────────────────────
  // CREAR PROYECTO
  // ─────────────────────────────────────────────────────────────────────
  async function abrirModalCrear() {
    setFormError('');
    setCrearForm(CREAR_FORM_INITIAL);
    try {
      const [cs, sups] = await Promise.all([getClientes(), getSupervisoresSinProyecto()]);
      setClientes(cs);
      setSupervisoresSP(sups);
    } catch (e) {
      setClientes([]);
      setSupervisoresSP([]);
    }
    setShowCrear(true);
  }

  async function handleCrearProyecto() {
    const { id_cliente, id_supervisor, nombre_proyecto, tipo_instalacion,
            direccion, nivel_exigencia, cantidad_personal_requerido } = crearForm;

    if (!id_cliente || !id_supervisor || !nombre_proyecto.trim() ||
        !tipo_instalacion.trim() || !direccion.trim() ||
        !nivel_exigencia.trim() || !cantidad_personal_requerido) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    if (isNaN(Number(cantidad_personal_requerido)) || Number(cantidad_personal_requerido) < 1) {
      setFormError('La cantidad de personal debe ser un número mayor a 0.');
      return;
    }

    try {
      setLoadingAction(true);
      setFormError('');
      await crearProyecto({
        id_cliente:                  Number(id_cliente),
        id_supervisor:               Number(id_supervisor),
        nombre_proyecto:             nombre_proyecto.trim(),
        tipo_instalacion:            tipo_instalacion.trim(),
        direccion:                   direccion.trim(),
        nivel_exigencia:             nivel_exigencia.trim(),
        cantidad_personal_requerido: Number(cantidad_personal_requerido),
      });
      setShowCrear(false);
      setPage(1);
      await fetchProyectos(false);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // INACTIVAR / REACTIVAR
  // ─────────────────────────────────────────────────────────────────────
  async function handleInactivar() {
    try {
      setLoadingAction(true);
      setActionError(null);
      await inactivarProyecto(selectedProyecto.id_proyecto);
      setShowConfirmInactivar(false);
      await fetchProyectos(true);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleReactivar() {
    if (!selectedProyecto.id_supervisor) {
      setActionError('No se puede activar: el proyecto no tiene supervisor asignado.');
      return;
    }
    try {
      setLoadingAction(true);
      setActionError(null);
      await reactivarProyecto(selectedProyecto.id_proyecto);
      await fetchProyectos(true);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // EDITAR INFO GENERAL
  // ─────────────────────────────────────────────────────────────────────
  function abrirModalEditar() {
    setFormError('');
    setEditarForm({
      nombre_proyecto:             selectedProyecto.nombre_proyecto || '',
      tipo_instalacion:            selectedProyecto.tipo_instalacion || '',
      direccion:                   selectedProyecto.direccion || '',
      nivel_exigencia:             selectedProyecto.nivel_exigencia || '',
      cantidad_personal_requerido: selectedProyecto.cantidad_personal_requerido || '',
    });
    setShowEditar(true);
  }

  async function handleActualizarProyecto() {
    const campos = {};
    for (const field of EDITAR_FORM_FIELDS) {
      const val = editarForm[field];
      if (val !== undefined && String(val).trim() !== String(selectedProyecto[field] ?? '').trim()) {
        campos[field] = field === 'cantidad_personal_requerido' ? Number(val) : String(val).trim();
      }
    }

    if (!Object.keys(campos).length) {
      setFormError('No hay cambios para guardar.');
      return;
    }
    if (campos.cantidad_personal_requerido !== undefined &&
        (isNaN(campos.cantidad_personal_requerido) || campos.cantidad_personal_requerido < 1)) {
      setFormError('La cantidad de personal debe ser un número mayor a 0.');
      return;
    }

    try {
      setLoadingAction(true);
      setFormError('');
      await actualizarProyecto(selectedProyecto.id_proyecto, campos);
      setShowEditar(false);
      await fetchProyectos(true);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // CAMBIAR SUPERVISOR
  // ─────────────────────────────────────────────────────────────────────
  async function abrirModalCambiarSup() {
    setFormError('');
    setNuevoSupId('');
    try {
      const sups = await getSupervisoresSinProyecto();
      setSupervisoresSP(sups);
    } catch {
      setSupervisoresSP([]);
    }
    setShowCambiarSup(true);
  }

  async function handleCambiarSupervisor() {
    if (!nuevoSupId) {
      setFormError('Selecciona un supervisor.');
      return;
    }
    try {
      setLoadingAction(true);
      setFormError('');
      await cambiarSupervisor(selectedProyecto.id_proyecto, Number(nuevoSupId));
      setShowCambiarSup(false);
      await fetchProyectos(true);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // REMOVER SUPERVISOR
  // ─────────────────────────────────────────────────────────────────────
  async function handleRemoverSupervisor() {
    try {
      setLoadingAction(true);
      setActionError(null);
      await removerSupervisor(selectedProyecto.id_proyecto);
      setShowConfirmRemoverSup(false);
      await fetchProyectos(true);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  const pageNumbers = getPageNumbers(meta.page, meta.totalPages);

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />

      <div className="dashboard-main">
        <Header onLogout={onLogout} />

        <div className="dashboard-content">

          {/* ── TOPE ─────────────────────────────────────────────────── */}
          <div className="proy-tope">
            <div className="proy-tope-title">
              <h1>Proyectos</h1>
              <p>Administración de proyectos del sistema</p>
            </div>
            <button className="proy-btn-primary" onClick={abrirModalCrear}>
              + Crear Proyecto
            </button>
          </div>

          {error && <div className="proy-error-banner">⚠ {error}</div>}

          {/* ── GRID PRINCIPAL ───────────────────────────────────────── */}
          <div className="proy-grid">

            {/* ── PANEL IZQUIERDO ────────────────────────────────────── */}
            <div className="proy-left">
              {/* Toolbar */}
              <div className="proy-toolbar">
                <span className="proy-toolbar-label">Ordenar:</span>

                <button
                  className={`proy-sort-btn ${orden === 'nombre_proyecto' ? 'active' : ''}`}
                  onClick={() => { setOrden('nombre_proyecto'); setPage(1); }}
                >
                  A–Z
                </button>

                <button
                  className={`proy-sort-btn ${orden === 'fecha_creacion' ? 'active' : ''}`}
                  onClick={() => { setOrden('fecha_creacion'); setPage(1); }}
                >
                  Fecha
                </button>

                <select
                  className="proy-filter-select"
                  value={filtro}
                  onChange={e => { setFiltro(e.target.value); setPage(1); }}
                >
                  <option value="">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
              </div>

              {/* Lista */}
              {loading ? (
                <div className="proy-empty"><div className="proy-spinner" /></div>
              ) : proyectos.length === 0 ? (
                <div className="proy-empty"><p>Sin proyectos para mostrar</p></div>
              ) : (
                <ul className="proy-list">
                  {proyectos.map(p => (
                    <li
                      key={p.id_proyecto}
                      className={`proy-list-item ${selectedProyecto?.id_proyecto === p.id_proyecto ? 'selected' : ''}`}
                      onClick={() => handleSelectProyecto(p)}
                    >
                      <div className="proy-item-info">
                        <span className="proy-item-name">{p.nombre_proyecto}</span>
                        <span className="proy-item-fecha">{formatFecha(p.fecha_creacion)}</span>
                      </div>
                      <span className={`proy-badge ${p.estado === 'activo' ? 'proy-badge-activo' : 'proy-badge-inactivo'}`}>
                        {p.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Paginación */}
              {meta.totalPages > 1 && (
                <div className="proy-pagination">
                  <span className="proy-page-info">
                    {meta.total} proyectos · pág. {meta.page}/{meta.totalPages}
                  </span>
                  <div className="proy-page-controls">
                    <button
                      className="proy-page-btn"
                      onClick={() => setPage(p => p - 1)}
                      disabled={meta.page === 1}
                    >‹</button>

                    {pageNumbers.map((n, i) =>
                      n === '...'
                        ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: '#9ca3af', fontSize: 12 }}>…</span>
                        : <button
                            key={n}
                            className={`proy-page-btn ${n === meta.page ? 'current' : ''}`}
                            onClick={() => setPage(n)}
                          >{n}</button>
                    )}

                    <button
                      className="proy-page-btn"
                      onClick={() => setPage(p => p + 1)}
                      disabled={meta.page === meta.totalPages}
                    >›</button>
                  </div>
                </div>
              )}
            </div>

            {/* ── PANEL DERECHO ──────────────────────────────────────── */}
            <div className="proy-right">
              {!selectedProyecto ? (
                <div className="proy-right-empty">
                  <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M3 21h18M12 3a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                  <p>Selecciona un proyecto para ver su detalle</p>
                </div>
              ) : (
                <div className="proy-detail">

                  {/* Nombre */}
                  <h2 className="proy-detail-nombre">{selectedProyecto.nombre_proyecto}</h2>

                  {actionError && <div className="proy-action-error">⚠ {actionError}</div>}

                  {/* Estado */}
                  <div className="proy-detail-row">
                    <div className="proy-detail-row-content">
                      <span className="proy-detail-row-label">Estado</span>
                      <span className={`proy-badge ${selectedProyecto.estado === 'activo' ? 'proy-badge-activo' : 'proy-badge-inactivo'}`}>
                        {selectedProyecto.estado}
                      </span>
                    </div>

                    <div className="proy-detail-row-actions">
                      {selectedProyecto.estado === 'activo' ? (
                        !showConfirmInactivar ? (
                          <button
                            className="proy-btn-danger"
                            onClick={() => { setShowConfirmInactivar(true); setActionError(null); }}
                          >
                            Desactivar
                          </button>
                        ) : (
                          <div className="proy-confirm-panel">
                            <p>¿Desactivar <strong>{selectedProyecto.nombre_proyecto}</strong>? El supervisor y sus trabajadores seran removidos del proyecto, ademas las cuadrillas se inactivarán.</p>
                            <div className="proy-confirm-panel-actions">
                              <button className="proy-btn-danger" onClick={handleInactivar} disabled={loadingAction}>
                                {loadingAction ? 'Desactivando...' : 'Confirmar'}
                              </button>
                              <button className="proy-btn-secondary" onClick={() => setShowConfirmInactivar(false)}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <button
                          className="proy-btn-primary"
                          onClick={handleReactivar}
                          disabled={loadingAction}
                        >
                          {loadingAction ? 'Activando...' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Supervisor */}
                  <div className="proy-detail-row">
                    <div className="proy-detail-row-content">
                      <span className="proy-detail-row-label">Supervisor</span>
                      {supervisorInfo
                        ? <span className="proy-supervisor-name">{supervisorInfo.nombres} {supervisorInfo.apellidos}</span>
                        : <span className="proy-supervisor-none">Sin supervisor asignado</span>
                      }
                    </div>

                    <div className="proy-detail-row-actions">
                      {supervisorInfo && selectedProyecto.estado === 'inactivo' && (
                        !showConfirmRemoverSup ? (
                          <button
                            className="proy-btn-secondary"
                            onClick={() => { setShowConfirmRemoverSup(true); setActionError(null); }}
                          >
                            Eliminar supervisor
                          </button>
                        ) : (
                          <div className="proy-confirm-panel">
                            <p>¿Eliminar a <strong>{supervisorInfo.nombres} {supervisorInfo.apellidos}</strong> como supervisor?</p>
                            <div className="proy-confirm-panel-actions">
                              <button className="proy-btn-danger" onClick={handleRemoverSupervisor} disabled={loadingAction}>
                                {loadingAction ? 'Eliminando...' : 'Confirmar'}
                              </button>
                              <button className="proy-btn-secondary" onClick={() => setShowConfirmRemoverSup(false)}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )
                      )}
                      <button className="proy-btn-secondary" onClick={abrirModalCambiarSup}>
                        Cambiar supervisor
                      </button>
                    </div>
                  </div>

                  {/* Info general */}
                  <div className="proy-info-card">
                    <div className="proy-info-card-header">
                      <span>Información general</span>
                      <button className="proy-btn-icon" onClick={abrirModalEditar} title="Editar">
                        ✏
                      </button>
                    </div>
                    <div className="proy-info-grid">
                      <div className="proy-info-field">
                        <div className="proy-info-field-label">Tipo de instalación</div>
                        <div className="proy-info-field-value">{selectedProyecto.tipo_instalacion || '—'}</div>
                      </div>
                      <div className="proy-info-field">
                        <div className="proy-info-field-label">Nivel de exigencia</div>
                        <div className="proy-info-field-value">{selectedProyecto.nivel_exigencia || '—'}</div>
                      </div>
                      <div className="proy-info-field">
                        <div className="proy-info-field-label">Dirección</div>
                        <div className="proy-info-field-value">{selectedProyecto.direccion || '—'}</div>
                      </div>
                      <div className="proy-info-field">
                        <div className="proy-info-field-label">Personal requerido</div>
                        <div className="proy-info-field-value">{selectedProyecto.cantidad_personal_requerido ?? '—'}</div>
                      </div>
                      <div className="proy-info-field">
                        <div className="proy-info-field-label">Cliente</div>
                        <div className="proy-info-field-value">
                          {selectedProyecto.cliente
                            ? `${selectedProyecto.cliente.nombres} ${selectedProyecto.cliente.apellidos}`
                            : '—'}
                        </div>
                      </div>
                      <div className="proy-info-field">
                        <div className="proy-info-field-label">Fecha de creación</div>
                        <div className="proy-info-field-value">{formatFecha(selectedProyecto.fecha_creacion)}</div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL CREAR PROYECTO ──────────────────────────────────────── */}
      {showCrear && (
        <div className="proy-modal-overlay" onClick={() => setShowCrear(false)}>
          <div className="proy-modal" onClick={e => e.stopPropagation()}>
            <div className="proy-modal-header">
              <h2>Crear Proyecto</h2>
              <button className="proy-modal-close" onClick={() => setShowCrear(false)}>✕</button>
            </div>

            <div className="proy-modal-body">
              {formError && <div className="proy-form-error">⚠ {formError}</div>}

              <div className="proy-form-grid">
                <div className="proy-field proy-field-full">
                  <label>Nombre del Proyecto</label>
                  <input
                    placeholder="Ej: Obra Sur Centro"
                    value={crearForm.nombre_proyecto}
                    onChange={e => setCrearForm(f => ({ ...f, nombre_proyecto: e.target.value }))}
                  />
                </div>

                <div className="proy-field proy-field-full">
                  <label>Cliente</label>
                  <select
                    value={crearForm.id_cliente}
                    onChange={e => setCrearForm(f => ({ ...f, id_cliente: e.target.value }))}
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.nombres} {c.apellidos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="proy-field proy-field-full">
                  <label>Supervisor</label>
                  <select
                    value={crearForm.id_supervisor}
                    onChange={e => setCrearForm(f => ({ ...f, id_supervisor: e.target.value }))}
                  >
                    <option value="">Seleccionar supervisor...</option>
                    {supervisoresSP.map(s => (
                      <option key={s.id_trabajador} value={s.id_trabajador}>
                        {s.nombres} {s.apellidos} — {s.rut}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="proy-field">
                  <label>Tipo de Instalación</label>
                  <input
                    placeholder="Ej: Residencial"
                    value={crearForm.tipo_instalacion}
                    onChange={e => setCrearForm(f => ({ ...f, tipo_instalacion: e.target.value }))}
                  />
                </div>

                <div className="proy-field">
                  <label>Nivel de Exigencia</label>
                  <input
                    placeholder="Ej: Alto"
                    value={crearForm.nivel_exigencia}
                    onChange={e => setCrearForm(f => ({ ...f, nivel_exigencia: e.target.value }))}
                  />
                </div>

                <div className="proy-field proy-field-full">
                  <label>Dirección</label>
                  <input
                    placeholder="Ej: Av. Principal 123"
                    value={crearForm.direccion}
                    onChange={e => setCrearForm(f => ({ ...f, direccion: e.target.value }))}
                  />
                </div>

                <div className="proy-field">
                  <label>Personal Requerido</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 10"
                    value={crearForm.cantidad_personal_requerido}
                    onChange={e => setCrearForm(f => ({ ...f, cantidad_personal_requerido: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="proy-modal-footer">
              <button className="proy-btn-secondary" onClick={() => setShowCrear(false)}>Cancelar</button>
              <button className="proy-btn-primary" onClick={handleCrearProyecto} disabled={loadingAction}>
                {loadingAction ? 'Creando...' : 'Crear Proyecto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR INFO GENERAL ─────────────────────────────────── */}
      {showEditar && (
        <div className="proy-modal-overlay" onClick={() => setShowEditar(false)}>
          <div className="proy-modal" onClick={e => e.stopPropagation()}>
            <div className="proy-modal-header">
              <h2>Editar Proyecto</h2>
              <button className="proy-modal-close" onClick={() => setShowEditar(false)}>✕</button>
            </div>

            <div className="proy-modal-body">
              {formError && <div className="proy-form-error">⚠ {formError}</div>}

              <div className="proy-form-grid">
                <div className="proy-field proy-field-full">
                  <label>Nombre del Proyecto</label>
                  <input
                    value={editarForm.nombre_proyecto}
                    onChange={e => setEditarForm(f => ({ ...f, nombre_proyecto: e.target.value }))}
                  />
                </div>

                <div className="proy-field">
                  <label>Tipo de Instalación</label>
                  <input
                    value={editarForm.tipo_instalacion}
                    onChange={e => setEditarForm(f => ({ ...f, tipo_instalacion: e.target.value }))}
                  />
                </div>

                <div className="proy-field">
                  <label>Nivel de Exigencia</label>
                  <input
                    value={editarForm.nivel_exigencia}
                    onChange={e => setEditarForm(f => ({ ...f, nivel_exigencia: e.target.value }))}
                  />
                </div>

                <div className="proy-field proy-field-full">
                  <label>Dirección</label>
                  <input
                    value={editarForm.direccion}
                    onChange={e => setEditarForm(f => ({ ...f, direccion: e.target.value }))}
                  />
                </div>

                <div className="proy-field">
                  <label>Personal Requerido</label>
                  <input
                    type="number"
                    min="1"
                    value={editarForm.cantidad_personal_requerido}
                    onChange={e => setEditarForm(f => ({ ...f, cantidad_personal_requerido: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="proy-modal-footer">
              <button className="proy-btn-secondary" onClick={() => setShowEditar(false)}>Cancelar</button>
              <button className="proy-btn-primary" onClick={handleActualizarProyecto} disabled={loadingAction}>
                {loadingAction ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CAMBIAR SUPERVISOR ──────────────────────────────────── */}
      {showCambiarSup && (
        <div className="proy-modal-overlay" onClick={() => setShowCambiarSup(false)}>
          <div className="proy-modal proy-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="proy-modal-header">
              <h2>Cambiar Supervisor</h2>
              <button className="proy-modal-close" onClick={() => setShowCambiarSup(false)}>✕</button>
            </div>

            <div className="proy-modal-body">
              {formError && <div className="proy-form-error">⚠ {formError}</div>}

              <div className="proy-field">
                <label>Nuevo Supervisor</label>
                <select value={nuevoSupId} onChange={e => setNuevoSupId(e.target.value)}>
                  <option value="">Seleccionar supervisor...</option>
                  {supervisoresSP.map(s => (
                    <option key={s.id_trabajador} value={s.id_trabajador}>
                      {s.nombres} {s.apellidos} — {s.rut}
                    </option>
                  ))}
                </select>
              </div>

              {supervisoresSP.length === 0 && (
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                  No hay supervisores disponibles sin proyecto asignado.
                </p>
              )}
            </div>

            <div className="proy-modal-footer">
              <button className="proy-btn-secondary" onClick={() => setShowCambiarSup(false)}>Cancelar</button>
              <button className="proy-btn-primary" onClick={handleCambiarSupervisor} disabled={loadingAction || !nuevoSupId}>
                {loadingAction ? 'Guardando...' : 'Asignar supervisor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}