import React, { useState, useEffect } from 'react';
import {
  Search, ArrowLeft, Plus, Edit2,
  ChevronLeft, ChevronRight, X, AlertCircle, FileText,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  getRemuneraciones,
  crearRemuneracion,
  actualizarRemuneracion,
} from '../services/remuneracionesAdminService';
import '../styles/remuneracionesAdmin.css';

// ─── Helpers ──────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

const formatCLP = (n) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n ?? 0);

// Dates arrive as "YYYY-MM-DD" strings; adding T12:00:00 avoids UTC offset issues.
const formatDate = (d) => {
  if (!d) return '—';
  return new Date(`${d}T12:00:00`).toLocaleDateString('es-CL');
};

// Formats a raw keystroke string into XX.XXX.XXX-X on the fly.
const formatRutInput = (value) => {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length <= 1) return clean;
  const dv   = clean.slice(-1);
  const body = clean.slice(0, -1);
  return `${body}-${dv}`;
};

const isValidRut = (rut) => /^\d{7,8}-[\dkK]$/.test(rut);

const badgePago = (estado) => {
  const map = { pendiente: 'badge-pendiente', pagado: 'badge-pagado', atrasado: 'badge-atrasado' };
  return `tw-badge ${map[estado] ?? ''}`;
};

const badgeContrato = (estado) => {
  const map = { Activo: 'badge-activo', Inactivo: 'badge-inactivo', 'Por vencer': 'badge-por-vencer' };
  return `tw-badge ${map[estado] ?? ''}`;
};



// Returns { monto, label } used to pre-fill the create modal.
const getSueldoInfo = (contrato) => {
  const tieneAnexoConMonto = contrato?.anexos?.some((a) => a.monto_nuevo != null) ?? false;
  return {
    monto: contrato?.monto ?? 0,
    label: tieneAnexoConMonto
      ? 'Monto basado en el anexo más reciente'
      : 'Monto basado en sueldo del contrato',
  };
};

const ESTADOS_PAGO = ['pendiente', 'pagado', 'atrasado'];

// ─── Component ────────────────────────────────────────────────────────────

