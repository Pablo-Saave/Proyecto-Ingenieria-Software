import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  getProyectosParaFiltro,
  getAllAccidentesAdmin,
} from '../services/accidenteModuloAdministradorService';
import '../styles/accidentesModuloAdministrador.css';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LIMIT = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(`${fecha}T00:00:00`);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(nombres, apellidos) {
  return ((nombres?.charAt(0) ?? '') + (apellidos?.charAt(0) ?? '')).toUpperCase();
}

/**
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

function AccidentesModuloAdministrador({ usuario, onLogout }) {

  // ==========================
  // Estados
  // ==========================

  const [proyectos,    setProyectos]    = useState([]);
  const [accidentes,   setAccidentes]   = useState([]);
  const [selected,     setSelected]     = useState(null);

  const [loading,      setLoading]      = useState(false);  // carga inicial de proyectos
  const [loadingList,  setLoadingList]  = useState(false);  // recarga de lista
  const [error,        setError]        = useState(null);

  const [page,         setPage]         = useState(1);
  const [paginacion,   setPaginacion]   = useState({ total: 0, totalPages: 1 });

  // Filtros
  const [proyectoId,   setProyectoId]   = useState('');    // '' = todos
  const [rutInput,     setRutInput]     = useState('');
  const [rutFiltro,    setRutFiltro]    = useState('');

  // ==========================
  // Carga inicial — proyectos
  // ==========================

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const lista = await getProyectosParaFiltro();
        setProyectos(lista);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ==========================
  // Carga de accidentes
  // Dispara en mount y en cada cambio de filtro / página
  // ==========================

  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      setError(null);
      try {
        const res = await getAllAccidentesAdmin(page, LIMIT, proyectoId, rutFiltro);
        const lista = Array.isArray(res?.data) ? res.data : [];
        setAccidentes(lista);
        setPaginacion(res?.status ?? { total: 0, totalPages: 1 });
        setSelected(lista.length > 0 ? lista[0] : null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, [page, proyectoId, rutFiltro]);

  // ==========================
  // Handlers — filtros
  // ==========================

  // "Todos": limpia todos los filtros y vuelve a página 1
  const handleTodos = () => {
    setProyectoId('');
    setRutInput('');
    setRutFiltro('');
    setPage(1);
  };

  // Dropdown de proyectos
  const handleProyectoChange = (e) => {
    setProyectoId(e.target.value);
    setPage(1);
  };

  // Buscar por RUT — input vacío = limpiar filtro rut
  const handleBuscarRut = () => {
    setRutFiltro(rutInput.trim());
    setPage(1);
  };

  const handleRutKeyDown = (e) => {
    if (e.key === 'Enter') handleBuscarRut();
  };

  // ==========================
  // Derivados
  // ==========================

  const noFilters = proyectoId === '' && rutFiltro === '';

  // Nombre del proyecto seleccionado para el título del tope
  const proyectoSeleccionado = proyectos.find(
    p => String(p.id_proyecto) === String(proyectoId)
  );
  const tituloTope = proyectoSeleccionado
    ? proyectoSeleccionado.nombre_proyecto
    : '';

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
                <span className="aa-tope-proyecto">
                  {' '} {tituloTope}
                </span>
              </h1>
              <p className="vista-general-subtitle">
                Administración de accidentes laborales del sistema
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
            <div className="aa-layout">

              {/* ════════ PANEL IZQUIERDO — lista ════════ */}
              <div className="aa-panel">

                <div className="aa-panel-header">
                  <span className="aa-panel-title">Accidentes del sistema</span>
                  <span className="aa-panel-badge">{paginacion.total} total</span>
                </div>

                {/* Toolbar de filtros */}
                <div className="aa-toolbar">

                  <button
                    className={`aa-btn-todos${noFilters ? ' aa-btn-todos-active' : ''}`}
                    onClick={handleTodos}
                  >
                    Todos
                  </button>

                  <select
                    className="aa-select-proyecto"
                    value={proyectoId}
                    onChange={handleProyectoChange}
                  >
                    <option value="">Todos los proyectos</option>
                    {proyectos.map(p => (
                      <option key={p.id_proyecto} value={p.id_proyecto}>
                        {p.nombre_proyecto}
                      </option>
                    ))}
                  </select>

                  <div className="aa-rut-row">
                    <input
                      className="aa-rut-input"
                      type="text"
                      placeholder="Buscar por RUT..."
                      value={rutInput}
                      onChange={e => setRutInput(e.target.value)}
                      onKeyDown={handleRutKeyDown}
                    />
                    <button className="aa-btn-buscar" onClick={handleBuscarRut}>
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
                  <div className="aa-list-empty">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Sin accidentes para los filtros aplicados
                  </div>
                ) : (
                  <div className="aa-list">
                    {accidentes.map(acc => (
                      <div
                        key={acc.id_accidente}
                        className={`aa-list-item${selected?.id_accidente === acc.id_accidente ? ' aa-selected' : ''}`}
                        onClick={() => setSelected(acc)}
                      >
                        <div className="aa-avatar">
                          {getInitials(acc.trabajador.nombres, acc.trabajador.apellidos)}
                        </div>
                        <div className="aa-item-info">
                          <div className="aa-item-name">
                            {acc.trabajador.nombres} {acc.trabajador.apellidos}
                          </div>
                          <div className="aa-item-rut">{acc.trabajador.rut}</div>
                        </div>
                        <div className="aa-item-fecha">
                          {formatFecha(acc.fecha_accidente)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Paginación */}
                {paginacion.totalPages > 1 && (
                  <div className="aa-pagination">
                    <span className="aa-page-info">
                      Página {page} de {paginacion.totalPages}
                    </span>
                    <div className="aa-page-btns">
                      <button
                        className="aa-page-btn"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 1}
                        title="Página anterior"
                      >‹</button>
                      <button
                        className="aa-page-btn"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === paginacion.totalPages}
                        title="Página siguiente"
                      >›</button>
                    </div>
                  </div>
                )}

              </div>

              {/* ════════ PANEL DERECHO — detalle (solo lectura) ════════ */}
              <div className="aa-panel">

                {selected ? (
                  <>
                    <div className="aa-detail-header">
                      <span className="aa-detail-title">Detalles del Accidente</span>
                      <span className="aa-detail-id">#{selected.id_accidente}</span>
                    </div>

                    <div className="aa-detail-body">

                      {/* ── Proyecto ── */}
                      <div>
                        <div className="aa-section-title">Proyecto</div>
                        <div className="aa-fields-grid">

                          <div className="aa-field">
                            <span className="aa-field-label">Nombre del proyecto</span>
                            <span className="aa-field-value">{selected.proyecto.nombre_proyecto}</span>
                          </div>

                          <div className="aa-field">
                            <span className="aa-field-label">Supervisor</span>
                            <span className="aa-field-value">
                              {selected.proyecto.supervisor?.nombres
                                ? `${selected.proyecto.supervisor.nombres} ${selected.proyecto.supervisor.apellidos}`
                                : <span className="aa-field-value-muted">Sin supervisor asignado</span>
                              }
                            </span>
                          </div>

                          <div className="aa-field">
                            <span className="aa-field-label">Cuadrilla</span>
                            <span className="aa-field-value">{selected.nombre_cuadrilla}</span>
                          </div>

                          <div className="aa-field">
                            <span className="aa-field-label">Fecha del accidente</span>
                            <span className="aa-field-value">{formatFecha(selected.fecha_accidente)}</span>
                          </div>

                        </div>
                      </div>

                      {/* ── Trabajador accidentado ── */}
                      <div>
                        <div className="aa-section-title">Trabajador accidentado</div>
                        <div className="aa-fields-grid">

                          <div className="aa-field">
                            <span className="aa-field-label">Nombre completo</span>
                            <span className="aa-field-value">
                              {selected.trabajador.nombres} {selected.trabajador.apellidos}
                            </span>
                          </div>

                          <div className="aa-field">
                            <span className="aa-field-label">RUT</span>
                            <span className="aa-field-value aa-field-value-mono">
                              {selected.trabajador.rut}
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* ── Datos del accidente ── */}
                      <div>
                        <div className="aa-section-title">Datos del accidente</div>
                        <div className="aa-fields-grid">

                          <div className="aa-field aa-field-full">
                            <span className="aa-field-label">Descripción</span>
                            <span className="aa-field-value">{selected.descripcion}</span>
                          </div>

                          <div className="aa-field">
                            <span className="aa-field-label">Gravedad</span>
                            <span className={`tw-badge ${getGravedadClass(selected.gravedad)}`}>
                              {selected.gravedad}
                            </span>
                          </div>

                          <div className="aa-field">
                            <span className="aa-field-label">Traslado</span>
                            <span className="aa-field-value">{selected.traslado}</span>
                          </div>

                          <div className="aa-field aa-field-full">
                            <span className="aa-field-label">Observaciones</span>
                            {selected.observaciones
                              ? <span className="aa-field-value">{selected.observaciones}</span>
                              : <span className="aa-field-value-muted">Sin observaciones registradas</span>
                            }
                          </div>

                        </div>
                      </div>

                    </div>
                  </>
                ) : (
                  <div className="aa-detail-empty">
                    <div className="aa-detail-empty-icon">
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
    </div>
  );
}

export default AccidentesModuloAdministrador;
