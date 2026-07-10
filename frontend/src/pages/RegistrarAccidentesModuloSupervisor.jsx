import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  getMiProyectoParaRegistro,
  getMisCuadrillasConIntegrantes,
  registrarAccidenteLaboral,
} from '../services/registrarAccidenteModuloSupervisorService';
import '../styles/registrarAccidentesModuloSupervisor.css';

// ─── Constantes ───────────────────────────────────────────────────────────────

const CUADRILLAS_PER_PAGE  = 6;
const INTEGRANTES_PER_PAGE = 8;
const GRAVEDAD_OPTS = ['leve', 'moderado', 'grave', 'fatal'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombres, apellidos) {
  return ((nombres?.charAt(0) ?? '') + (apellidos?.charAt(0) ?? '')).toUpperCase();
}

/** Fecha de hoy en formato YYYY-MM-DD sin desfase de zona horaria */
function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const FORM_INICIAL = {
  fecha_accidente: getTodayISO(),
  gravedad:        'leve',
  traslado:        '',
  descripcion:     '',
  observaciones:   '',
};

// ─── Componente ───────────────────────────────────────────────────────────────

function RegistrarAccidentesModuloSupervisor({ usuario, onLogout }) {

  // ==========================
  // Estados
  // ==========================

  const [proyecto,           setProyecto]           = useState(null);
  const [cuadrillas,         setCuadrillas]         = useState([]);    // todas
  const [selectedCuadrilla,  setSelectedCuadrilla]  = useState(null);

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  // Paginación client-side — cuadrillas
  const [cuadrillaPage,   setCuadrillaPage]   = useState(1);

  // Paginación client-side — integrantes
  const [integrantePage,  setIntegrantePage]  = useState(1);

  // Éxito tras registro
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal de registro
  const [showModal,       setShowModal]       = useState(false);
  const [selectedWorker,  setSelectedWorker]  = useState(null);
  const [form,            setForm]            = useState(FORM_INICIAL);
  const [formError,       setFormError]       = useState(null);
  const [saving,          setSaving]          = useState(false);

  // ==========================
  // Carga inicial
  // ==========================

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const [proy, cuads] = await Promise.all([
          getMiProyectoParaRegistro(),
          getMisCuadrillasConIntegrantes(),
        ]);
        setProyecto(proy);
        setCuadrillas(cuads);
        // Auto-seleccionar la primera cuadrilla
        if (cuads.length > 0) setSelectedCuadrilla(cuads[0]);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ==========================
  // Derivados — paginación
  // ==========================

  const cuadrillaTotalPages = Math.ceil(cuadrillas.length / CUADRILLAS_PER_PAGE);
  const cuadrillasEnPagina  = cuadrillas.slice(
    (cuadrillaPage - 1) * CUADRILLAS_PER_PAGE,
    cuadrillaPage * CUADRILLAS_PER_PAGE,
  );

  const integrantes         = selectedCuadrilla?.integrantes ?? [];
  const integranteTotalPages = Math.ceil(integrantes.length / INTEGRANTES_PER_PAGE);
  const integrantesEnPagina  = integrantes.slice(
    (integrantePage - 1) * INTEGRANTES_PER_PAGE,
    integrantePage * INTEGRANTES_PER_PAGE,
  );

  // ==========================
  // Handlers — cuadrillas
  // ==========================

  const handleSelectCuadrilla = (cuadrilla) => {
    setSelectedCuadrilla(cuadrilla);
    setIntegrantePage(1);    // resetear paginación de integrantes
    setSuccessMsg(null);
  };

  // ==========================
  // Handlers — modal
  // ==========================

  const handleOpenModal = (integrante) => {
    setSelectedWorker(integrante);
    setForm({ ...FORM_INICIAL, fecha_accidente: getTodayISO() });
    setFormError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setShowModal(false);
    setFormError(null);
  };

  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegistrar = async () => {
    // ── Validaciones frontend (espejo de validarRegistrarAccidenteLaboral) ──

    if (!form.fecha_accidente) {
      setFormError('La fecha del accidente es obligatoria.');
      return;
    }
    if (isNaN(Date.parse(form.fecha_accidente))) {
      setFormError('La fecha del accidente no es válida.');
      return;
    }
    if (!form.descripcion.trim()) {
      setFormError('La descripción es obligatoria.');
      return;
    }
    if (!form.gravedad.trim()) {
      setFormError('La gravedad es obligatoria.');
      return;
    }
    if (!form.traslado.trim()) {
      setFormError('El traslado es obligatorio.');
      return;
    }
    if (!form.observaciones.trim()) {
      setFormError('Las observaciones son obligatorias.');
      return;
    }

    // ── Payload ──
    const payload = {
      id_trabajador:   selectedWorker.id_trabajador,
      id_cuadrilla:    selectedCuadrilla.id_cuadrilla,
      fecha_accidente: form.fecha_accidente,
      descripcion:     form.descripcion.trim(),
      gravedad:        form.gravedad,
      traslado:        form.traslado.trim(),
    };
    payload.observaciones = form.observaciones.trim();

    // ── Llamada al backend ──
    setSaving(true);
    setFormError(null);
    try {
      await registrarAccidenteLaboral(payload);
      setShowModal(false);
      setSuccessMsg(
        `Accidente registrado correctamente para ${selectedWorker.nombres} ${selectedWorker.apellidos}.`
      );
      // Ocultar el mensaje de éxito después de 4 segundos
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
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

          {/* ── Bloque tope ──────────────────────────────────────────────── */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">
                Registrar Accidente Laboral
                {proyecto && (
                  <span className="ra-tope-proyecto">
                    {' '}— {proyecto.nombre_proyecto}
                  </span>
                )}
              </h1>
              <p className="vista-general-subtitle">
                Registro de accidentes laborales del proyecto
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
              Cargando información...
            </div>
          ) : (
            <div className="ra-layout">

              {/* ════════ PANEL IZQUIERDO — cuadrillas ════════ */}
              <div className="ra-panel">

                <div className="ra-panel-header">
                  <span className="ra-panel-title">Cuadrillas</span>
                  <span className="ra-panel-badge">{cuadrillas.length}</span>
                </div>

                {cuadrillas.length === 0 ? (
                  <div className="ra-empty">
                    <div className="ra-empty-icon">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p>Sin cuadrillas<br />en este proyecto</p>
                  </div>
                ) : (
                  <>
                    <div className="ra-cuadrilla-list">
                      {cuadrillasEnPagina.map(cuadrilla => (
                        <div
                          key={cuadrilla.id_cuadrilla}
                          className={`ra-cuadrilla-item${selectedCuadrilla?.id_cuadrilla === cuadrilla.id_cuadrilla ? ' ra-cuadrilla-selected' : ''}`}
                          onClick={() => handleSelectCuadrilla(cuadrilla)}
                        >
                          <div className="ra-cuadrilla-icon">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>

                          <div className="ra-cuadrilla-info">
                            <div className="ra-cuadrilla-name">{cuadrilla.nombre_cuadrilla}</div>
                            <div className="ra-cuadrilla-count">
                              {cuadrilla.integrantes?.length ?? 0} integrantes
                            </div>
                          </div>

                          <span className={`ra-badge ${cuadrilla.estado === 'activa' ? 'ra-badge-activa' : 'ra-badge-inactiva'}`}>
                            {cuadrilla.estado}
                          </span>
                        </div>
                      ))}
                    </div>

                    {cuadrillaTotalPages > 1 && (
                      <div className="ra-pagination">
                        <span className="ra-page-info">
                          {cuadrillaPage} / {cuadrillaTotalPages}
                        </span>
                        <div className="ra-page-btns">
                          <button
                            className="ra-page-btn"
                            onClick={() => setCuadrillaPage(p => p - 1)}
                            disabled={cuadrillaPage === 1}
                          >‹</button>
                          <button
                            className="ra-page-btn"
                            onClick={() => setCuadrillaPage(p => p + 1)}
                            disabled={cuadrillaPage === cuadrillaTotalPages}
                          >›</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>

              {/* ════════ PANEL DERECHO — integrantes ════════ */}
              <div className="ra-panel">

                <div className="ra-panel-header">
                  <span className="ra-panel-title">
                    {selectedCuadrilla
                      ? `Integrantes — ${selectedCuadrilla.nombre_cuadrilla}`
                      : 'Integrantes'}
                  </span>
                  {selectedCuadrilla && (
                    <span className="ra-panel-badge">{integrantes.length}</span>
                  )}
                </div>

                {/* Banner de éxito */}
                {successMsg && (
                  <div className="ra-success-banner">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {successMsg}
                  </div>
                )}

                {!selectedCuadrilla ? (
                  <div className="ra-empty">
                    <div className="ra-empty-icon">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                    <p>Selecciona una cuadrilla<br />para ver sus integrantes</p>
                  </div>
                ) : integrantes.length === 0 ? (
                  <div className="ra-empty">
                    <div className="ra-empty-icon">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p>Esta cuadrilla<br />no tiene integrantes</p>
                  </div>
                ) : (
                  <>
                    <div className="ra-integrante-list">
                      {integrantesEnPagina.map(integrante => (
                        <div key={integrante.id_trabajador} className="ra-integrante-row">

                          <div className="ra-avatar">
                            {getInitials(integrante.nombres, integrante.apellidos)}
                          </div>

                          <div className="ra-integrante-info">
                            <div className="ra-integrante-name">
                              {integrante.nombres} {integrante.apellidos}
                            </div>
                            <div className="ra-integrante-rut">{integrante.rut}</div>
                          </div>

                          <button
                            className="ra-btn-registrar"
                            onClick={() => handleOpenModal(integrante)}
                            title={`Registrar accidente para ${integrante.nombres}`}
                          >
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Registrar Accidente
                          </button>

                        </div>
                      ))}
                    </div>

                    {integranteTotalPages > 1 && (
                      <div className="ra-pagination">
                        <span className="ra-page-info">
                          Página {integrantePage} de {integranteTotalPages}
                        </span>
                        <div className="ra-page-btns">
                          <button
                            className="ra-page-btn"
                            onClick={() => setIntegrantePage(p => p - 1)}
                            disabled={integrantePage === 1}
                          >‹</button>
                          <button
                            className="ra-page-btn"
                            onClick={() => setIntegrantePage(p => p + 1)}
                            disabled={integrantePage === integranteTotalPages}
                          >›</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>

            </div>
          )}

        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MODAL — Registrar accidente laboral
          Campos (según validarRegistrarAccidenteLaboral):
            fecha_accidente · descripcion · gravedad · traslado · observaciones?
      ════════════════════════════════════════════════════════ */}
      {showModal && selectedWorker && selectedCuadrilla && (
        <div className="tw-modal-overlay" onClick={handleCloseModal}>
          <div className="tw-modal" onClick={e => e.stopPropagation()}>

            {/* Cabecera */}
            <div className="tw-modal-header">
              <div>
                <h2>Registrar Accidente Laboral</h2>
                <p>
                  {selectedWorker.nombres} {selectedWorker.apellidos}
                  &nbsp;·&nbsp;
                  {selectedCuadrilla.nombre_cuadrilla}
                </p>
              </div>
              <button className="tw-modal-close" onClick={handleCloseModal} disabled={saving}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Formulario */}
            <div className="tw-form">

              {formError && (
                <div className="tw-form-error">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {formError}
                </div>
              )}

              {/* Fecha */}
              <div className="tw-field">
                <label htmlFor="reg-fecha">Fecha del accidente</label>
                <input
                  id="reg-fecha"
                  name="fecha_accidente"
                  type="date"
                  value={form.fecha_accidente}
                  onChange={handleFormChange}
                  max={getTodayISO()}
                />
              </div>

              {/* Gravedad + Traslado */}
              <div className="tw-form-grid-2">

                <div className="tw-field">
                  <label htmlFor="reg-gravedad">Gravedad</label>
                  <select
                    id="reg-gravedad"
                    name="gravedad"
                    value={form.gravedad}
                    onChange={handleFormChange}
                  >
                    {GRAVEDAD_OPTS.map(g => (
                      <option key={g} value={g}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tw-field">
                  <label htmlFor="reg-traslado">Traslado</label>
                  <input
                    id="reg-traslado"
                    name="traslado"
                    type="text"
                    value={form.traslado}
                    onChange={handleFormChange}
                    placeholder="Ej: ambulancia, propio, etc"
                  />
                </div>

              </div>

              {/* Descripción */}
              <div className="tw-field">
                <label htmlFor="reg-descripcion">Descripción</label>
                <textarea
                  id="reg-descripcion"
                  name="descripcion"
                  className="ra-textarea"
                  value={form.descripcion}
                  onChange={handleFormChange}
                  placeholder="Describe cómo ocurrió el accidente"
                />
              </div>

              {/* Observaciones */}
              <div className="tw-field">
                <label htmlFor="reg-observaciones">
                  Observaciones
                </label>
                <textarea
                  id="reg-observaciones"
                  name="observaciones"
                  className="ra-textarea"
                  value={form.observaciones}
                  onChange={handleFormChange}
                  placeholder="Información adicional"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="tw-modal-footer">
              <button className="tw-btn-cancel" onClick={handleCloseModal} disabled={saving}>
                Cancelar
              </button>
              <button className="tw-btn-save" onClick={handleRegistrar} disabled={saving}>
                {saving ? (
                  <>
                    <div className="tw-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Registrando...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Registrar accidente
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

export default RegistrarAccidentesModuloSupervisor;
