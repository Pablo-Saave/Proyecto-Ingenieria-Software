import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  Plus, Search, Trash2, X, Save, AlertCircle, Users, UserPlus,
  HardHat, Shield, ChevronDown, ChevronRight,
} from 'lucide-react';
import {
  crearCuadrilla,
  getAllCuadrillasAndWorkersByIdProyecto,
  agregarSupervisorCuadrilla, //SE DEBE ELIMINAR POR REGLA DE NEGOCIO
  eliminarSupervisorCuadrilla, //SE DEBE ELIMINAR POR REGLA DE NEGOCIO
  agregarTrabajadorCuadrilla,
  eliminarTrabajadorCuadrilla,
} from '../services/cuadrillasService';

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

const EMPTY_CREATE_FORM   = { id_proyecto: '', nombre_cuadrilla: '' };
const EMPTY_OPERARIO_FORM   = { id_trabajador: '', cargo_operativo: '', tipo_jornada: 'Diurna' };

function Asignaciones({ usuario, onLogout }) {
  const [proyectos, setProyectos]           = useState([]);
  const [cuadrillas, setCuadrillas]         = useState([]);
  const [trabajadores, setTrabajadores]     = useState([]);
  const [selectedProject, setSelectedProject] = useState(null); // objeto proyecto completo
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [expandedIds, setExpandedIds]       = useState({}); // cuadrillas expandidas

  // Prevencionista (solo frontend)
  const [prevencionistas, setPrevencionistas] = useState({});
  const [showPrevModal, setShowPrevModal] = useState(false);
  const [tempPrevencionista, setTempPrevencionista] = useState('');
  
  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]           = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError]         = useState(null);
  const [savingCreate, setSavingCreate]       = useState(false);

  const [selectedCuadrillaId, setSelectedCuadrillaId] = useState(null);
  const [showOpModal, setShowOpModal]         = useState(false);
  const [opForm, setOpForm]                   = useState(EMPTY_OPERARIO_FORM);
  const [opError, setOpError]                 = useState(null);
  const [savingOp, setSavingOp]               = useState(false);

  const [confirmDelete, setConfirmDelete]     = useState(null);

  // ── Carga base ────────────────────────────────────────────────────────────
  const fetchBase = async () => {
    try {
      const resP = await apiFetch('/api/proyectos');
      const ps = Array.isArray(resP) ? resP : resP.data ?? [];
      setProyectos(ps);
      await fetchTrabajadoresSinCuadrilla();
      // Seleccionar primer proyecto activo por defecto
      const primero = ps.find((p) => p.estado === 'activo') ?? ps[0];
      if (primero) await selectProject(primero, ps);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBase(); }, []);

  const selectProject = async (proyecto, lista = proyectos) => {
    setSelectedProject(proyecto);
    setLoading(true);
    try {
      const res = await getAllCuadrillasAndWorkersByIdProyecto(proyecto.id_proyecto);
      setCuadrillas(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e.message);
      setCuadrillas([]);
    } finally {
      setLoading(false);
    }
  };

  const reloadCuadrillas = async () => {
    if (!selectedProject) return;
    try {
      const res = await getAllCuadrillasAndWorkersByIdProyecto(selectedProject.id_proyecto);
      setCuadrillas(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchTrabajadoresSinCuadrilla = async () => {
    try {
      const res = await apiFetch("/api/trabajadores/sinCuadrilla");

      setTrabajadores(Array.isArray(res) ? res : res.data ?? []);
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const operarios    = trabajadores.filter((t) => t.tipo_usuario === 'trabajador');

  const filteredCuadrillas = cuadrillas.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    if (c.nombre_cuadrilla?.toLowerCase().includes(q)) return true;
    return (c.integrantes ?? []).some((i) =>
      `${i.nombres} ${i.apellidos}`.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id) =>
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  // Supervisor del proyecto (viene como atributo del proyecto)
  const supervisorProyecto = selectedProject
    ? trabajadores.find((t) => t.id_trabajador === selectedProject.id_supervisor)
    : null;

  // Prevencionista del proyecto
  const prevencionistaProyecto = selectedProject
    ? prevencionistas[selectedProject.id_proyecto] ?? ''
    : '';

  // ── Crear cuadrilla ───────────────────────────────────────────────────────
  const handleCreateCuadrilla = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setSavingCreate(true);
    try {
      await crearCuadrilla({
        id_proyecto: Number(createForm.id_proyecto),
        nombre_cuadrilla: createForm.nombre_cuadrilla,
        estado: 'activa',
      });
      setShowCreateModal(false);
      setCreateForm(EMPTY_CREATE_FORM);
      reloadCuadrillas();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setSavingCreate(false);
    }
  };

  // ── Agregar operario ──────────────────────────────────────────────────────
  const abrirModalOp = (idCuadrilla) => {
    setSelectedCuadrillaId(idCuadrilla);
    setOpForm(EMPTY_OPERARIO_FORM);
    setOpError(null);
    setShowOpModal(true);
  };

  const handleSubmitOp = async (e) => {
    e.preventDefault();
    setOpError(null);
    setSavingOp(true);
    try {
      await agregarTrabajadorCuadrilla(
        Number(opForm.id_trabajador),
        Number(selectedCuadrillaId),
        opForm.cargo_operativo,
        opForm.tipo_jornada,
      );
      setShowOpModal(false);
      await Promise.all([
        reloadCuadrillas(),
        fetchTrabajadoresSinCuadrilla(),
      ]);
    } catch (e) {
      setOpError(e.message);
    } finally {
      setSavingOp(false);
    }
  };

// ── Eliminar integrante y cuadrilla ───────────────────────────────────────────────────
const handleDelete = async () => {
  if (!confirmDelete) return;

  try {
    if (confirmDelete.tipo === "cuadrilla") {
      await apiFetch(`/api/cuadrilla/${confirmDelete.id_cuadrilla}`, {
        method: "DELETE",
      });
    } else {
      await eliminarTrabajadorCuadrilla(confirmDelete.id_trabajador, confirmDelete.id_cuadrilla);
    }

    await Promise.all([
      reloadCuadrillas(),
      fetchTrabajadoresSinCuadrilla(),
    ]);
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

          {/* ── Encabezado ──────────────────────────────────────────────── */}
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Asignaciones</h1>
              <p className="vista-general-subtitle">Gestión de cuadrillas y personal por proyecto</p>
            </div>
            <button
              className="btn-nuevo-trabajador"
              onClick={() => { setCreateForm({ id_proyecto: selectedProject?.id_proyecto ?? '', nombre_cuadrilla: '' }); setCreateError(null); setShowCreateModal(true); }}
              disabled={!selectedProject}
            >
              <Plus size={16} /> Nueva Cuadrilla
            </button>
          </div>

          {/* ── Selector de proyecto ─────────────────────────────────────── */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
              Proyecto
            </label>
            <select
              className="tw-search-input"
              style={{ maxWidth: '360px' }}
              value={selectedProject?.id_proyecto ?? ''}
              onChange={(e) => {
                const p = proyectos.find((pr) => pr.id_proyecto === Number(e.target.value));
                if (p) selectProject(p);
              }}
            >
              <option value="">— Seleccionar proyecto —</option>
              {proyectos.map((p) => (
                <option key={p.id_proyecto} value={p.id_proyecto}>
                  {p.nombre_proyecto} {p.estado !== 'activo' ? `(${p.estado})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ── Tarjeta del proyecto seleccionado ───────────────────────── */}
          {selectedProject && (
            <div className="metric-card" style={{ marginBottom: '24px', padding: '18px 24px', display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Proyecto</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{selectedProject.nombre_proyecto}</p>
                <span className={`tw-badge ${selectedProject.estado === 'activo' ? 'badge-activo' : 'badge-inactivo'}`} style={{ marginTop: '6px', display: 'inline-flex' }}>
                  {selectedProject.estado}
                </span>
              </div>

              {/* Supervisor del proyecto */}
              <div style={{ minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <HardHat size={14} color="#4F46E5" />
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Supervisor</p>
                </div>
                {supervisorProyecto ? (
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {supervisorProyecto.nombres} {supervisorProyecto.apellidos}
                  </p>
                ) : (
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>Sin asignar</p>
                )}
              </div>

            {/* Prevencionista de Riesgos */}
<div style={{ minWidth: '200px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
    <Shield size={14} color="#F59E0B" />
    <p style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', margin: 0 }}>
      Prevencionista de Riesgos
    </p>
  </div>

  {prevencionistaProyecto ? (
    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
      {prevencionistaProyecto}
    </p>
  ) : (
    <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
      Sin asignar
    </p>
  )}

  <button
    type="button"
    className="tw-btn-edit"
    style={{ width: 'auto', padding: '5px 10px', fontSize: '12px', marginTop: '8px' }}
    onClick={() => {
      setTempPrevencionista(prevencionistaProyecto);
      setShowPrevModal(true);
    }}
  >
    {prevencionistaProyecto ? 'Editar' : 'Agregar'}
  </button>
</div>
</div>
          )}

          {/* ── Métricas ────────────────────────────────────────────────── */}
          <div className="metrics-grid" style={{ marginBottom: '20px' }}>
            <div className="metric-card">
              <div className="metric-header"><h3 className="metric-title">Cuadrillas</h3><Users size={20} color="#4F46E5" /></div>
              <div className="metric-value">{cuadrillas.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><h3 className="metric-title">Total Integrantes</h3><UserPlus size={20} color="#10B981" /></div>
              <div className="metric-value" style={{ color: '#10B981' }}>
                {cuadrillas.reduce((acc, c) => acc + (c.integrantes?.length ?? 0), 0)}
              </div>
            </div>
          </div>

          {/* ── Buscador ─────────────────────────────────────────────────── */}
          <div className="tw-toolbar" style={{ marginBottom: '16px' }}>
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input type="text" className="tw-search-input" placeholder="Buscar cuadrilla o integrante..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {/* ── Lista de cuadrillas ──────────────────────────────────────── */}
          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando cuadrillas...</div>
          ) : !selectedProject ? (
            <div className="tw-empty"><Users size={40} /><p>Selecciona un proyecto para ver sus cuadrillas</p></div>
          ) : filteredCuadrillas.length === 0 ? (
            <div className="tw-empty" style={{ gap: '10px' }}>
              <Users size={40} />
              <p>No hay cuadrillas en este proyecto</p>
              <button
                className="btn-nuevo-trabajador"
                onClick={() => { setCreateForm({ id_proyecto: selectedProject?.id_proyecto ?? '', nombre_cuadrilla: '' }); setCreateError(null); setShowCreateModal(true); }}
              >
                <Plus size={16} /> Crear cuadrilla
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredCuadrillas.map((c) => {
                const expanded   = !!expandedIds[c.id_cuadrilla];
                const integrantes = c.integrantes ?? [];

                return (
                  <div key={c.id_cuadrilla} className="tw-table-card" style={{ overflow: 'hidden' }}>

                    {/* Encabezado cuadrilla */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#f9fafb', cursor: 'pointer', borderBottom: expanded ? '1px solid #e5e7eb' : 'none' }}
                      onClick={() => toggleExpand(c.id_cuadrilla)}
                    >
                      {expanded ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{c.nombre_cuadrilla}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {integrantes.length} integrante{integrantes.length !== 1 ? 's' : ''} · {c.estado}
                        </div>
                      </div>
                      <span className={`tw-badge ${c.estado === 'activa' ? 'badge-activo' : 'badge-inactivo'}`} style={{ fontSize: '11px' }}>
                        {c.estado}
                      </span>
                      {/* Botones — detener propagación del click de expandir */}
                      <button
                        className="tw-btn-edit"
                        title="Agregar trabajador"
                        onClick={(e) => { e.stopPropagation(); abrirModalOp(c.id_cuadrilla); }}
                        style={{ width: 'auto', padding: '5px 10px', gap: '5px', display: 'flex', alignItems: 'center', fontSize: '12px' }}
                      >
                        <UserPlus size={13} /> Trabajador
                      </button>
                      <button
                        type="button"
                        className="tw-btn-delete"
                        title="Eliminar cuadrilla"
                        onClick={(e) => {e.stopPropagation();setConfirmDelete({tipo: "cuadrilla",id_cuadrilla: c.id_cuadrilla,nombre: c.nombre_cuadrilla,});}}
                      >
                        <Trash2 size={13} />
                        Eliminar
                      </button>
                    </div>

                    {/* Integrantes expandidos */}
                    {expanded && (
                      <div>
                        {integrantes.length === 0 ? (
                          <div style={{ padding: '14px 48px', fontSize: '13px', color: '#9ca3af' }}>
                            Esta cuadrilla no tiene integrantes aún.
                          </div>
                        ) : (
                          <>
                            {/* Trabajadores */}
                            {integrantes.map((i) => (
                              <div key={i.id_trabajador} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px 10px 36px', borderBottom: '1px solid #f3f4f6' }}>
                                <div className="tw-avatar" style={{ width: '26px', height: '26px', fontSize: '10px' }}>
                                  {(i.nombres?.[0] ?? '?').toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{i.nombres} {i.apellidos}</div>
                                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{i.cargo_operativo} · {i.tipo_jornada}</div>
                                </div>
                                <button
                                  className="tw-btn-delete"
                                  onClick={() => setConfirmDelete({ tipo: 'trabajador', id_trabajador: i.id_trabajador, id_cuadrilla: c.id_cuadrilla })}
                                ><Trash2 size={12} /></button>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Nueva Cuadrilla ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="tw-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Nueva Cuadrilla</h2>
              <button className="tw-modal-close" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            {createError && <div className="tw-form-error"><AlertCircle size={14} /> {createError}</div>}
            <form className="tw-form" onSubmit={handleCreateCuadrilla}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Proyecto *</label>
                  <select value={createForm.id_proyecto} onChange={(e) => setCreateForm((p) => ({ ...p, id_proyecto: e.target.value }))} required>
                    <option value="">— Seleccionar proyecto —</option>
                    {proyectos.map((p) => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre_proyecto}</option>)}
                  </select>
                </div>
                <div className="tw-field tw-field-full">
                  <label>Nombre de la Cuadrilla *</label>
                  <input value={createForm.nombre_cuadrilla} onChange={(e) => setCreateForm((p) => ({ ...p, nombre_cuadrilla: e.target.value }))} required placeholder="Ej: Hospital Regional — Cuadrilla 1" />
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={savingCreate}>
                  <Save size={14} /> {savingCreate ? 'Creando...' : 'Crear Cuadrilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Prevencionista ─────────────────────────────────────────── */}
{showPrevModal && (
  <div className="tw-modal-overlay" onClick={() => setShowPrevModal(false)}>
    <div className="tw-modal" onClick={(e) => e.stopPropagation()}>

      <div className="tw-modal-header">
        <h2>Prevencionista de Riesgos</h2>
        <button className="tw-modal-close" onClick={() => setShowPrevModal(false)}>
          <X size={18} />
        </button>
      </div>

      <form
        className="tw-form"
        onSubmit={(e) => {
          e.preventDefault();
          setPrevencionistas((prev) => ({
            ...prev,
            [selectedProject.id_proyecto]: tempPrevencionista
          }));
          setShowPrevModal(false);
        }}
      >

        <div className="tw-field tw-field-full">
          <label>Nombre</label>
          <input
            type="text"
            value={tempPrevencionista}
            onChange={(e) => setTempPrevencionista(e.target.value)}
          />
        </div>

        <div className="tw-modal-footer">
          <button type="button" onClick={() => setShowPrevModal(false)}>
            Cancelar
          </button>

          <button type="submit">
            Guardar
          </button>
        </div>

      </form>
    </div>
  </div>
)}

      {/* ── Modal Agregar Trabajador ──────────────────────────────────────── */}
      {showOpModal && (
        <div className="tw-modal-overlay" onClick={() => setShowOpModal(false)}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Agregar Trabajador a Cuadrilla</h2>
              <button className="tw-modal-close" onClick={() => setShowOpModal(false)}><X size={18} /></button>
            </div>
            {opError && <div className="tw-form-error"><AlertCircle size={14} /> {opError}</div>}
            <form className="tw-form" onSubmit={handleSubmitOp}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Trabajador *</label>
                  <select value={opForm.id_trabajador} onChange={(e) => setOpForm((p) => ({ ...p, id_trabajador: e.target.value }))} required>
                    <option value="">— Seleccionar trabajador —</option>
                    {operarios.map((t) => <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombres} {t.apellidos} — {t.rut}</option>)}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Cargo Operativo *</label>
                  <input value={opForm.cargo_operativo} onChange={(e) => setOpForm((p) => ({ ...p, cargo_operativo: e.target.value }))} required placeholder="Ej: Operario de Aseo" />
                </div>
                <div className="tw-field">
                  <label>Tipo de Jornada *</label>
                  <select value={opForm.tipo_jornada} onChange={(e) => setOpForm((p) => ({ ...p, tipo_jornada: e.target.value }))}>
                    {JORNADAS.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowOpModal(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={savingOp}>
                  <Save size={14} /> {savingOp ? 'Guardando...' : 'Agregar Trabajador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* ── Confirmar eliminación / inactivación ───────────────────────────────── */}
{confirmDelete && (
  <div className="tw-modal-overlay" onClick={() => setConfirmDelete(null)}>
    <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
      <div className="tw-modal-header">
        <h2>
          {confirmDelete.tipo === "cuadrilla"
            ? "Confirmar inactivación"
            : "Confirmar eliminación"}
        </h2>

        <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}>
          <X size={18} />
        </button>
      </div>

      <p className="tw-confirm-text">
        {confirmDelete.tipo === "cuadrilla"
          ? `¿Deseas eliminar la cuadrilla "${confirmDelete.nombre}"? Esta acción eliminará todos sus registros asociados.`
          : "¿Deseas quitar este integrante de la cuadrilla? Esta acción no se puede deshacer."}
      </p>

      <div className="tw-modal-footer">
        <button className="tw-btn-cancel" onClick={() => setConfirmDelete(null)}>
          Cancelar
        </button>

        <button className="tw-btn-delete-confirm" onClick={handleDelete}>
          <Trash2 size={14} />
          {confirmDelete.tipo === "cuadrilla" ? "Inactivar" : "Eliminar"}
        </button>
      </div>
    </div>
  </div>
  )}
  </div>
  );
  };

export default Asignaciones;