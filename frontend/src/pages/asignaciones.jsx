import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  Plus, Search, Trash2, X, Save, AlertCircle, Users, UserPlus,
} from 'lucide-react';
import {
  crearCuadrilla,
  getAllCuadrillasAndWorkersByIdProyecto,
  agregarSupervisorCuadrilla,
  eliminarSupervisorCuadrilla,
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

const EMPTY_CREATE_FORM = {
  id_proyecto: '',
  nombre_cuadrilla: '',
};

const EMPTY_SUPERVISOR_FORM = {
  id_trabajador: '',
  cargo_operativo: 'Supervisor de Cuadrilla',
  tipo_jornada: 'Diurna',
};

const EMPTY_OPERARIO_FORM = {
  id_trabajador: '',
  cargo_operativo: '',
  tipo_jornada: 'Diurna',
  es_bodeguero: false,
};

function Asignaciones({ usuario, onLogout }) {
  const [proyectos, setProyectos] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState(null);
  const [savingCreate, setSavingCreate] = useState(false);

  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [selectedCuadrillaId, setSelectedCuadrillaId] = useState(null);
  const [supForm, setSupForm] = useState(EMPTY_SUPERVISOR_FORM);
  const [supError, setSupError] = useState(null);
  const [savingSup, setSavingSup] = useState(false);

  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [opForm, setOpForm] = useState(EMPTY_OPERARIO_FORM);
  const [opError, setOpError] = useState(null);
  const [savingOp, setSavingOp] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async (projectId = selectedProjectId) => {
    setLoading(true);
    setError(null);
    try {
      const [resProyectos, resTrabajadores] = await Promise.all([
        apiFetch('/api/proyectos'),
        apiFetch('/api/trabajadores'),
      ]);

      const proyectosData = Array.isArray(resProyectos) ? resProyectos : resProyectos.data ?? [];
      const trabajadoresData = Array.isArray(resTrabajadores) ? resTrabajadores : resTrabajadores.data ?? [];
      setProyectos(proyectosData);
      setTrabajadores(trabajadoresData);

      const activeProjectId = projectId || proyectosData[0]?.id_proyecto || '';
      setSelectedProjectId(activeProjectId);

      if (activeProjectId) {
        const resCuadrillas = await getAllCuadrillasAndWorkersByIdProyecto(activeProjectId);
        const cuadrillasData = Array.isArray(resCuadrillas?.data) ? resCuadrillas.data : [];
        setCuadrillas(cuadrillasData);
      } else {
        setCuadrillas([]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const nombreTrabajador = (id) => {
    const trabajador = trabajadores.find((t) => t.id_trabajador === Number(id));
    return trabajador ? `${trabajador.nombres} ${trabajador.apellidos}` : `ID ${id}`;
  };

  const supervisores = trabajadores.filter((t) => t.tipo_usuario === 'supervisor');
  const operarios = trabajadores.filter((t) => t.tipo_usuario === 'trabajador');

  const filteredCuadrillas = cuadrillas.filter((cuadrilla) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const nombreCuadrilla = (cuadrilla.nombre_cuadrilla || '').toLowerCase();
    const miembrosTexto = (cuadrilla.integrantes || [])
      .map((integrante) => `${integrante.nombres} ${integrante.apellidos}`)
      .join(' ')
      .toLowerCase();
    return nombreCuadrilla.includes(q) || miembrosTexto.includes(q);
  });

  const abrirModalSupervisor = (idCuadrilla) => {
    setSelectedCuadrillaId(idCuadrilla);
    setSupForm(EMPTY_SUPERVISOR_FORM);
    setSupError(null);
    setShowSupervisorModal(true);
  };

  const abrirModalOperario = (idCuadrilla) => {
    setSelectedCuadrillaId(idCuadrilla);
    setOpForm(EMPTY_OPERARIO_FORM);
    setOpError(null);
    setShowWorkerModal(true);
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
      await fetchData(Number(createForm.id_proyecto));
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setSavingCreate(false);
    }
  };

  const handleSubmitSup = async (e) => {
    e.preventDefault();
    setSupError(null);
    setSavingSup(true);
    try {
      await agregarSupervisorCuadrilla(
        Number(supForm.id_trabajador),
        Number(selectedCuadrillaId),
        supForm.cargo_operativo,
        supForm.tipo_jornada,
      );
      setShowSupervisorModal(false);
      setSupForm(EMPTY_SUPERVISOR_FORM);
      await fetchData(selectedProjectId);
    } catch (e) {
      setSupError(e.message);
    } finally {
      setSavingSup(false);
    }
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
        opForm.es_bodeguero,
      );
      setShowWorkerModal(false);
      setOpForm(EMPTY_OPERARIO_FORM);
      await fetchData(selectedProjectId);
    } catch (e) {
      setOpError(e.message);
    } finally {
      setSavingOp(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.tipo === 'supervisor') {
        await eliminarSupervisorCuadrilla(confirmDelete.id_trabajador, confirmDelete.id_cuadrilla);
      } else {
        await eliminarTrabajadorCuadrilla(confirmDelete.id_trabajador, confirmDelete.id_cuadrilla);
      }
      await fetchData(selectedProjectId);
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
          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Asignaciones</h1>
              <p className="vista-general-subtitle">Gestión de cuadrillas mediante supervisores y trabajadores</p>
            </div>
            <button className="btn-nuevo-trabajador" onClick={() => { setCreateForm({ id_proyecto: selectedProjectId, nombre_cuadrilla: '' }); setCreateError(null); setShowCreateModal(true); }}>
              <Plus size={16} /> Nueva Cuadrilla
            </button>
          </div>

          <div className="tw-toolbar" style={{ gap: '12px', flexWrap: 'wrap' }}>
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input
                type="text"
                className="tw-search-input"
                placeholder="Buscar por cuadrilla o integrante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="tw-search-input"
              value={selectedProjectId}
              onChange={(e) => fetchData(e.target.value)}
              style={{ minWidth: '220px' }}
            >
              <option value="">— Seleccionar proyecto —</option>
              {proyectos.map((proyecto) => (
                <option key={proyecto.id_proyecto} value={proyecto.id_proyecto}>
                  {proyecto.nombre_proyecto}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          {loading ? (
            <div className="tw-loading"><div className="tw-spinner" /> Cargando cuadrillas...</div>
          ) : filteredCuadrillas.length === 0 ? (
            <div className="tw-empty"><Users size={40} /><p>No hay cuadrillas para este proyecto</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {filteredCuadrillas.map((cuadrilla) => (
                <div key={cuadrilla.id_cuadrilla} className="tw-table-card" style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f9fafb' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>{cuadrilla.nombre_cuadrilla}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Estado: {cuadrilla.estado || 'activa'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        className="tw-btn-edit"
                        onClick={() => abrirModalSupervisor(cuadrilla.id_cuadrilla)}
                        style={{ minWidth: '140px', justifyContent: 'center' }}
                      >
                        <UserPlus size={14} /> Supervisor
                      </button>
                      <button
                        className="tw-btn-edit"
                        onClick={() => abrirModalOperario(cuadrilla.id_cuadrilla)}
                        style={{ minWidth: '140px', justifyContent: 'center' }}
                      >
                        <UserPlus size={14} /> Trabajador
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Integrantes</div>
                    {(cuadrilla.integrantes || []).length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#9ca3af' }}>Aún no hay integrantes en esta cuadrilla.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(cuadrilla.integrantes || []).map((integrante) => (
                          <div key={`${cuadrilla.id_cuadrilla}-${integrante.id_trabajador}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', background: '#f8fafc' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{integrante.nombres} {integrante.apellidos}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                {integrante.cargo_operativo || 'Sin cargo'} · {integrante.tipo_jornada || 'Sin jornada'}
                                {integrante.es_bodeguero ? ' · Bodeguero' : ''}
                              </div>
                            </div>
                            <button
                              className="tw-btn-delete"
                              onClick={() => setConfirmDelete({ id_trabajador: integrante.id_trabajador, id_cuadrilla: cuadrilla.id_cuadrilla, tipo: integrante.cargo_operativo?.toLowerCase().includes('supervisor') ? 'supervisor' : 'trabajador' })}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="tw-modal-overlay">
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
                    {proyectos.map((proyecto) => (
                      <option key={proyecto.id_proyecto} value={proyecto.id_proyecto}>{proyecto.nombre_proyecto}</option>
                    ))}
                  </select>
                </div>
                <div className="tw-field tw-field-full">
                  <label>Nombre de la cuadrilla *</label>
                  <input value={createForm.nombre_cuadrilla} onChange={(e) => setCreateForm((p) => ({ ...p, nombre_cuadrilla: e.target.value }))} required />
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

      {showSupervisorModal && (
        <div className="tw-modal-overlay">
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Asignar Supervisor</h2>
              <button className="tw-modal-close" onClick={() => setShowSupervisorModal(false)}><X size={18} /></button>
            </div>
            {supError && <div className="tw-form-error"><AlertCircle size={14} /> {supError}</div>}
            <form className="tw-form" onSubmit={handleSubmitSup}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Supervisor *</label>
                  <select value={supForm.id_trabajador} onChange={(e) => setSupForm((p) => ({ ...p, id_trabajador: e.target.value }))} required>
                    <option value="">— Seleccionar supervisor —</option>
                    {supervisores.map((trabajador) => (
                      <option key={trabajador.id_trabajador} value={trabajador.id_trabajador}>{trabajador.nombres} {trabajador.apellidos}</option>
                    ))}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Cargo Operativo</label>
                  <input value={supForm.cargo_operativo} onChange={(e) => setSupForm((p) => ({ ...p, cargo_operativo: e.target.value }))} />
                </div>
                <div className="tw-field">
                  <label>Jornada</label>
                  <select value={supForm.tipo_jornada} onChange={(e) => setSupForm((p) => ({ ...p, tipo_jornada: e.target.value }))}>
                    {JORNADAS.map((jornada) => <option key={jornada} value={jornada}>{jornada}</option>)}
                  </select>
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowSupervisorModal(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={savingSup}>
                  <Save size={14} /> {savingSup ? 'Guardando...' : 'Guardar Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWorkerModal && (
        <div className="tw-modal-overlay">
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Agregar Trabajador</h2>
              <button className="tw-modal-close" onClick={() => setShowWorkerModal(false)}><X size={18} /></button>
            </div>
            {opError && <div className="tw-form-error"><AlertCircle size={14} /> {opError}</div>}
            <form className="tw-form" onSubmit={handleSubmitOp}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Trabajador *</label>
                  <select value={opForm.id_trabajador} onChange={(e) => setOpForm((p) => ({ ...p, id_trabajador: e.target.value }))} required>
                    <option value="">— Seleccionar trabajador —</option>
                    {operarios.map((trabajador) => (
                      <option key={trabajador.id_trabajador} value={trabajador.id_trabajador}>{trabajador.nombres} {trabajador.apellidos}</option>
                    ))}
                  </select>
                </div>
                <div className="tw-field">
                  <label>Cargo Operativo</label>
                  <input value={opForm.cargo_operativo} onChange={(e) => setOpForm((p) => ({ ...p, cargo_operativo: e.target.value }))} />
                </div>
                <div className="tw-field">
                  <label>Jornada</label>
                  <select value={opForm.tipo_jornada} onChange={(e) => setOpForm((p) => ({ ...p, tipo_jornada: e.target.value }))}>
                    {JORNADAS.map((jornada) => <option key={jornada} value={jornada}>{jornada}</option>)}
                  </select>
                </div>
                <div className="tw-field tw-field-full">
                  <label>
                    <input type="checkbox" checked={opForm.es_bodeguero} onChange={(e) => setOpForm((p) => ({ ...p, es_bodeguero: e.target.checked }))} />
                    {' '}Asignar como bodeguero
                  </label>
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowWorkerModal(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={savingOp}>
                  <Save size={14} /> {savingOp ? 'Guardando...' : 'Guardar Trabajador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="tw-modal-overlay">
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Confirmar eliminación</h2>
              <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <p className="tw-confirm-text">¿Deseas quitar este integrante de la cuadrilla?</p>
            <div className="tw-modal-footer">
              <button className="tw-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="tw-btn-delete-confirm" onClick={handleDelete}>
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
