import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { getMisAccidentesLaborales } from '../services/accidenteLaboralService';
import '../styles/accidentesModuloTrabajador.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Formatea una fecha ISO (yyyy-mm-dd) a dd/mm/yyyy.
 * Se fuerza T00:00:00 para evitar desfase por zona horaria.
 */
function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(`${fecha}T00:00:00`);
  return d.toLocaleDateString('es-CL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
}

/** Devuelve las dos iniciales (nombre + apellido) para el avatar. */
function getInitials(nombres, apellidos) {
  const n = nombres?.charAt(0)  ?? '';
  const a = apellidos?.charAt(0) ?? '';
  return (n + a).toUpperCase();
}

/**
 * Mapea el campo gravedad a la clase CSS del badge.
 * Extiende el sistema badge-* de trabajadores.css:
 *   leve      → badge-activo   (verde)
 *   moderado  → badge-licencia (amarillo)
 *   grave     → badge-grave    (naranja)
 *   fatal     → badge-fatal    (oscuro)
 *   otros     → badge-inactivo (rojo)
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

// ─── Componente ──────────────────────────────────────────────────────────────

const LIMIT = 8;

function AccidentesModuloTrabajador({ usuario, onLogout }) {

  // ==========================
  // Estados
  // ==========================

  const [accidentes,  setAccidentes]  = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [page,        setPage]        = useState(1);
  const [paginacion,  setPaginacion]  = useState({ total: 0, totalPages: 1 });

  // ==========================
  // Carga de datos
  // ==========================

  const fetchData = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMisAccidentesLaborales(p, LIMIT);
      setAccidentes(Array.isArray(res?.data) ? res.data : []);
      setPaginacion(res?.status ?? { total: 0, totalPages: 1 });
      // Auto-seleccionar el primer registro al cargar la primera página
      if (p === 1 && res.data?.length > 0) {
        setSelected(res.data[0]);
      } else {
        setSelected(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  // ==========================
  // Handlers
  // ==========================

  const handlePageChange = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > paginacion.totalPages) return;
    setPage(nuevaPagina);
  };

  // ==========================
  // Render
  // ==========================

  return (
    <div className="dashboard-wrapper">

      <Sidebar usuario={usuario} />

      <div className="dashboard-main">

        <Header onLogout={onLogout} />

        <div className="dashboard-content">

          {/* ── Bloque tope ─────────────────────────────────────────────── */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">
                Mis Accidentes Laborales
              </h1>
              <p className="vista-general-subtitle">
                Consulta de accidentes laborales registrados
              </p>
            </div>
          </div>

          {/* ── Error global ─────────────────────────────────────────────── */}
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
            <div className="al-layout">

              {/* ════════ PANEL IZQUIERDO — lista ════════ */}
              <div className="al-panel">

                <div className="al-panel-header">
                  <span className="al-panel-title">Accidentes registrados</span>
                  <span className="al-panel-badge">{paginacion.total} total</span>
                </div>

                {accidentes.length === 0 ? (
                  <div className="al-list-empty">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Sin accidentes registrados
                  </div>
                ) : (
                  <div className="al-list">
                    {accidentes.map((acc) => (
                      <div
                        key={acc.id_accidente}
                        className={`al-list-item${selected?.id_accidente === acc.id_accidente ? ' al-selected' : ''}`}
                        onClick={() => setSelected(acc)}
                      >
                        <div className="al-avatar">
                          {getInitials(acc.trabajador.nombres, acc.trabajador.apellidos)}
                        </div>

                        <div className="al-item-info">
                          <div className="al-item-name">
                            {acc.trabajador.nombres} {acc.trabajador.apellidos}
                          </div>
                          <div className="al-item-rut">{acc.trabajador.rut}</div>
                        </div>

                        <div className="al-item-fecha">
                          {formatFecha(acc.fecha_accidente)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Paginación — solo si hay más de una página */}
                {paginacion.totalPages > 1 && (
                  <div className="al-pagination">
                    <span className="al-page-info">
                      Página {page} de {paginacion.totalPages}
                    </span>
                    <div className="al-page-btns">
                      <button
                        className="al-page-btn"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        title="Página anterior"
                      >
                        ‹
                      </button>
                      <button
                        className="al-page-btn"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === paginacion.totalPages}
                        title="Página siguiente"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ════════ PANEL DERECHO — detalle ════════ */}
              <div className="al-panel">
                {selected ? (
                  <>
                    {/* Cabecera detalle */}
                    <div className="al-detail-header">
                      <span className="al-detail-title">Detalles del Accidente</span>
                      <span className="al-detail-id">#{selected.id_accidente}</span>
                    </div>

                    <div className="al-detail-body">

                      {/* ── Sección: Proyecto ── */}
                      <div>
                        <div className="al-section-title">Proyecto</div>
                        <div className="al-fields-grid">

                          <div className="al-field">
                            <span className="al-field-label">Nombre del proyecto</span>
                            <span className="al-field-value">
                              {selected.proyecto.nombre_proyecto}
                            </span>
                          </div>

                          <div className="al-field">
                            <span className="al-field-label">Supervisor</span>
                            <span className="al-field-value">
                              {selected.proyecto.supervisor?.nombres
                                ? `${selected.proyecto.supervisor.nombres} ${selected.proyecto.supervisor.apellidos}`
                                : <span className="al-field-value-muted">Sin supervisor asignado</span>
                              }
                            </span>
                          </div>

                          <div className="al-field">
                            <span className="al-field-label">Cuadrilla</span>
                            <span className="al-field-value">
                              {selected.nombre_cuadrilla}
                            </span>
                          </div>

                          <div className="al-field">
                            <span className="al-field-label">Fecha del accidente</span>
                            <span className="al-field-value">
                              {formatFecha(selected.fecha_accidente)}
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* ── Sección: Trabajador accidentado ── */}
                      <div>
                        <div className="al-section-title">Trabajador accidentado</div>
                        <div className="al-fields-grid">

                          <div className="al-field">
                            <span className="al-field-label">Nombre completo</span>
                            <span className="al-field-value">
                              {selected.trabajador.nombres} {selected.trabajador.apellidos}
                            </span>
                          </div>

                          <div className="al-field">
                            <span className="al-field-label">RUT</span>
                            <span className="al-field-value al-field-value-mono">
                              {selected.trabajador.rut}
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* ── Sección: Datos del accidente ── */}
                      <div>
                        <div className="al-section-title">Datos del accidente</div>
                        <div className="al-fields-grid">

                          <div className="al-field al-field-full">
                            <span className="al-field-label">Descripción</span>
                            <span className="al-field-value">{selected.descripcion}</span>
                          </div>

                          <div className="al-field">
                            <span className="al-field-label">Gravedad</span>
                            <span className={`tw-badge ${getGravedadClass(selected.gravedad)}`}>
                              {selected.gravedad}
                            </span>
                          </div>

                          <div className="al-field">
                            <span className="al-field-label">Traslado</span>
                            <span className="al-field-value">{selected.traslado}</span>
                          </div>

                          <div className="al-field al-field-full">
                            <span className="al-field-label">Observaciones</span>
                            {selected.observaciones
                              ? <span className="al-field-value">{selected.observaciones}</span>
                              : <span className="al-field-value-muted">Sin observaciones registradas</span>
                            }
                          </div>

                        </div>
                      </div>

                    </div>
                  </>
                ) : (
                  /* Estado vacío del panel derecho */
                  <div className="al-detail-empty">
                    <div className="al-detail-empty-icon">
                      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p>Selecciona un accidente de la lista<br/>para ver sus detalles</p>
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

export default AccidentesModuloTrabajador;