function RemuneracionesAdmin({ usuario, onLogout }) {

  // ==========================
  // Estados: Data
  // ==========================
  const [trabajadores,   setTrabajadores]   = useState([]);
  const [meta,           setMeta]           = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [refetchTrigger, setRefetchTrigger] = useState(0); // increment to force re-fetch

  // ==========================
  // Estados: Filtros
  // ==========================
  const [rutInput,           setRutInput]           = useState('');
  const [appliedRut,         setAppliedRut]         = useState('');
  const [filterEstadoPago,   setFilterEstadoPago]   = useState('');
  const [filterTipoContrato, setFilterTipoContrato] = useState('');
  const [filterEstadoContrato, setFilterEstadoContrato] = useState('');
  const [sinRemuneracion,    setSinRemuneracion]    = useState(false);

  // ==========================
  // Estados: Selección
  // ==========================
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);
  const [selectedContrato,   setSelectedContrato]   = useState(null);

  // ==========================
  // Estados: Modal Crear
  // ==========================
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFecha,     setCreateFecha]     = useState('');
  const [createError,     setCreateError]     = useState(null);
  const [creating,        setCreating]        = useState(false);

  // ==========================
  // Estados: Modal Editar
  // ==========================
  const [editTarget, setEditTarget] = useState(null); // remuneracion object
  const [editForm,   setEditForm]   = useState({ bono: '', descuento: '', estado_pago: '' });
  const [editError,  setEditError]  = useState(null);
  const [saving,     setSaving]     = useState(false);

  // ==========================
  // Effect 1: Fetch al cambiar filtros o página
  // ==========================
  useEffect(() => {
    const doFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { page: currentPage, limit: 10 };

        if (sinRemuneracion) {
          // Cuando este filtro está activo el backend ignora todos los demás.
          params.filter_contratos_sin_remuneracion = true;
        } else {
          if (appliedRut)           params.rut             = appliedRut;
          if (filterEstadoPago)     params.estado_pago     = filterEstadoPago;
          if (filterTipoContrato)   params.tipo_contrato   = filterTipoContrato;
          if (filterEstadoContrato) params.estado_contrato = filterEstadoContrato;
        }

        const result = await getRemuneraciones(params);
        // Orden ascendente por apellidos en la página actual.
        const sorted = [...result.data].sort((a, b) =>
          (a.apellidos ?? '').localeCompare(b.apellidos ?? '', 'es')
        );
        setTrabajadores(sorted);
        setMeta(result.meta);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    doFetch();
  }, [currentPage, appliedRut, filterEstadoPago, filterTipoContrato, filterEstadoContrato, sinRemuneracion, refetchTrigger]);

  // ==========================
  // Effect 2: Re-sincronizar selección tras refresco de datos
  // ==========================
  useEffect(() => {
    if (!selectedTrabajador) return;

    const updated = trabajadores.find(
      (t) => t.id_trabajador === selectedTrabajador.id_trabajador
    );

    if (!updated) {
      // El trabajador ya no aparece en los resultados (filtrado).
      setSelectedTrabajador(null);
      setSelectedContrato(null);
      return;
    }

    setSelectedTrabajador(updated);

    if (selectedContrato) {
      const updatedC = updated.contratos?.find(
        (c) => c.id_contrato === selectedContrato.id_contrato
      );
      setSelectedContrato(updatedC ?? null);
    }
  }, [trabajadores]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================
  // Handlers: Filtros
  // ==========================

  const handleRutChange = (e) => setRutInput(formatRutInput(e.target.value));

  const handleSearch = () => {
    if (rutInput && !isValidRut(rutInput)) {
      setError('Formato de RUT inválido. Use: 12.345.678-9');
      return;
    }
    setError(null);
    setAppliedRut(rutInput);
    setCurrentPage(1);
  };

  const handleClearRut = () => {
    setRutInput('');
    setAppliedRut('');
    setCurrentPage(1);
  };

  const handleDropdownChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const handleToggleSinRem = () => {
    setSinRemuneracion((prev) => !prev);
    setCurrentPage(1);
  };

  // ==========================
  // Handlers: Selección
  // ==========================

  const handleSelectTrabajador = (t) => {
    setSelectedTrabajador(t);
    setSelectedContrato(null);
  };

  const handleSelectContrato = (c) => setSelectedContrato(c);

  const handleBack = () => setSelectedContrato(null);

  // ==========================
  // Handlers: Modal Crear
  // ==========================

  const openCreate = () => {
    setCreateFecha('');
    setCreateError(null);
    setShowCreateModal(true);
  };

  const closeCreate = () => {
    setShowCreateModal(false);
    setCreateError(null);
  };

  const handleCreate = async () => {
    setCreateError(null);

    if (!createFecha) {
      setCreateError('La fecha de pago es requerida.');
      return;
    }
    if (createFecha < todayStr()) {
      setCreateError('La fecha de pago no puede ser anterior a hoy.');
      return;
    }

    const { monto } = getSueldoInfo(selectedContrato);

    setCreating(true);
    try {
      await crearRemuneracion({
        id_trabajador: selectedTrabajador.id_trabajador,
        id_contrato:   selectedContrato.id_contrato,
        fecha_pago:    createFecha,
        sueldo:        monto,
      });
      closeCreate();
      setRefetchTrigger((t) => t + 1);
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  // ==========================
  // Handlers: Modal Editar
  // ==========================

  const openEdit = (rem) => {
    setEditTarget(rem);
    setEditForm({ bono: '', descuento: '', estado_pago: '' });
    setEditError(null);
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditError(null);
  };

  const handleEdit = async () => {
    setEditError(null);
    const { bono, descuento, estado_pago } = editForm;

    if (!bono && !descuento && !estado_pago) {
      setEditError('Debe completar al menos un campo.');
      return;
    }
    if (bono !== '' && (!Number.isInteger(+bono) || +bono < 0)) {
      setEditError("'Bono' debe ser un entero no negativo.");
      return;
    }
    if (descuento !== '' && (!Number.isInteger(+descuento) || +descuento < 0)) {
      setEditError("'Descuento' debe ser un entero no negativo.");
      return;
    }

    const payload = {};
    if (bono        !== '') payload.bono        = Number(bono);
    if (descuento   !== '') payload.descuento   = Number(descuento);
    if (estado_pago !== '') payload.estado_pago = estado_pago;

    setSaving(true);
    try {
      await actualizarRemuneracion(editTarget.id_remuneracion, payload);
      closeEdit();
      setRefetchTrigger((t) => t + 1);
    } catch (e) {
      setEditError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================
  // Valores derivados
  // ==========================

  const sortedContratos = [...(selectedTrabajador?.contratos ?? [])].sort(
    (a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio)
  );

  const sortedRemuneraciones = [...(selectedContrato?.remuneraciones ?? [])].sort(
    (a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)
  );

  const sueldoInfo        = selectedContrato ? getSueldoInfo(selectedContrato) : null;

  // ==========================
  // Render: panel derecho
  // ==========================

  const renderRightContent = () => {
    // Nada seleccionado
    if (!selectedTrabajador) {
      return (
        <div className="rm-empty-panel">
          <FileText size={38} strokeWidth={1.2} />
          <span>Selecciona un trabajador para ver sus contratos y remuneraciones</span>
        </div>
      );
    }

    // Trabajador seleccionado → lista de contratos
    if (!selectedContrato) {
      return (
        <>
          <div className="rm-panel-header">
            <div>
              <div className="rm-panel-title">
                {selectedTrabajador.nombres} {selectedTrabajador.apellidos}
              </div>
              <div className="rm-panel-subtitle">
                {selectedTrabajador.rut} · {sortedContratos.length} contrato(s)
              </div>
            </div>
          </div>

          <div className="rm-panel-body">
            {sortedContratos.length === 0 ? (
              <div className="rm-empty-panel">Sin contratos registrados</div>
            ) : (
              <>
                <div className="rm-contract-header">
                  <span>ID</span>
                  <span>Tipo</span>
                  <span>Inicio</span>
                  <span>Término</span>
                  <span>Estado</span>
                </div>
                {sortedContratos.map((c) => (
                  <div
                    key={c.id_contrato}
                    className={`rm-contract-row ${!c.remuneraciones?.length ? 'rm-contract-sin-rem' : ''}`}
                    onClick={() => handleSelectContrato(c)}
                  >
                    <span style={{ fontFamily: 'monospace', color: '#9ca3af' }}>
                      #{c.id_contrato}
                    </span>
                    <span style={{ fontWeight: 500 }}>{c.tipo_contrato}</span>
                    <span>{formatDate(c.fecha_inicio)}</span>
                    <span>{c.fecha_termino ? formatDate(c.fecha_termino) : '—'}</span>
                    <span>
                      <span className={badgeContrato(c.estado_contrato)}>
                        {c.estado_contrato}
                      </span>
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      );
    }

    // Contrato seleccionado → zona superior + zona inferior
    return (
      <>
        {/* ── Zona superior ── */}
        <div className="rm-detail-top">
          <div className="rm-detail-actions">
            <button className="rm-btn-back" onClick={handleBack}>
              <ArrowLeft size={13} /> Volver
            </button>
            <button className="rm-btn-crear" onClick={openCreate}>
              <Plus size={13} /> Crear Remuneración
            </button>
          </div>

          <div className="rm-info-grid">
            <div className="rm-info-item">
              <div className="rm-info-label">Tipo</div>
              <div className="rm-info-value">{selectedContrato.tipo_contrato}</div>
            </div>
            <div className="rm-info-item">
              <div className="rm-info-label">Inicio</div>
              <div className="rm-info-value">{formatDate(selectedContrato.fecha_inicio)}</div>
            </div>
            <div className="rm-info-item">
              <div className="rm-info-label">Término</div>
              <div className="rm-info-value">
                {selectedContrato.fecha_termino ? formatDate(selectedContrato.fecha_termino) : '—'}
              </div>
            </div>
            <div className="rm-info-item">
              <div className="rm-info-label">Estado</div>
              <div className="rm-info-value">
                <span className={badgeContrato(selectedContrato.estado_contrato)}>
                  {selectedContrato.estado_contrato}
                </span>
              </div>
            </div>
            <div className="rm-info-item">
              <div className="rm-info-label">Sueldo base</div>
              <div className="rm-info-value">{formatCLP(selectedContrato.monto)}</div>
            </div>
          </div>
        </div>

        {/* ── Zona inferior ── */}
        <div className="rm-detail-bottom">
          <div className="rm-detail-bottom-title">
            Remuneraciones ({sortedRemuneraciones.length})
          </div>

          {sortedRemuneraciones.length === 0 ? (
            <div className="rm-empty-panel" style={{ paddingTop: 24, paddingBottom: 24 }}>
              Sin remuneraciones registradas para este contrato
            </div>
          ) : (
            <table className="rm-rem-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha pago</th>
                  <th>Sueldo</th>
                  <th>Bono</th>
                  <th>Desc.</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedRemuneraciones.map((rem) => {
                  const total = rem.sueldo + rem.bono - rem.descuento;
                  return (
                    <tr key={rem.id_remuneracion}>
                      <td style={{ fontFamily: 'monospace', color: '#9ca3af' }}>
                        #{rem.id_remuneracion}
                      </td>
                      <td>{formatDate(rem.fecha_pago)}</td>
                      <td>{formatCLP(rem.sueldo)}</td>
                      <td>{formatCLP(rem.bono)}</td>
                      <td>{formatCLP(rem.descuento)}</td>
                      <td className="rm-rem-total">{formatCLP(total)}</td>
                      <td>
                        <span className={badgePago(rem.estado_pago)}>{rem.estado_pago}</span>
                      </td>
                      <td>
                        <button
                          className="tw-btn-edit"
                          onClick={() => openEdit(rem)}
                          title="Modificar"
                        >
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };

  // ==========================
  // Render: Modal Crear
  // ==========================

  const renderCreateModal = () => {
    if (!showCreateModal || !selectedContrato) return null;
    const { monto, label } = sueldoInfo;

    return (
      <div className="tw-modal-overlay" onClick={closeCreate}>
        <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="tw-modal-header">
            <h2>Nueva Remuneración</h2>
            <button className="tw-modal-close" onClick={closeCreate}>
              <X size={15} />
            </button>
          </div>

          {createError && (
            <div className="tw-form-error">
              <AlertCircle size={13} /> {createError}
            </div>
          )}

          <div className="tw-form">
            <div className="tw-form-grid">
              <div className="tw-field tw-field-full">
                <label>Fecha de pago</label>
                <input
                  type="date"
                  min={todayStr()}
                  value={createFecha}
                  onChange={(e) => setCreateFecha(e.target.value)}
                />
              </div>

              <div className="tw-field tw-field-full">
                <label>Sueldo</label>
                <input
                  type="text"
                  value={formatCLP(monto)}
                  readOnly
                  className="rm-field-readonly"
                />
                <span className="rm-monto-label">{label}</span>
              </div>
            </div>
          </div>

          <div className="tw-modal-footer">
            <button className="tw-btn-cancel" onClick={closeCreate}>Cancelar</button>
            <button className="tw-btn-save" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creando...' : <><Plus size={13} /> Crear</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================
  // Render: Modal Editar
  // ==========================

  const renderEditModal = () => {
    if (!editTarget) return null;

    return (
      <div className="tw-modal-overlay" onClick={closeEdit}>
        <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="tw-modal-header">
            <h2>Modificar Remuneración #{editTarget.id_remuneracion}</h2>
            <button className="tw-modal-close" onClick={closeEdit}>
              <X size={15} />
            </button>
          </div>

          {editError && (
            <div className="tw-form-error">
              <AlertCircle size={13} /> {editError}
            </div>
          )}

          <div className="tw-form">
            <div className="tw-form-grid">
              <div className="tw-field">
                <label>Bono</label>
                <input
                  type="number"
                  min="0"
                  placeholder={`Actual: ${formatCLP(editTarget.bono)}`}
                  value={editForm.bono}
                  onChange={(e) => setEditForm((f) => ({ ...f, bono: e.target.value }))}
                />
              </div>

              <div className="tw-field">
                <label>Descuento</label>
                <input
                  type="number"
                  min="0"
                  placeholder={`Actual: ${formatCLP(editTarget.descuento)}`}
                  value={editForm.descuento}
                  onChange={(e) => setEditForm((f) => ({ ...f, descuento: e.target.value }))}
                />
              </div>

              <div className="tw-field tw-field-full">
                <label>Estado de pago</label>
                <select
                  value={editForm.estado_pago}
                  onChange={(e) => setEditForm((f) => ({ ...f, estado_pago: e.target.value }))}
                >
                  <option value="">— Sin cambio (actual: {editTarget.estado_pago}) —</option>
                  {ESTADOS_PAGO.map((ep) => (
                    <option key={ep} value={ep}>{ep}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="tw-modal-footer">
            <button className="tw-btn-cancel" onClick={closeEdit}>Cancelar</button>
            <button className="tw-btn-save" onClick={handleEdit} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================
  // Render principal
  // ==========================

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />

      <div className="dashboard-main">
        <Header onLogout={onLogout} />

        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Remuneraciones</h1>
              <p className="vista-general-subtitle">Administración de remuneraciones del sistema</p>
            </div>
          </div>

          {error && (
            <div className="tw-error-banner">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="rm-layout">

            {/* ════════════════════ BLOQUE IZQUIERDO ════════════════════ */}
            <div>

              {/* ── Toolbar fila 1: búsqueda por RUT ── */}
              <div className="rm-toolbar-row" style={{ marginBottom: 0 }}>
                <div
                  className={`tw-search-wrapper ${sinRemuneracion ? 'rm-filters-disabled' : ''}`}
                  style={{ flex: 1, minWidth: 170 }}
                >
                  <Search size={13} className="tw-search-icon" />
                  <input
                    className="tw-search-input"
                    placeholder="12345678-9"
                    value={rutInput}
                    onChange={handleRutChange}
                    maxLength={12}
                    disabled={sinRemuneracion}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                <button
                  className="rm-btn-search"
                  onClick={handleSearch}
                  disabled={sinRemuneracion}
                >
                  Buscar
                </button>

                {appliedRut && !sinRemuneracion && (
                  <button
                    className="tw-filter-btn"
                    onClick={handleClearRut}
                    title="Limpiar búsqueda"
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* ── Toolbar fila 2: dropdowns + toggle ── */}
              <div className="rm-toolbar-row" style={{ marginTop: 8, marginBottom: 12 }}>
                <div
                  className={`tw-filters ${sinRemuneracion ? 'rm-filters-disabled' : ''}`}
                  style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
                >
                  <select
                    className={`rm-select ${filterEstadoPago ? 'rm-select-active' : ''}`}
                    value={filterEstadoPago}
                    onChange={handleDropdownChange(setFilterEstadoPago)}
                    disabled={sinRemuneracion}
                  >
                    <option value="">Estado Pago</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="atrasado">Atrasado</option>
                  </select>

                  <select
                    className={`rm-select ${filterTipoContrato ? 'rm-select-active' : ''}`}
                    value={filterTipoContrato}
                    onChange={handleDropdownChange(setFilterTipoContrato)}
                    disabled={sinRemuneracion}
                  >
                    <option value="">Tipo Contrato</option>
                    <option value="Indefinido">Indefinido</option>
                    <option value="Plazo Fijo">Plazo Fijo</option>
                  </select>

                  <select
                    className={`rm-select ${filterEstadoContrato ? 'rm-select-active' : ''}`}
                    value={filterEstadoContrato}
                    onChange={handleDropdownChange(setFilterEstadoContrato)}
                    disabled={sinRemuneracion}
                  >
                    <option value="">Estado Contrato</option>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Por vencer">Por vencer</option>
                  </select>
                </div>

                <button
                  className={`rm-btn-sin-rem ${sinRemuneracion ? 'rm-btn-sin-rem-active' : ''}`}
                  onClick={handleToggleSinRem}
                >
                  {sinRemuneracion ? 'No necesita remuneración' : 'Necesita remuneración'}
                </button>
              </div>

              {/* ── Contador ── */}
              <div className="tw-count">
                <span>{meta.total} trabajador(es) encontrado(s)</span>
              </div>

              {/* ── Tabla ── */}
              {loading ? (
                <div className="tw-loading">
                  <div className="tw-spinner" />
                  Cargando...
                </div>
              ) : trabajadores.length === 0 ? (
                <div className="tw-empty">
                  <FileText size={30} strokeWidth={1.3} />
                  <span>No se encontraron trabajadores</span>
                </div>
              ) : (
                <div className="tw-table-card">
                  <table className="tw-table">
                    <thead>
                      <tr>
                        <th>Trabajador</th>
                        <th>RUT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trabajadores.map((t) => {
                        const isSelected =
                          selectedTrabajador?.id_trabajador === t.id_trabajador;
                        return (
                          <tr
                            key={t.id_trabajador}
                            className={`rm-row-clickable ${isSelected ? 'rm-row-selected' : ''}`}
                            onClick={() => handleSelectTrabajador(t)}
                          >
                            <td>
                              <div className="tw-name-cell">
                                <div className="tw-avatar">
                                  {(t.nombres?.[0] ?? '') + (t.apellidos?.[0] ?? '')}
                                </div>
                                <div>
                                  <div className="tw-fullname">
                                    {t.nombres} {t.apellidos}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                                    {t.contratos?.length ?? 0} contrato(s)
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="tw-rut">{t.rut}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Paginación ── */}
              {meta.totalPages > 1 && (
                <div className="rm-pagination">
                  <span className="rm-pagination-info">
                    Página {currentPage} de {meta.totalPages}
                  </span>
                  <div className="rm-pagination-controls">
                    <button
                      className="rm-page-btn"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      className="rm-page-btn"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage === meta.totalPages}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ════════════════════ BLOQUE DERECHO ═════════════════════ */}
            <div className="rm-panel">
              {renderRightContent()}
            </div>

          </div>
        </div>
      </div>

      {/* Modales fuera del layout para que el overlay cubra toda la pantalla */}
      {renderCreateModal()}
      {renderEditModal()}
    </div>
  );
}

export default RemuneracionesAdmin;