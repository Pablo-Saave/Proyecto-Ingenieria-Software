import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/ausencias.css';
import {
  CalendarOff, Search, Trash2, X, Save, AlertCircle,
  ClipboardList, CheckCircle, UserX,
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

async function getTrabajadores() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/trabajadores`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.data ?? [];
}

const EMPTY_INASISTENCIA = { id_trabajador: '', fecha_inicio: '', fecha_termino: '' };
const EMPTY_REVISION = { estado: 'Aprobada', comentario_revision: '', revisado_por: '' };
const FILTROS = ['Todos', 'Por Justificar', 'Pendiente', 'Aprobada', 'Rechazada'];

function Ausencias({ usuario, onLogout }) {
  const [ausencias, setAusencias]       = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');

  // Modal registrar inasistencia (único flujo de creación para supervisor/admin)
  const [showModalInasist, setShowModalInasist] = useState(false);
  const [inasistForm, setInasistForm]   = useState(EMPTY_INASISTENCIA);
  const [inasistError, setInasistError] = useState(null);
  const [savingInasist, setSavingInasist] = useState(false);

  // Modal revisar
  const [showRevision, setShowRevision]     = useState(false);
  const [revisionData, setRevisionData]     = useState(EMPTY_REVISION);
  const [revisionId, setRevisionId]         = useState(null);
  const [revisionError, setRevisionError]   = useState(null);
  const [savingRevision, setSavingRevision] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  // Solo el administrador puede eliminar -> solo él necesita la columna Acciones
  const mostrarColumnaAcciones = usuario?.tipo_usuario === 'administrador'
    || usuario?.tipo_usuario === 'supervisor'; // supervisor sigue viendo "revisar"

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resA, resT] = await Promise.all([
        apiFetch('/api/ausencias'),
        getTrabajadores(),
      ]);
      setAusencias(Array.isArray(resA) ? resA : resA.data ?? []);
      setTrabajadores(resT);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const nombreTrabajador = (id) => {
    const t = trabajadores.find((w) => w.id_trabajador === id);
    return t ? `${t.nombres} ${t.apellidos}` : `ID ${id}`;
  };

  const filtered = ausencias.filter((a) => {
    const q = searchQuery.toLowerCase();
    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
    const nombre = nombreTrabajador(idT).toLowerCase();
    const matchSearch = !q || nombre.includes(q) || a.motivo?.toLowerCase().includes(q);
    const matchEstado = filterEstado === 'Todos' || a.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const estadoBadgeClass = (estado) => {
    if (estado === 'Aprobada')       return 'badge-activo';
    if (estado === 'Rechazada')      return 'badge-inactivo';
    if (estado === 'Por Justificar') return 'badge-por-justificar';
    return 'badge-licencia';
  };

  const diasAusencia = (inicio, fin) => {
    if (!inicio || !fin) return '—';
    const diff = (new Date(fin) - new Date(inicio)) / (1000 * 60 * 60 * 24);
    return diff >= 0 ? `${diff + 1} día${diff !== 0 ? 's' : ''}` : '—';
  };

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // ── Registrar inasistencia ────────────────────────────────────────────────
  const openInasistencia = () => {
    setInasistForm(EMPTY_INASISTENCIA);
    setInasistError(null);
    setShowModalInasist(true);
  };
  const closeInasistencia = () => { setShowModalInasist(false); setInasistError(null); };
  const handleInasistChange = (e) => setInasistForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmitInasist = async (e) => {
    e.preventDefault();
    setInasistError(null);
    setSavingInasist(true);
    try {
      await apiFetch('/api/ausencias/supervisor', {
        method: 'POST',
        body: JSON.stringify({
          ...inasistForm,
          id_trabajador: Number(inasistForm.id_trabajador),
        }),
      });
      closeInasistencia();
      fetchData();
    } catch (e) {
      setInasistError(e.message);
    } finally {
      setSavingInasist(false);
    }
  };

  // ── Revisar ───────────────────────────────────────────────────────────────
  const openRevision = (ausencia) => {
    setRevisionData(EMPTY_REVISION);
    setRevisionError(null);
    setRevisionId(ausencia.id_ausencia);
    setShowRevision(true);
  };
  const closeRevision = () => { setShowRevision(false); setRevisionError(null); };
  const handleRevisionChange = (e) => setRevisionData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    setRevisionError(null);
    setSavingRevision(true);
    try {
      await apiFetch(`/api/ausencias/${revisionId}/revisar`, {
        method: 'PUT',
        body: JSON.stringify({
          ...revisionData,
          revisado_por: Number(revisionData.revisado_por),
        }),
      });
      closeRevision();
      fetchData();
    } catch (e) {
      setRevisionError(e.message);
    } finally {
      setSavingRevision(false);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/ausencias/${id}`, { method: 'DELETE' });
      setAusencias((prev) => prev.filter((a) => a.id_ausencia !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          {/* Encabezado */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Ausencias</h1>
              <p className="vista-general-subtitle">Registro de licencias, permisos e inasistencias</p>
            </div>
            <button className="btn-nuevo-trabajador" onClick={openInasistencia}>
              <UserX size={16} /> Registrar Inasistencia
            </button>
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
                    <th>Fecha Inicio</th>
                    <th>Fecha Término</th>
                    <th>Duración</th>
                    <th>Motivo / Justificación</th>
                    <th>Doc.</th>
                    <th>Estado</th>
                    {mostrarColumnaAcciones && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
                    const esPendiente     = a.estado === 'Pendiente';
                    const esPorJustificar = a.estado === 'Por Justificar';
                    return (
                      <tr key={a.id_ausencia}>
                        <td>
                          <div className="tw-name-cell">
                            <div className="tw-avatar">{(nombreTrabajador(idT)[0] ?? '?').toUpperCase()}</div>
                            <div className="tw-fullname">{nombreTrabajador(idT)}</div>
                          </div>
                        </td>
                        <td>{formatFecha(a.fecha_inicio)}</td>
                        <td>{formatFecha(a.fecha_termino)}</td>
                        <td className="aus-duracion">{diasAusencia(a.fecha_inicio, a.fecha_termino)}</td>
                        <td className="aus-motivo">
                          {esPorJustificar
                            ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Esperando justificación del trabajador...</span>
                            : (a.motivo ?? '—')}
                        </td>
                        <td>
                          {a.url_documento
                            ? <a href={`${API_BASE}${a.url_documento}`} target="_blank" rel="noopener noreferrer">📄</a>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td>
                          <span className={`tw-badge ${estadoBadgeClass(a.estado)}`}>{a.estado ?? '—'}</span>
                        </td>
                        {mostrarColumnaAcciones && (
                          <td>
                            <div className="tw-actions">
                              {esPendiente && (
                                <button className="tw-btn-edit" title="Aprobar / Rechazar" onClick={() => openRevision(a)}>
                                  <CheckCircle size={14} />
                                </button>
                              )}
                              {usuario?.tipo_usuario === 'administrador' && esPendiente && (
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

      {/* Modal Registrar Inasistencia */}
      {showModalInasist && (
        <div className="tw-modal-overlay" onClick={closeInasistencia}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Registrar Inasistencia</h2>
              <button className="tw-modal-close" onClick={closeInasistencia}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 24px 14px' }}>
              Usa esta opción cuando detectes una falta no avisada. El trabajador tendrá 24h para justificarla.
            </p>
            {inasistError && <div className="tw-form-error"><AlertCircle size={14} /> {inasistError}</div>}
            <form className="tw-form" onSubmit={handleSubmitInasist}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Trabajador *</label>
                  <select name="id_trabajador" value={inasistForm.id_trabajador} onChange={handleInasistChange} required>
                    <option value="">— Seleccionar trabajador —</option>
                    {trabajadores.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombres} {t.apellidos} — {t.rut}</option>
                    ))}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Fecha Inicio *</label>
                  <input name="fecha_inicio" type="date" value={inasistForm.fecha_inicio} onChange={handleInasistChange} required />
                </div>
                <div className="tw-field">
                  <label>Fecha Término *</label>
                  <input name="fecha_termino" type="date" value={inasistForm.fecha_termino} onChange={handleInasistChange} required />
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

      {/* Modal Revisar */}
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
                  <select name="estado" value={revisionData.estado} onChange={handleRevisionChange} required>
                    <option value="Aprobada">✅ Aprobar</option>
                    <option value="Rechazada">❌ Rechazar</option>
                  </select>
                </div>
                <div className="tw-field tw-field-full">
                  <label>Comentario *</label>
                  <input name="comentario_revision" value={revisionData.comentario_revision} onChange={handleRevisionChange} required
                    placeholder="Ej: Documentación recibida correctamente" />
                </div>
                <div className="tw-field tw-field-full">
                  <label>Revisado por *</label>
                  <select name="revisado_por" value={revisionData.revisado_por} onChange={handleRevisionChange} required>
                    <option value="">— Seleccionar revisor —</option>
                    {trabajadores.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombres} {t.apellidos} — {t.tipo_usuario}</option>
                    ))}
                  </select>
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

      {/* Confirmar eliminación */}
      {confirmDelete !== null && (
        <div className="tw-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Confirmar eliminación</h2>
              <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <p className="tw-confirm-text">¿Estás seguro de que deseas eliminar esta ausencia?</p>
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