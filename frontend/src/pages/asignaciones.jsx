import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  Plus, Search, Trash2, X, Save, AlertCircle, Users, Briefcase,
  UserCheck, ChevronDown, ChevronUp, UserPlus,
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

const JORNADAS = ['Diurna', 'Nocturna', 'Mixta'];

const EMPTY_SUPERVISOR_FORM = {
  id_trabajador: '',
  cargo_operativo: 'Supervisor de Cuadrilla',
  tipo_jornada: 'Diurna',
  fecha_asignacion: new Date().toISOString().slice(0, 10),
};

const EMPTY_OPERARIO_FORM = {
  id_trabajador: '',
  cargo_operativo: '',
  tipo_jornada: 'Diurna',
  fecha_asignacion: new Date().toISOString().slice(0, 10),
};

function Asignaciones({ usuario, onLogout }) {
  const [asignaciones, setAsignaciones]   = useState([]);
  const [trabajadores, setTrabajadores]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Modal supervisor
  const [showModalSup, setShowModalSup]   = useState(false);
  const [supForm, setSupForm]             = useState(EMPTY_SUPERVISOR_FORM);
  const [supError, setSupError]           = useState(null);
  const [savingSup, setSavingSup]         = useState(false);

  // Modal agregar operario a supervisor existente
  const [showModalOp, setShowModalOp]     = useState(false);
  const [opForm, setOpForm]               = useState(EMPTY_OPERARIO_FORM);
  const [opError, setOpError]             = useState(null);
  const [savingOp, setSavingOp]           = useState(false);

  // Cuadrilla expandida en tabla
  const [expandedSup, setExpandedSup]     = useState(null);

  // ── Carga ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resA, resT] = await Promise.all([
        apiFetch('/api/asignados'),
        apiFetch('/api/trabajadores'),
      ]);
      setAsignaciones(Array.isArray(resA) ? resA : resA.data ?? []);
      setTrabajadores(Array.isArray(resT) ? resT : resT.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getTrabajador = (id) =>
    trabajadores.find((t) => t.id_trabajador === (id?.id_trabajador ?? id));

  const nombreT = (id) => {
    const t = getTrabajador(id);
    return t ? `${t.nombres} ${t.apellidos}` : `ID ${id}`;
  };

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const supervisores  = trabajadores.filter((t) => t.tipo_usuario === 'supervisor');
  const operarios     = trabajadores.filter((t) => t.tipo_usuario === 'trabajador');

  // Agrupar asignaciones: supervisores primero, con sus operarios anidados
  const asignacionesSup = asignaciones.filter((a) => {
    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
    const t = getTrabajador(idT);
    return t?.tipo_usuario === 'supervisor' && !a.fecha_retiro;
  });

  const asignacionesOp = asignaciones.filter((a) => {
    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
    const t = getTrabajador(idT);
    return t?.tipo_usuario === 'trabajador' && !a.fecha_retiro;
  });

  // Asignaciones filtradas por búsqueda
  const filtered = asignaciones.filter((a) => {
    const q   = searchQuery.toLowerCase();
    const idT = a.trabajador?.id_trabajador ?? a.id_trabajador;
    return !q || nombreT(idT).toLowerCase().includes(q) || a.cargo_operativo?.toLowerCase().includes(q);
  });

  // Métricas
  const activas    = asignaciones.filter((a) => !a.fecha_retiro).length;
  const nSups      = asignacionesSup.length;
  const nOps       = asignacionesOp.length;

  // ── Guardar supervisor ────────────────────────────────────────────────────
  const handleSubmitSup = async (e) => {
    e.preventDefault();
    setSupError(null);
    setSavingSup(true);
    try {
      await apiFetch('/api/asignados', {
        method: 'POST',
        body: JSON.stringify({
          ...supForm,
          id_trabajador: Number(supForm.id_trabajador),
          fecha_retiro: null,
        }),
      });
      setShowModalSup(false);
      setSupForm(EMPTY_SUPERVISOR_FORM);
      fetchData();
    } catch (e) {
      setSupError(e.message);
    } finally {
      setSavingSup(false);
    }
  };

  // ── Agregar operario a cuadrilla ──────────────────────────────────────────
  const abrirModalOperario = (idSup) => {
    setOpForm({ ...EMPTY_OPERARIO_FORM });
    setOpError(null);
    setShowModalOp(idSup); // guardamos el id del supervisor como referencia visual
  };

  const handleSubmitOp = async (e) => {
    e.preventDefault();
    setOpError(null);
    setSavingOp(true);
    try {
      await apiFetch('/api/asignados', {
        method: 'POST',
        body: JSON.stringify({
          ...opForm,
          id_trabajador: Number(opForm.id_trabajador),
          fecha_retiro: null,
        }),
      });
      setShowModalOp(false);
      setOpForm(EMPTY_OPERARIO_FORM);
      fetchData();
    } catch (e) {
      setOpError(e.message);
    } finally {
      setSavingOp(false);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/asignados/${id}`, { method: 'DELETE' });
      setAsignaciones((prev) => prev.filter((a) => a.id_asignado !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Asignaciones</h1>
              <p className="vista-general-subtitle">Gestión de cuadrillas y asignación de personal</p>
            </div>
            <button className="btn-nuevo-trabajador" onClick={() => { setSupForm(EMPTY_SUPERVISOR_FORM); setSupError(null); setShowModalSup(true); }}>
              <Plus size={16} /> Nueva Cuadrilla
            </button>
          </div>

          {/* Métricas */}
          <div className="metrics-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-header"><h3 className="metric-title">Asignaciones Activas</h3><Users size={20} color="#4F46E5" /></div>
              <div className="metric-value">{activas}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><h3 className="metric-title">Supervisores</h3><UserCheck size={20} color="#10B981" /></div>
              <div className="metric-value" style={{ color: '#10B981' }}>{nSups}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><h3 className="metric-title">Operarios</h3><Briefcase size={20} color="#F59E0B" /></div>
              <div className="metric-value" style={{ color: '#F59E0B' }}>{nOps}</div>
            </div>
          </div>

          {/* Buscador */}
          <div className="tw-toolbar">
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input type="text" className="tw-search-input" placeholder="Buscar por nombre o cargo..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {/* Vista de cuadrillas — supervisores con operarios anidados */}
          {!searchQuery ? (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading ? (
                <div className="tw-loading"><div className="tw-spinner" /> Cargando...</div>
              ) : asignacionesSup.length === 0 ? (
                <div className="tw-empty"><Users size={40} /><p>No hay cuadrillas activas</p></div>
              ) : (
                asignacionesSup.map((supAsig) => {
                  const idSup      = supAsig.trabajador?.id_trabajador ?? supAsig.id_trabajador;
                  const expanded   = expandedSup === supAsig.id_asignado;
                  const miembros   = asignacionesOp; // en un sistema real filtrarías por cuadrilla/proyecto
                  return (
                    <div key={supAsig.id_asignado} className="tw-table-card" style={{ overflow: 'hidden' }}>
                      {/* Fila supervisor */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '14px 16px', background: '#f9fafb',
                        borderBottom: expanded ? '1px solid #e5e7eb' : 'none',
                      }}>
                        <div className="tw-avatar" style={{ background: '#d1fae5', color: '#065f46' }}>
                          {(nombreT(idSup)[0] ?? 'S').toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{nombreT(idSup)}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {supAsig.cargo_operativo} · {supAsig.tipo_jornada} · desde {formatFecha(supAsig.fecha_asignacion)}
                          </div>
                        </div>
                        <span className="tw-badge badge-activo" style={{ fontSize: '11px' }}>Supervisor</span>
                        <button
                          className="tw-btn-edit"
                          title="Agregar operario a esta cuadrilla"
                          onClick={() => abrirModalOperario(supAsig.id_asignado)}
                          style={{ width: 'auto', padding: '6px 12px', gap: '6px', display: 'flex', alignItems: 'center', fontSize: '12px' }}
                        >
                          <UserPlus size={13} /> Agregar
                        </button>
                        <button
                          className="tw-btn-delete"
                          title="Eliminar asignación de supervisor"
                          onClick={() => setConfirmDelete(supAsig.id_asignado)}
                        ><Trash2 size={14} /></button>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                          onClick={() => setExpandedSup(expanded ? null : supAsig.id_asignado)}
                        >
                          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {/* Operarios de la cuadrilla */}
                      {expanded && (
                        <div>
                          {miembros.length === 0 ? (
                            <div style={{ padding: '14px 16px 14px 52px', fontSize: '13px', color: '#9ca3af' }}>
                              No hay operarios asignados a esta cuadrilla.
                            </div>
                          ) : (
                            miembros.map((opAsig) => {
                              const idOp = opAsig.trabajador?.id_trabajador ?? opAsig.id_trabajador;
                              return (
                                <div key={opAsig.id_asignado} style={{
                                  display: 'flex', alignItems: 'center', gap: '12px',
                                  padding: '10px 16px 10px 52px',
                                  borderBottom: '1px solid #f3f4f6',
                                }}>
                                  <div className="tw-avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                                    {(nombreT(idOp)[0] ?? '?').toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{nombreT(idOp)}</div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                      {opAsig.cargo_operativo} · {opAsig.tipo_jornada}
                                    </div>
                                  </div>
                                  <button className="tw-btn-delete" onClick={() => setConfirmDelete(opAsig.id_asignado)}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Vista tabla cuando hay búsqueda activa */
            <div className="tw-table-card" style={{ marginTop: '16px' }}>
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>Trabajador</th><th>Rol</th><th>Cargo</th>
                    <th>Jornada</th><th>Desde</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const idT  = a.trabajador?.id_trabajador ?? a.id_trabajador;
                    const tipo = getTrabajador(idT)?.tipo_usuario ?? '—';
                    return (
                      <tr key={a.id_asignado}>
                        <td>
                          <div className="tw-name-cell">
                            <div className="tw-avatar">{(nombreT(idT)[0] ?? '?').toUpperCase()}</div>
                            <div className="tw-fullname">{nombreT(idT)}</div>
                          </div>
                        </td>
                        <td><span className={`tw-badge ${tipo === 'supervisor' ? 'badge-activo' : 'badge-licencia'}`}>{tipo}</span></td>
                        <td>{a.cargo_operativo ?? '—'}</td>
                        <td>{a.tipo_jornada ?? '—'}</td>
                        <td>{formatFecha(a.fecha_asignacion)}</td>
                        <td><span className={`tw-badge ${!a.fecha_retiro ? 'badge-activo' : 'badge-inactivo'}`}>{!a.fecha_retiro ? 'Activa' : 'Finalizada'}</span></td>
                        <td>
                          <button className="tw-btn-delete" onClick={() => setConfirmDelete(a.id_asignado)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Cuadrilla (supervisor) */}
      {showModalSup && (
        <div className="tw-modal-overlay" onClick={() => setShowModalSup(false)}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Nueva Cuadrilla</h2>
              <button className="tw-modal-close" onClick={() => setShowModalSup(false)}><X size={18} /></button>
            </div>
            {supError && <div className="tw-form-error"><AlertCircle size={14} /> {supError}</div>}
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 24px 12px' }}>
              Selecciona el supervisor a cargo. Luego podrás añadir operarios desde la tabla.
            </p>
            <form className="tw-form" onSubmit={handleSubmitSup}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Supervisor *</label>
                  <select name="id_trabajador" value={supForm.id_trabajador}
                    onChange={(e) => setSupForm((p) => ({ ...p, id_trabajador: e.target.value }))} required>
                    <option value="">— Seleccionar supervisor —</option>
                    {supervisores.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>
                        {t.nombres} {t.apellidos} — {t.rut}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Cargo Operativo *</label>
                  <input name="cargo_operativo" value={supForm.cargo_operativo}
                    onChange={(e) => setSupForm((p) => ({ ...p, cargo_operativo: e.target.value }))} required />
                </div>
                <div className="tw-field">
                  <label>Tipo de Jornada *</label>
                  <select name="tipo_jornada" value={supForm.tipo_jornada}
                    onChange={(e) => setSupForm((p) => ({ ...p, tipo_jornada: e.target.value }))}>
                    {JORNADAS.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="tw-field tw-field-full">
                  <label>Fecha de Asignación *</label>
                  <input type="date" value={supForm.fecha_asignacion}
                    onChange={(e) => setSupForm((p) => ({ ...p, fecha_asignacion: e.target.value }))} required />
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowModalSup(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={savingSup}>
                  <Save size={14} /> {savingSup ? 'Guardando...' : 'Crear Cuadrilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Operario */}
      {showModalOp && (
        <div className="tw-modal-overlay" onClick={() => setShowModalOp(false)}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Agregar Operario a Cuadrilla</h2>
              <button className="tw-modal-close" onClick={() => setShowModalOp(false)}><X size={18} /></button>
            </div>
            {opError && <div className="tw-form-error"><AlertCircle size={14} /> {opError}</div>}
            <form className="tw-form" onSubmit={handleSubmitOp}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Trabajador *</label>
                  <select value={opForm.id_trabajador}
                    onChange={(e) => setOpForm((p) => ({ ...p, id_trabajador: e.target.value }))} required>
                    <option value="">— Seleccionar trabajador —</option>
                    {operarios.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>
                        {t.nombres} {t.apellidos} — {t.rut}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Cargo Operativo *</label>
                  <input value={opForm.cargo_operativo} placeholder="Ej: Operario de Aseo"
                    onChange={(e) => setOpForm((p) => ({ ...p, cargo_operativo: e.target.value }))} required />
                </div>
                <div className="tw-field">
                  <label>Tipo de Jornada *</label>
                  <select value={opForm.tipo_jornada}
                    onChange={(e) => setOpForm((p) => ({ ...p, tipo_jornada: e.target.value }))}>
                    {JORNADAS.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="tw-field tw-field-full">
                  <label>Fecha de Asignación *</label>
                  <input type="date" value={opForm.fecha_asignacion}
                    onChange={(e) => setOpForm((p) => ({ ...p, fecha_asignacion: e.target.value }))} required />
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowModalOp(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={savingOp}>
                  <Save size={14} /> {savingOp ? 'Guardando...' : 'Agregar Operario'}
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
            <p className="tw-confirm-text">¿Estás seguro de que deseas eliminar esta asignación?</p>
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

export default Asignaciones;