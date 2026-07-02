import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import '../styles/contratos.css';
import '../styles/asignaciones.css';
import {
  Plus, Search, Trash2, X, Save, AlertCircle, Users, UserPlus,
  HardHat, Shield, MoreVertical, ChevronDown, ChevronRight,
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
const POR_PAGINA = 10;

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
const EMPTY_OPERARIO_FORM = { id_cuadrilla: '', id_trabajador: '', cargo_operativo: '', tipo_jornada: 'Diurna' };

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInicialesCuadrilla(nombre = '') {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return ((partes[0]?.[0] ?? '') + (partes[0]?.[1] ?? '')).toUpperCase();
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

function getInicialesTrabajador(nombres = '', apellidos = '') {
  return ((nombres.trim()[0] || '') + (apellidos.trim()[0] || '')).toUpperCase();
}

function getEstadoClass(estado) {
  return estado === 'activa' ? 'estado-activo' : 'estado-inactivo';
}

function Asignaciones({ usuario, onLogout }) {
  const [proyectos, setProyectos]             = useState([]);
  const [cuadrillas, setCuadrillas]           = useState([]);
  const [trabajadores, setTrabajadores]       = useState([]);
  const [selectedProject, setSelectedProject] = useState(null); // objeto proyecto completo
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [pagina, setPagina]                   = useState(1);
  const [menuAbierto, setMenuAbierto]         = useState(null);
  const [expandedIds, setExpandedIds]         = useState({}); // cuadrillas expandidas

  // Prevencionista (solo frontend)
  const [prevencionistas, setPrevencionistas] = useState({});
  const [showPrevModal, setShowPrevModal]     = useState(false);
  const [tempPrevencionista, setTempPrevencionista] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]           = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError]         = useState(null);
  const [savingCreate, setSavingCreate]       = useState(false);

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
    setPagina(1);
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
      const res = await apiFetch('/api/trabajadores/sinCuadrilla');
      setTrabajadores(Array.isArray(res) ? res : res.data ?? []);
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Helpers de datos ─────────────────────────────────────────────────────
  const operarios = trabajadores.filter((t) => t.tipo_usuario === 'trabajador');

  const q = searchQuery.trim().toLowerCase();

  // Agrupa por cuadrilla. Si hay búsqueda: se mantiene la cuadrilla si su nombre
  // matchea (mostrando todos sus integrantes) o si alguno de sus integrantes matchea
  // (mostrando solo los que matchean).
  const cuadrillasFiltradas = cuadrillas
    .map((c) => {
      const integrantes = c.integrantes ?? [];
      if (!q) return { ...c, integrantes, _tieneMatch: false };
      const nombreMatch = c.nombre_cuadrilla?.toLowerCase().includes(q);
      const integrantesMatch = integrantes.filter((i) =>
        `${i.nombres} ${i.apellidos}`.toLowerCase().includes(q)
      );
      if (nombreMatch) return { ...c, integrantes, _tieneMatch: true };
      if (integrantesMatch.length > 0) return { ...c, integrantes: integrantesMatch, _tieneMatch: true };
      return { ...c, integrantes: [], _tieneMatch: false };
    })
    .filter((c) => !q || c._tieneMatch);

  const isExpanded = (idCuadrilla) => (q ? true : !!expandedIds[idCuadrilla]);
  const toggleExpand = (idCuadrilla) => setExpandedIds((prev) => ({ ...prev, [idCuadrilla]: !prev[idCuadrilla] }));

  const totalAsignaciones = cuadrillasFiltradas.reduce((acc, c) => acc + (c.integrantes?.length ?? 0), 0);

  const totalPaginas        = Math.max(1, Math.ceil(cuadrillasFiltradas.length / POR_PAGINA));
  const paginaActual        = Math.min(pagina, totalPaginas);
  const cuadrillasVisibles  = cuadrillasFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  // Supervisor del proyecto (viene como atributo del proyecto)
  const supervisorProyecto = selectedProject
    ? trabajadores.find((t) => t.id_trabajador === selectedProject.id_supervisor)
    : null;

  // Prevencionista del proyecto
  const prevencionistaProyecto = selectedProject
    ? prevencionistas[selectedProject.id_proyecto] ?? ''
    : '';

  // ── Crear cuadrilla ───────────────────────────────────────────────────────
  const abrirModalCrearCuadrilla = () => {
    setCreateForm({ id_proyecto: selectedProject?.id_proyecto ?? '', nombre_cuadrilla: '' });
    setCreateError(null);
    setShowCreateModal(true);
  };

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

  // ── Nueva Asignación (agregar trabajador a cuadrilla) ───────────────────
  const abrirModalOp = (idCuadrilla = null) => {
    setOpForm({ ...EMPTY_OPERARIO_FORM, id_cuadrilla: idCuadrilla ?? '' });
    setOpError(null);
    setShowOpModal(true);
  };

  const handleNuevaAsignacionClick = () => {
    if (!selectedProject) return;
    if (cuadrillas.length === 0) {
      abrirModalCrearCuadrilla();
    } else {
      abrirModalOp(null);
    }
  };

  const handleSubmitOp = async (e) => {
    e.preventDefault();
    setOpError(null);
    setSavingOp(true);
    try {
      await agregarTrabajadorCuadrilla(
        Number(opForm.id_trabajador),
        Number(opForm.id_cuadrilla),
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

  // ── Eliminar integrante / cuadrilla ─────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.tipo === 'cuadrilla') {
        await apiFetch(`/api/cuadrilla/${confirmDelete.id_cuadrilla}`, { method: 'DELETE' });
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
          <div className="asignaciones-container">

            {/* ── Encabezado ──────────────────────────────────────────── */}
            <div className="asignaciones-header">
              <div>
                <h1 className="vista-general-title">Asignaciones</h1>
                <p className="vista-general-subtitle">Gestiona las asignaciones de cuadrillas y trabajadores a proyectos.</p>
              </div>
              <button
                className="btn-nueva-asignacion"
                onClick={handleNuevaAsignacionClick}
                disabled={!selectedProject}
              >
                <Plus size={16} /> Nueva Asignación
              </button>
            </div>

            {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}

            {/* ── Selector de proyecto ────────────────────────────────── */}
            <div className="asig-project-select-wrap">
              <label>Proyecto</label>
              <select
                className="asig-project-select"
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

            {/* ── Tarjeta del proyecto seleccionado ───────────────────── */}
            {selectedProject && (
              <div className="asig-info-card">
                <div className="asig-info-block">
                  <p className="asig-info-label">Proyecto</p>
                  <p className="asig-info-name">{selectedProject.nombre_proyecto}</p>
                  <span className={`estado-badge ${getEstadoClass(selectedProject.estado === 'activo' ? 'activa' : 'inactiva')}`}>
                    {selectedProject.estado}
                  </span>
                </div>

                <div className="asig-info-block">
                  <p className="asig-info-label"><HardHat size={14} color="#4466ff" /> Supervisor</p>
                  {supervisorProyecto ? (
                    <p className="asig-info-value">{supervisorProyecto.nombres} {supervisorProyecto.apellidos}</p>
                  ) : (
                    <p className="asig-info-empty">Sin asignar</p>
                  )}
                </div>

                <div className="asig-info-block">
                  <p className="asig-info-label"><Shield size={14} color="#F59E0B" /> Prevencionista de Riesgos</p>
                  {prevencionistaProyecto ? (
                    <p className="asig-info-value">{prevencionistaProyecto}</p>
                  ) : (
                    <p className="asig-info-empty">Sin asignar</p>
                  )}
                  <button
                    type="button"
                    className="asig-info-link"
                    onClick={() => { setTempPrevencionista(prevencionistaProyecto); setShowPrevModal(true); }}
                  >
                    {prevencionistaProyecto ? 'Editar prevencionista' : 'Asignar prevencionista'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Buscador ─────────────────────────────────────────────── */}
            <div className="search-box asig-search-wrap">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Buscar asignación, cuadrilla o trabajador..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPagina(1); }}
              />
            </div>

            {/* ── Contador + acción secundaria ────────────────────────── */}
            <div className="asig-toolbar-row">
              <p className="asig-count">
                {totalAsignaciones} asignación{totalAsignaciones !== 1 ? 'es' : ''} · {cuadrillasFiltradas.length} cuadrilla{cuadrillasFiltradas.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                className="asig-btn-ghost"
                onClick={abrirModalCrearCuadrilla}
                disabled={!selectedProject}
              >
                <Users size={14} /> Nueva cuadrilla
              </button>
            </div>

            {/* ── Tabla ────────────────────────────────────────────────── */}
            {loading ? (
              <div className="asig-loading"><div className="tw-spinner" /> Cargando asignaciones...</div>
            ) : !selectedProject ? (
              <div className="asig-empty-state">
                <Users size={40} />
                <p>Selecciona un proyecto para ver sus asignaciones</p>
              </div>
            ) : cuadrillasFiltradas.length === 0 ? (
              <div className="asig-empty-state">
                <Users size={40} />
                <p>No hay asignaciones en este proyecto</p>
                <button className="btn-nueva-asignacion" onClick={handleNuevaAsignacionClick} style={{ marginTop: '6px' }}>
                  <Plus size={16} /> Nueva Asignación
                </button>
              </div>
            ) : (
              <>
                <div className="asig-table-wrapper">
                  <table className="asig-table">
                    <thead>
                      <tr>
                        <th>CUADRILLA</th>
                        <th>TRABAJADOR</th>
                        <th>FECHA ASIGNACIÓN</th>
                        <th>ESTADO</th>
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuadrillasVisibles.map((c) => {
                        const expanded    = isExpanded(c.id_cuadrilla);
                        const integrantes = c.integrantes ?? [];
                        return (
                          <React.Fragment key={c.id_cuadrilla}>
                            {/* ── Fila de la cuadrilla ─────────────────────── */}
                            <tr className="asig-row-cuadrilla" onClick={() => toggleExpand(c.id_cuadrilla)}>
                              <td>
                                <div className="asig-cell-cuadrilla">
                                  {expanded ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                                  <div className="asig-avatar asig-avatar-cuadrilla">
                                    {getInicialesCuadrilla(c.nombre_cuadrilla)}
                                  </div>
                                  <div>
                                    <div className="asig-cell-title">{c.nombre_cuadrilla}</div>
                                    <div className="asig-cell-sub">
                                      {integrantes.length} trabajador{integrantes.length !== 1 ? 'es' : ''}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="asig-empty-cell">—</td>
                              <td className="asig-empty-cell">—</td>
                              <td>
                                <span className={`estado-badge ${getEstadoClass(c.estado)}`}>
                                  {c.estado === 'activa' ? 'Activa' : 'Inactiva'}
                                </span>
                              </td>
                              <td className="col-acciones" style={{ position: 'relative' }}>
                                <button
                                  className="btn-accion"
                                  title="Agregar trabajador"
                                  onClick={(e) => { e.stopPropagation(); abrirModalOp(c.id_cuadrilla); }}
                                >
                                  <UserPlus size={16} />
                                </button>
                                <button
                                  className="btn-accion"
                                  title="Más opciones"
                                  onClick={(e) => { e.stopPropagation(); setMenuAbierto(menuAbierto === c.id_cuadrilla ? null : c.id_cuadrilla); }}
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {menuAbierto === c.id_cuadrilla && (
                                  <div className="context-menu" onMouseLeave={() => setMenuAbierto(null)}>
                                    <button onClick={(e) => { e.stopPropagation(); abrirModalOp(c.id_cuadrilla); setMenuAbierto(null); }}>
                                      Agregar trabajador
                                    </button>
                                    <button
                                      className="ctx-danger"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDelete({ tipo: 'cuadrilla', id_cuadrilla: c.id_cuadrilla, nombre: c.nombre_cuadrilla });
                                        setMenuAbierto(null);
                                      }}
                                    >
                                      Eliminar cuadrilla
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>

                            {/* ── Filas de integrantes (solo si expandida) ─── */}
                            {expanded && integrantes.length === 0 && (
                              <tr className="asig-row-trabajador">
                                <td></td>
                                <td colSpan={4} className="asig-empty-cell">Esta cuadrilla no tiene integrantes aún.</td>
                              </tr>
                            )}
                            {expanded && integrantes.map((i) => (
                              <tr key={i.id_trabajador} className="asig-row-trabajador">
                                <td></td>
                                <td>
                                  <div className="asig-cell-trabajador">
                                    <div className="asig-avatar asig-avatar-trabajador">
                                      {getInicialesTrabajador(i.nombres ?? '', i.apellidos ?? '')}
                                    </div>
                                    <div>
                                      <div className="asig-cell-title">{i.nombres} {i.apellidos}</div>
                                      <div className="asig-cell-sub">{i.rut ?? '—'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>{formatFecha(i.fecha_asignacion)}</td>
                                <td></td>
                                <td className="col-acciones">
                                  <button
                                    className="btn-accion"
                                    title="Quitar trabajador"
                                    onClick={() => setConfirmDelete({
                                      tipo: 'trabajador',
                                      id_trabajador: i.id_trabajador,
                                      id_cuadrilla: c.id_cuadrilla,
                                    })}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Paginación ──────────────────────────────────────── */}
                <div className="pagination">
                  <span className="pagination-info">
                    Mostrando {cuadrillasFiltradas.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1} a{' '}
                    {Math.min(paginaActual * POR_PAGINA, cuadrillasFiltradas.length)} de {cuadrillasFiltradas.length} cuadrilla
                    {cuadrillasFiltradas.length !== 1 ? 's' : ''}.
                  </span>
                  <div className="pagination-controls">
                    <button className="btn-pagina prev" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1}>‹</button>
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                      <button key={n} className={`btn-pagina ${n === paginaActual ? 'active' : ''}`} onClick={() => setPagina(n)}>{n}</button>
                    ))}
                    <button className="btn-pagina next" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>›</button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* ── Modal Nueva Cuadrilla ─────────────────────────────────────── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Cuadrilla</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCuadrilla}>
              <div className="modal-body">
                {createError && <div className="modal-error"><AlertCircle size={14} /> {createError}</div>}
                <label>Proyecto *</label>
                <select value={createForm.id_proyecto} onChange={(e) => setCreateForm((p) => ({ ...p, id_proyecto: e.target.value }))} required>
                  <option value="">— Seleccionar proyecto —</option>
                  {proyectos.map((p) => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre_proyecto}</option>)}
                </select>
                <label>Nombre de la Cuadrilla *</label>
                <input
                  value={createForm.nombre_cuadrilla}
                  onChange={(e) => setCreateForm((p) => ({ ...p, nombre_cuadrilla: e.target.value }))}
                  required
                  placeholder="Ej: Hospital Regional — Cuadrilla 1"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancelar" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar" disabled={savingCreate}>
                  <Save size={14} style={{ marginRight: '4px' }} />{savingCreate ? 'Creando...' : 'Crear Cuadrilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Prevencionista ─────────────────────────────────────── */}
      {showPrevModal && (
        <div className="modal-overlay" onClick={() => setShowPrevModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Prevencionista de Riesgos</h2>
              <button className="modal-close" onClick={() => setShowPrevModal(false)}><X size={18} /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPrevencionistas((prev) => ({ ...prev, [selectedProject.id_proyecto]: tempPrevencionista }));
                setShowPrevModal(false);
              }}
            >
              <div className="modal-body">
                <label>Nombre</label>
                <input type="text" value={tempPrevencionista} onChange={(e) => setTempPrevencionista(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancelar" onClick={() => setShowPrevModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Nueva Asignación (agregar trabajador) ─────────────────── */}
      {showOpModal && (
        <div className="modal-overlay" onClick={() => setShowOpModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Asignación</h2>
              <button className="modal-close" onClick={() => setShowOpModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitOp}>
              <div className="modal-body">
                {opError && <div className="modal-error"><AlertCircle size={14} /> {opError}</div>}
                <label>Cuadrilla *</label>
                <select value={opForm.id_cuadrilla} onChange={(e) => setOpForm((p) => ({ ...p, id_cuadrilla: e.target.value }))} required>
                  <option value="">— Seleccionar cuadrilla —</option>
                  {cuadrillas.map((c) => <option key={c.id_cuadrilla} value={c.id_cuadrilla}>{c.nombre_cuadrilla}</option>)}
                </select>
                <label>Trabajador *</label>
                <select value={opForm.id_trabajador} onChange={(e) => setOpForm((p) => ({ ...p, id_trabajador: e.target.value }))} required>
                  <option value="">— Seleccionar trabajador —</option>
                  {operarios.map((t) => <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombres} {t.apellidos} — {t.rut}</option>)}
                </select>
                <label>Cargo Operativo *</label>
                <input
                  value={opForm.cargo_operativo}
                  onChange={(e) => setOpForm((p) => ({ ...p, cargo_operativo: e.target.value }))}
                  required
                  placeholder="Ej: Operario de Aseo"
                />
                <label>Tipo de Jornada *</label>
                <select value={opForm.tipo_jornada} onChange={(e) => setOpForm((p) => ({ ...p, tipo_jornada: e.target.value }))}>
                  {JORNADAS.map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancelar" onClick={() => setShowOpModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar" disabled={savingOp}>
                  <Save size={14} style={{ marginRight: '4px' }} />{savingOp ? 'Guardando...' : 'Guardar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación / inactivación ────────────────────────── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{confirmDelete.tipo === 'cuadrilla' ? 'Eliminar cuadrilla' : 'Quitar trabajador'}</h2>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p>
                {confirmDelete.tipo === 'cuadrilla'
                  ? `¿Deseas eliminar la cuadrilla "${confirmDelete.nombre}"? Esta acción eliminará todos sus registros asociados.`
                  : '¿Deseas quitar este integrante de la cuadrilla?'}
              </p>
              <p className="modal-warn">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-eliminar" onClick={handleDelete}>
                {confirmDelete.tipo === 'cuadrilla' ? 'Eliminar' : 'Quitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Asignaciones;