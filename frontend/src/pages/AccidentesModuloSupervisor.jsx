import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  getMiProyectoBySupervisor,
  getMisCuadrillas,
  getAccidentesDelProyecto,
  editarAccidenteLaboralSupervisor,
} from '../services/accidenteModuloSupervisorService';
import '../styles/accidenteModuloSupervisor.css';

// ─── Constantes ──────────────────────────────────────────────────────────────

const LIMIT = 8;
const GRAVEDAD_OPTS = ['leve', 'moderado', 'grave', 'fatal'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(`${fecha}T00:00:00`);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(nombres, apellidos) {
  return ((nombres?.charAt(0) ?? '') + (apellidos?.charAt(0) ?? '')).toUpperCase();
}

/**
 * Mapea gravedad → clase CSS de badge.
 * leve → badge-activo (verde) · moderado → badge-licencia (amarillo)
 * grave → badge-grave (naranja) · fatal → badge-fatal (oscuro)
 */
function getGravedadClass(gravedad) {
  switch (gravedad?.toLowerCase().trim()) {
    case 'leve':     return 'badge-activo';
    case 'moderado':
    case 'moderada': return 'badge-licencia';
    case 'grave':    return 'badge-grave';
    case 'fatal':    return 'badge-fatal';
    default:         return 'badge-inactivo';
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

function AccidentesModuloSupervisor({ usuario, onLogout }) {

  // ==========================
  // Estados
  // ==========================

  const [proyecto,     setProyecto]     = useState(null);
  const [cuadrillas,   setCuadrillas]   = useState([]);
  const [accidentes,   setAccidentes]   = useState([]);
  const [selected,     setSelected]     = useState(null);

  const [loading,      setLoading]      = useState(false);   // carga inicial (proyecto + cuadrillas)
  const [loadingList,  setLoadingList]  = useState(false);   // recarga de lista (filtros / página)
  const [error,        setError]        = useState(null);

  const [page,         setPage]         = useState(1);
  const [paginacion,   setPaginacion]   = useState({ total: 0, totalPages: 1 });

  // Filtros
  const [cuadrillaId,  setCuadrillaId]  = useState('');
  const [rutInput,     setRutInput]     = useState('');
  const [rutFiltro,    setRutFiltro]    = useState('');

  // Modal edición
  const [showEdit,  setShowEdit]  = useState(false);
  const [editForm,  setEditForm]  = useState({ descripcion: '', gravedad: '', traslado: '', observaciones: '' });
  const [editError, setEditError] = useState(null);
  const [saving,    setSaving]    = useState(false);

  // ==========================
  // Carga inicial
  // ==========================

  // Proyecto + cuadrillas: solo una vez al montar
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const [proy, cuads] = await Promise.all([
          getMiProyectoBySupervisor(),
          getMisCuadrillas(),
        ]);
        setProyecto(proy);
        setCuadrillas(Array.isArray(cuads) ? cuads : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Lista de accidentes: dispara en mount y en cada cambio de filtro / página
  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      setError(null);
      try {
        const res = await getAccidentesDelProyecto(page, LIMIT, cuadrillaId, rutFiltro);
        const lista = Array.isArray(res?.data) ? res.data : [];
        setAccidentes(lista);
        setPaginacion(res?.status ?? { total: 0, totalPages: 1 });
        // Auto-seleccionar primero en cada carga
        setSelected(lista.length > 0 ? lista[0] : null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, [page, cuadrillaId, rutFiltro]);

  // ==========================
  // Handlers — filtros
  // ==========================

  // "Todos": limpia cuadrilla, rut y página
  const handleTodos = () => {
    setCuadrillaId('');
    setRutInput('');
    setRutFiltro('');
    setPage(1);
  };

  // Dropdown cuadrilla
  const handleCuadrillaChange = (e) => {
    setCuadrillaId(e.target.value);
    setPage(1);
  };

  // Buscar por RUT — si el input está vacío limpia el filtro
  const handleBuscarRut = () => {
    setRutFiltro(rutInput.trim());
    setPage(1);
  };

  const handleRutKeyDown = (e) => {
    if (e.key === 'Enter') handleBuscarRut();
  };

  // ==========================
  // Handlers — modal edición
  // ==========================

  const handleOpenEdit = () => {
    setEditForm({
      descripcion:   selected.descripcion,
      gravedad:      selected.gravedad,
      traslado:      selected.traslado,
      observaciones: selected.observaciones ?? '',
    });
    setEditError(null);
    setShowEdit(true);
  };

  const handleCloseEdit = () => {
    if (saving) return;
    setShowEdit(false);
    setEditError(null);
  };

  const handleEditChange = (e) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveEdit = async () => {
    // ── Validaciones frontend (espejo de validarEditarAccidenteLaboral) ──

    if (!editForm.descripcion.trim()) {
      setEditError('La descripción no puede estar vacía.');
      return;
    }
    if (!editForm.gravedad.trim()) {
      setEditError('La gravedad no puede estar vacía.');
      return;
    }
    if (!editForm.traslado.trim()) {
      setEditError('El traslado no puede estar vacío.');
      return;
    }
    // Observaciones: si se proporciona (no vacío) → ok. Si vacío → no se envía.
    if (editForm.observaciones !== '' && !editForm.observaciones.trim()) {
      setEditError('Las observaciones no pueden estar vacías si se proporcionan.');
      return;
    }

    // ── Construir payload con solo los campos que cambiaron ──
    const payload = {};

    if (editForm.descripcion.trim() !== selected.descripcion)
      payload.descripcion = editForm.descripcion.trim();

    if (editForm.gravedad !== selected.gravedad)
      payload.gravedad = editForm.gravedad;

    if (editForm.traslado.trim() !== selected.traslado)
      payload.traslado = editForm.traslado.trim();

    // observaciones: solo se envía si no está vacío y cambió respecto al valor actual
    const obsActual = selected.observaciones ?? '';
    if (editForm.observaciones.trim() !== obsActual && editForm.observaciones.trim() !== '')
      payload.observaciones = editForm.observaciones.trim();

    if (Object.keys(payload).length === 0) {
      setEditError('No hay cambios para guardar.');
      return;
    }

    // ── Llamada al backend ──
    setSaving(true);
    setEditError(null);
    try {
      await editarAccidenteLaboralSupervisor(selected.id_accidente, payload);

      // Actualizar en memoria sin re-fetch (el PATCH no devuelve proyecto/trabajador)
      const updatedSelected = { ...selected, ...payload };
      setSelected(updatedSelected);
      setAccidentes(prev =>
        prev.map(a => a.id_accidente === selected.id_accidente ? updatedSelected : a)
      );
      setShowEdit(false);
    } catch (e) {
      setEditError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================
  // Derivados
  // ==========================

  const noFilters = cuadrillaId === '' && rutFiltro === '';

  // ==========================
  // Render
  // ==========================

  return (
    <div className="dashboard-wrapper">

      <Sidebar usuario={usuario} />

      <div className="dashboard-main">

        <Header onLogout={onLogout} />

        <div className="dashboard-content">

          {/* ── Bloque tope ──────────────────────────────────────────────── */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">
                Accidentes Laborales
                {proyecto && (
                  <span style={{ fontWeight: 400, color: '#6b7280' }}>
                    {' '}— {proyecto.nombre_proyecto}
                  </span>
                )}
              </h1>
              <p className="vista-general-subtitle">
                Gestión de accidentes laborales del proyecto
              </p>
            </div>
          </div>

          {/* ── Error ────────────────────────────────────────────────────── */}
          {error && (
            <div className="tw-error-banner">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* ── Layout dos columnas ──────────────────────────────────────── */}
          {loading ? (
            <div className="tw-loading">
              <div className="tw-spinner" />
              Cargando accidentes laborales...
            </div>
          ) : (
            <div className="as-layout">

              {/* ════════ PANEL IZQUIERDO — lista ════════ */}
              <div className="as-panel">

                <div className="as-panel-header">
                  <span className="as-panel-title">Accidentes del proyecto</span>
                  <span className="as-panel-badge">{paginacion.total} total</span>
                </div>

                {/* Toolbar de filtros */}
                <div className="as-toolbar">

                  <button
                    className={`as-btn-todos${noFilters ? ' as-btn-todos-active' : ''}`}
                    onClick={handleTodos}
                  >
                    Todos
                  </button>

                  <select
                    className="as-select-cuadrilla"
                    value={cuadrillaId}
                    onChange={handleCuadrillaChange}
                  >
                    <option value="">Todas las cuadrillas</option>
                    {cuadrillas.map(c => (
                      <option key={c.id_cuadrilla} value={c.id_cuadrilla}>
                        {c.nombre_cuadrilla}
                      </option>
                    ))}
                  </select>

                  <div className="as-rut-row">
                    <input
                      className="as-rut-input"
                      type="text"
                      placeholder="Buscar por RUT..."
                      value={rutInput}
                      onChange={e => setRutInput(e.target.value)}
                      onKeyDown={handleRutKeyDown}
                    />
                    <button className="as-btn-buscar" onClick={handleBuscarRut}>
                      Buscar
                    </button>
                  </div>

                </div>

                {/* Lista */}
                {loadingList ? (
                  <div className="tw-loading" style={{ padding: '40px 20px' }}>
                    <div className="tw-spinner" />
                  </div>
                ) : accidentes.length === 0 ? (
                  <div className="as-list-empty">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Sin accidentes para los filtros aplicados
                  </div>
                ) : (
                  <div className="as-list">
                    {accidentes.map(acc => (
                      <div
                        key={acc.id_accidente}
                        className={`as-list-item${selected?.id_accidente === acc.id_accidente ? ' as-selected' : ''}`}
                        onClick={() => setSelected(acc)}
                      >
                        <div className="as-avatar">
                          {getInitials(acc.trabajador.nombres, acc.trabajador.apellidos)}
                        </div>
                        <div className="as-item-info">
                          <div className="as-item-name">
                            {acc.trabajador.nombres} {acc.trabajador.apellidos}
                          </div>
                          <div className="as-item-rut">{acc.trabajador.rut}</div>
                        </div>
                        <div className="as-item-fecha">
                          {formatFecha(acc.fecha_accidente)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Paginación */}
                {paginacion.totalPages > 1 && (
                  <div className="as-pagination">
                    <span className="as-page-info">
                      Página {page} de {paginacion.totalPages}
                    </span>
                    <div className="as-page-btns">
                      <button
                        className="as-page-btn"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 1}
                        title="Página anterior"
                      >‹</button>
                      <button
                        className="as-page-btn"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === paginacion.totalPages}
                        title="Página siguiente"
                      >›</button>
                    </div>
                  </div>
                )}

              </div>

              {/* ════════ PANEL DERECHO — detalle ════════ */}
              <div className="as-panel">

                {selected ? (
                  <>
                    {/* Cabecera con botón editar */}
                    <div className="as-detail-header">
                      <div className="as-detail-header-left">
                        <span className="as-detail-title">Detalles del Accidente</span>
                        <span className="as-detail-id">#{selected.id_accidente}</span>
                      </div>
                      <button className="as-btn-edit" onClick={handleOpenEdit}>
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.536-6.536a2 2 0 112.828 2.828L11.828 13.828a4 4 0 01-1.414.93l-3 1 1-3a4 4 0 01.93-1.414z" />
                        </svg>
                        Editar
                      </button>
                    </div>

                    <div className="as-detail-body">

                      {/* ── Proyecto ── */}
                      <div>
                        <div className="as-section-title">Proyecto</div>
                        <div className="as-fields-grid">

                          <div className="as-field">
                            <span className="as-field-label">Nombre del proyecto</span>
                            <span className="as-field-value">{selected.proyecto.nombre_proyecto}</span>
                          </div>

                          <div className="as-field">
                            <span className="as-field-label">Supervisor</span>
                            <span className="as-field-value">
                              {selected.proyecto.supervisor?.nombres
                                ? `${selected.proyecto.supervisor.nombres} ${selected.proyecto.supervisor.apellidos}`
                                : <span className="as-field-value-muted">Sin supervisor asignado</span>
                              }
                            </span>
                          </div>

                          <div className="as-field">
                            <span className="as-field-label">Cuadrilla</span>
                            <span className="as-field-value">{selected.nombre_cuadrilla}</span>
                          </div>

                          <div className="as-field">
                            <span className="as-field-label">Fecha del accidente</span>
                            <span className="as-field-value">{formatFecha(selected.fecha_accidente)}</span>
                          </div>

                        </div>
                      </div>

                      {/* ── Trabajador accidentado ── */}
                      <div>
                        <div className="as-section-title">Trabajador accidentado</div>
                        <div className="as-fields-grid">

                          <div className="as-field">
                            <span className="as-field-label">Nombre completo</span>
                            <span className="as-field-value">
                              {selected.trabajador.nombres} {selected.trabajador.apellidos}
                            </span>
                          </div>

                          <div className="as-field">
                            <span className="as-field-label">RUT</span>
                            <span className="as-field-value as-field-value-mono">
                              {selected.trabajador.rut}
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* ── Datos del accidente ── */}
                      <div>
                        <div className="as-section-title">Datos del accidente</div>
                        <div className="as-fields-grid">

                          <div className="as-field as-field-full">
                            <span className="as-field-label">Descripción</span>
                            <span className="as-field-value">{selected.descripcion}</span>
                          </div>

                          <div className="as-field">
                            <span className="as-field-label">Gravedad</span>
                            <span className={`tw-badge ${getGravedadClass(selected.gravedad)}`}>
                              {selected.gravedad}
                            </span>
                          </div>

                          <div className="as-field">
                            <span className="as-field-label">Traslado</span>
                            <span className="as-field-value">{selected.traslado}</span>
                          </div>

                          <div className="as-field as-field-full">
                            <span className="as-field-label">Observaciones</span>
                            {selected.observaciones
                              ? <span className="as-field-value">{selected.observaciones}</span>
                              : <span className="as-field-value-muted">Sin observaciones registradas</span>
                            }
                          </div>

                        </div>
                      </div>

                    </div>
                  </>
                ) : (
                  <div className="as-detail-empty">
                    <div className="as-detail-empty-icon">
                      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p>Selecciona un accidente de la lista<br />para ver sus detalles</p>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MODAL — Editar accidente laboral
          Campos editables (según backend):
            descripcion · gravedad · traslado · observaciones
      ════════════════════════════════════════════════ */}
      {showEdit && selected && (
        <div className="tw-modal-overlay" onClick={handleCloseEdit}>
          <div className="tw-modal" onClick={e => e.stopPropagation()}>

            <div className="tw-modal-header">
              <h2>Editar Accidente #{selected.id_accidente}</h2>
              <button className="tw-modal-close" onClick={handleCloseEdit} disabled={saving}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="tw-form">

              {editError && (
                <div className="tw-form-error">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {editError}
                </div>
              )}

              {/* Descripción */}
              <div className="tw-field">
                <label htmlFor="edit-descripcion">Descripción</label>
                <textarea
                  id="edit-descripcion"
                  name="descripcion"
                  className="as-textarea"
                  value={editForm.descripcion}
                  onChange={handleEditChange}
                  placeholder="Descripción del accidente"
                />
              </div>

              {/* Gravedad + Traslado en grid de 2 */}
              <div className="tw-form-grid-2">

                <div className="tw-field">
                  <label htmlFor="edit-gravedad">Gravedad</label>
                  <select
                    id="edit-gravedad"
                    name="gravedad"
                    value={editForm.gravedad}
                    onChange={handleEditChange}
                  >
                    {/* Si el valor actual no está en la lista, mostrarlo igual */}
                    {!GRAVEDAD_OPTS.includes(editForm.gravedad?.toLowerCase()) && (
                      <option value={editForm.gravedad}>{editForm.gravedad}</option>
                    )}
                    {GRAVEDAD_OPTS.map(g => (
                      <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="tw-field">
                  <label htmlFor="edit-traslado">Traslado</label>
                  <input
                    id="edit-traslado"
                    name="traslado"
                    type="text"
                    value={editForm.traslado}
                    onChange={handleEditChange}
                    placeholder="Tipo de traslado"
                  />
                </div>

              </div>

              {/* Observaciones */}
              <div className="tw-field">
                <label htmlFor="edit-observaciones">
                  Observaciones
                  <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>(opcional)</span>
                </label>
                <textarea
                  id="edit-observaciones"
                  name="observaciones"
                  className="as-textarea"
                  value={editForm.observaciones}
                  onChange={handleEditChange}
                  placeholder="Sin observaciones"
                />
              </div>

            </div>

            <div className="tw-modal-footer">
              <button className="tw-btn-cancel" onClick={handleCloseEdit} disabled={saving}>
                Cancelar
              </button>
              <button className="tw-btn-save" onClick={handleSaveEdit} disabled={saving}>
                {saving ? (
                  <>
                    <div className="tw-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AccidentesModuloSupervisor;