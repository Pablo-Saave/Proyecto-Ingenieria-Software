import React, { useState, useEffect } from 'react';
import {
  Search, UserX, CalendarOff, AlertCircle, ClipboardList,
  CheckCircle, Trash2, X,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  getAusencias,
  crearAusenciaPorSupervisor,
  revisarAusencia as revisarAusenciaService,
  eliminarAusencia as eliminarAusenciaService,
} from '../services/ausenciasService';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Nota: esta llamada no tiene aún un home en cuadrillasService.js.
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
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Error ${res.status}`);
    }
    throw new Error(`Error interno del servidor (${res.status})`);
  }
  return res.json();
}

const FILTROS = ['Todos', 'Pendiente', 'Por Justificar', 'Justificada', 'Aprobado', 'Rechazado'];

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyInasistencia = () => ({
  id_trabajador: '',
  id_cuadrilla: '',
  fecha: todayStr(),
});

function Ausencias({ usuario, onLogout }) {
  const [ausencias, setAusencias]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');

  // Cuadrillas del supervisor (para el modal de inasistencia)
  const [misCuadrillas, setMisCuadrillas]           = useState([]);
  const [misCuadrillasLoading, setMisCuadrillasLoading] = useState(false);
  const [misCuadrillasError, setMisCuadrillasError]     = useState(null);
  const [cuadrillaSeleccionada, setCuadrillaSeleccionada] = useState('');

  // Modal registrar inasistencia
  const [showModalInasist, setShowModalInasist]   = useState(false);
  const [inasistForm, setInasistForm]             = useState(emptyInasistencia());
  const [inasistError, setInasistError]           = useState(null);
  const [savingInasist, setSavingInasist]         = useState(false);

  // Modal revisar
  const [showRevision, setShowRevision]           = useState(false);
  const [revisionEstado, setRevisionEstado]       = useState('Aprobado');
  const [revisionComentario, setRevisionComentario] = useState('');
  const [revisionId, setRevisionId]               = useState(null);
  const [revisionError, setRevisionError]         = useState(null);
  const [savingRevision, setSavingRevision]       = useState(false);

  const [confirmDelete, setConfirmDelete]         = useState(null);

  const mostrarColumnaAcciones =
    usuario?.tipo_usuario === 'administrador' ||
    usuario?.tipo_usuario === 'supervisor';
  const puedeRegistrarInasistencia = usuario?.tipo_usuario === 'supervisor';

  // ── Carga de ausencias ───────────────────────────────────────────────────
  const fetchAusencias = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAusencias();
      setAusencias(Array.isArray(res) ? res : res.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Carga de cuadrillas del supervisor (para el modal de inasistencia) ───
  const fetchMisCuadrillas = async () => {
    setMisCuadrillasLoading(true);
    setMisCuadrillasError(null);
    try {
      const res = await apiFetch('/api/cuadrilla/supervisor/misCuadrillasAndIntegrantes');
      setMisCuadrillas(Array.isArray(res) ? res : res.data ?? []);
    } catch (e) {
      setMisCuadrillas([]);
      setMisCuadrillasError(e.message || 'No se pudieron cargar tus cuadrillas');
    } finally {
      setMisCuadrillasLoading(false);
    }
  };

  useEffect(() => {
    fetchAusencias();
    if (usuario?.tipo_usuario === 'supervisor') {
      fetchMisCuadrillas();
    }
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const nombreTrabajador = (a) => {
    const t = a.trabajador;
    if (!t) return `ID ${a.id_trabajador}`;
    return `${t.nombres} ${t.apellidos}`;
  };

  const trabajadoresDeCuadrilla = cuadrillaSeleccionada
    ? misCuadrillas.find((c) => c.id_cuadrilla === Number(cuadrillaSeleccionada))?.integrantes ?? []
    : [];

  const filtered = ausencias.filter((a) => {
    const q = searchQuery.toLowerCase();
    const nombre = nombreTrabajador(a).toLowerCase();
    const motivoJustif = a.justificacion?.motivo?.toLowerCase() ?? '';
    const matchSearch = !q || nombre.includes(q) || motivoJustif.includes(q);
    const matchEstado = filterEstado === 'Todos' || a.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const estadoBadgeClass = (estado) => {
    if (estado === 'Aprobado')   return 'badge-activo';
    if (estado === 'Rechazado') return 'badge-inactivo';
    if (estado === 'Por Justificar') return 'badge-por-justificar';
    if (estado === 'Justificada') return 'badge-justificada';
    return 'badge-licencia'; // Pendiente
  };

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // ── Registrar inasistencia ───────────────────────────────────────────────
  const openInasistencia = () => {
    setInasistForm(emptyInasistencia());
    setCuadrillaSeleccionada('');
    setInasistError(null);
    setShowModalInasist(true);
    if (misCuadrillas.length === 0 && !misCuadrillasLoading) {
      fetchMisCuadrillas();
    }
  };
  const closeInasistencia = () => { setShowModalInasist(false); setInasistError(null); };
  const handleInasistChange = (e) =>
    setInasistForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCuadrillaChange = (e) => {
    const idC = e.target.value;
    setCuadrillaSeleccionada(idC);
    setInasistForm((p) => ({ ...p, id_cuadrilla: idC, id_trabajador: '' }));
  };

  const handleSubmitInasist = async (e) => {
    e.preventDefault();
    setInasistError(null);
    setSavingInasist(true);
    try {
      await crearAusenciaPorSupervisor({
        // Se detecta "hoy": una sola fecha cubre inicio y término.
        fecha_inicio:  inasistForm.fecha,
        fecha_termino: inasistForm.fecha,
        id_trabajador: Number(inasistForm.id_trabajador),
        id_cuadrilla:  Number(inasistForm.id_cuadrilla),
      });
      closeInasistencia();
      fetchAusencias();
    } catch (e) {
      setInasistError(e.message);
    } finally {
      setSavingInasist(false);
    }
  };

  // ── Revisar (aprobar / rechazar) ─────────────────────────────────────────
  const openRevision = (ausencia) => {
    setRevisionEstado('Aprobado');
    setRevisionComentario('');
    setRevisionError(null);
    setRevisionId(ausencia.id_ausencia);
    setShowRevision(true);
  };
  const closeRevision = () => { setShowRevision(false); setRevisionError(null); };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    setRevisionError(null);
    setSavingRevision(true);
    try {
      await revisarAusenciaService(revisionId, {
        estado_aprobacion:   revisionEstado,
        comentario_revision: revisionComentario,
      });
      closeRevision();
      fetchAusencias();
    } catch (e) {
      setRevisionError(e.message);
    } finally {
      setSavingRevision(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await eliminarAusenciaService(id);
      setAusencias((prev) => prev.filter((a) => a.id_ausencia !== id));
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
              <h1 className="vista-general-title">Gestión de Ausencias</h1>
              <p className="vista-general-subtitle">Registro de inasistencias y justificaciones</p>
            </div>
            {puedeRegistrarInasistencia && (
              <button className="btn-nuevo-trabajador" onClick={openInasistencia}>
                <UserX size={16} /> Registrar Inasistencia
              </button>
            )}
          </div>

          {/* Toolbar */}
          <div className="tw-toolbar">
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input
                type="text"
                className="tw-search-input"
                placeholder="Buscar por trabajador o motivo..."
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
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="tw-count">
            <CalendarOff size={14} />
            {filtered.length} ausencia{filtered.length !== 1 ? 's' : ''}
            {filterEstado !== 'Todos' && ` · ${filterEstado}`}
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {/* Tabla */}
          <div className="tw-table-card">
            {loading ? (
              <div className="tw-loading"><div className="tw-spinner" /> Cargando ausencias...</div>
            ) : filtered.length === 0 ? (
              <div className="tw-empty"><ClipboardList size={40} /><p>No se encontraron ausencias</p></div>
            ) : (
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>Trabajador</th>
                    <th>Cuadrilla</th>
                    <th>Fecha</th>
                    <th>Motivo</th>
                    <th>Doc.</th>
                    <th>Estado</th>
                    {mostrarColumnaAcciones && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
                    const esRevisable     = a.estado === 'Pendiente' || a.estado === 'Justificada';
                    const esPropia        = idT === usuario?.id_trabajador;
                    const puedeRevisar    = esRevisable && !esPropia && usuario?.tipo_usuario === 'supervisor';                   
                    return (
                      <tr key={a.id_ausencia}>
                        <td>
                          <div className="tw-name-cell">
                            <div className="tw-avatar">
                              {(nombreTrabajador(a)[0] ?? '?').toUpperCase()}
                            </div>
                            <div className="tw-fullname">{nombreTrabajador(a)}</div>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', color: '#6b7280' }}>
                          {a.cuadrilla?.nombre_cuadrilla ?? `ID ${a.id_cuadrilla}`}
                        </td>
                        <td>{formatFecha(a.fecha_inicio)}</td>
                        <td className="aus-motivo">
                          {a.justificacion?.motivo
                            ? a.justificacion.motivo
                            : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin justificación</span>}
                        </td>
                        <td>
                          {a.justificacion?.documento_respaldo
                            ? <a href={`${API_BASE}${a.justificacion.documento_respaldo}`} target="_blank" rel="noopener noreferrer">📄</a>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td>
                          <span className={`tw-badge ${estadoBadgeClass(a.estado)}`}>{a.estado ?? '—'}</span>
                        </td>
                        {mostrarColumnaAcciones && (
                          <td>
                            <div className="tw-actions">
                              {puedeRevisar && (
                                <button className="tw-btn-edit" title="Revisar" onClick={() => openRevision(a)}>
                                  <CheckCircle size={14} />
                                </button>
                              )}
                              {esRevisable && esPropia && (
                                <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                                  Tu solicitud
                                </span>
                              )}
                              {usuario?.tipo_usuario === 'administrador' && (
                                <button className="tw-btn-delete" title="Eliminar" onClick={() => setConfirmDelete(a.id_ausencia)}>
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Registrar Inasistencia ─────────────────────────────────── */}
      {showModalInasist && (
        <div className="tw-modal-overlay" onClick={closeInasistencia}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Registrar Inasistencia</h2>
              <button className="tw-modal-close" onClick={closeInasistencia}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 24px 14px' }}>
              El trabajador tendrá la opción de justificar esta inasistencia desde su cuenta.
            </p>
            {inasistError && <div className="tw-form-error"><AlertCircle size={14} /> {inasistError}</div>}
            {misCuadrillasError && (
              <div className="tw-form-error">
                <AlertCircle size={14} /> No se pudieron cargar tus cuadrillas: {misCuadrillasError}
              </div>
            )}
            <form className="tw-form" onSubmit={handleSubmitInasist}>
              <div className="tw-form-grid">

                {/* Selector de cuadrilla — viene de misCuadrillas */}
                <div className="tw-field tw-field-full">
                  <label>Cuadrilla *</label>
                  <select
                    value={cuadrillaSeleccionada}
                    onChange={handleCuadrillaChange}
                    required
                    disabled={misCuadrillasLoading}
                  >
                    <option value="">
                      {misCuadrillasLoading ? 'Cargando cuadrillas...' : '— Seleccionar cuadrilla —'}
                    </option>
                    {misCuadrillas.map((c) => (
                      <option key={c.id_cuadrilla} value={c.id_cuadrilla}>
                        {c.nombre_cuadrilla}
                      </option>
                    ))}
                  </select>
                  {!misCuadrillasLoading && !misCuadrillasError && misCuadrillas.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      No tienes cuadrillas activas asignadas como supervisor.
                    </p>
                  )}
                </div>

                {/* Selector de trabajador — filtrado por cuadrilla seleccionada */}
                <div className="tw-field tw-field-full">
                  <label>Trabajador *</label>
                  <select
                    name="id_trabajador"
                    value={inasistForm.id_trabajador}
                    onChange={handleInasistChange}
                    required
                    disabled={!cuadrillaSeleccionada}
                  >
                    <option value="">
                      {cuadrillaSeleccionada ? '— Seleccionar trabajador —' : '— Primero selecciona una cuadrilla —'}
                    </option>
                    {trabajadoresDeCuadrilla.map((i) => (
                      <option key={i.id_trabajador} value={i.id_trabajador}>
                        {i.nombres} {i.apellidos} — {i.rut}
                      </option>
                    ))}
                  </select>
                  {cuadrillaSeleccionada && trabajadoresDeCuadrilla.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      Esta cuadrilla no tiene trabajadores asignados.
                    </p>
                  )}
                </div>

                {/* Fecha única — la inasistencia se detecta el mismo día */}
                <div className="tw-field tw-field-full">
                  <label>Fecha *</label>
                  <input
                    name="fecha"
                    type="date"
                    value={inasistForm.fecha}
                    onChange={handleInasistChange}
                    required
                  />
                </div>

                {/* Motivo fijo — no editable, gris */}
                <div className="tw-field tw-field-full">
                  <label>Motivo</label>
                  <input
                    value="Inasistencia registrada por supervisor — pendiente de justificación"
                    disabled
                    style={{ background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }}
                  />
                </div>

              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={closeInasistencia}>Cancelar</button>
                <button type="submit" className="tw-btn-save" style={{ background: '#374151' }} disabled={savingInasist}>
                  <UserX size={14} /> {savingInasist ? 'Registrando...' : 'Registrar Inasistencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Revisar Ausencia ────────────────────────────────────────── */}
      {showRevision && (
        <div className="tw-modal-overlay" onClick={closeRevision}>
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Revisar Ausencia</h2>
              <button className="tw-modal-close" onClick={closeRevision}><X size={18} /></button>
            </div>
            {revisionError && <div className="tw-form-error"><AlertCircle size={14} /> {revisionError}</div>}
            <form className="tw-form" onSubmit={handleRevisionSubmit}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Decisión *</label>
                  <select value={revisionEstado} onChange={(e) => setRevisionEstado(e.target.value)} required>
                    <option value="Aprobado"> Aprobar </option>
                    <option value="Rechazado"> Rechazar </option>
                  </select>
                </div>
                <div className="tw-field tw-field-full">
                  <label>Comentario *</label>
                  <input
                    value={revisionComentario}
                    onChange={(e) => setRevisionComentario(e.target.value)}
                    required
                    placeholder="Ej: Certificado médico validado"
                  />
                </div>
                {/* Revisado por — autocompletado con el usuario logueado */}
                <div className="tw-field tw-field-full">
                  <label>Revisado por</label>
                  <input
                    value={`${usuario?.nombres ?? ''} ${usuario?.apellidos ?? ''}`}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={closeRevision}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={savingRevision}>
                  <CheckCircle size={14} /> {savingRevision ? 'Guardando...' : 'Confirmar Revisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ─────────────────────────────────────────── */}
      {confirmDelete !== null && (
        <div className="tw-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Confirmar eliminación</h2>
              <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <p className="tw-confirm-text">¿Estás seguro de que deseas eliminar este registro de ausencia?</p>
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