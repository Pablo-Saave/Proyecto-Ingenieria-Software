// pages/ContratoProyectos.jsx  (Administrador)
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/contratoProyectos.css';
import { Eye, MoreVertical, Plus, X, AlertTriangle, FilePlus, Download } from 'lucide-react';
import { generarPDFContratoProyecto } from '../utils/generarPDFContratoProyecto';
import {
  getContratosProyecto,
  getContratoProyectoDetalle,
  getProyectosDisponibles,
  createContratoProyecto,
  updateContratoProyecto,
  deleteContratoProyecto,
  createAnexo,
  deleteAnexo,
  validarFormContratoProyecto,
  validarFormAnexo,
  hoyLocal,
} from '../services/contratoProyectoService';

// Estados válidos para Contrato de Proyecto (alineados con Contratos normales)
const ESTADOS_CONTRATO_PROYECTO = [
  { value: 'activo',     label: 'Activo' },
  { value: 'por_vencer', label: 'Por vencer' },
  { value: 'inactivo',   label: 'Inactivo' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function calcularDiasRestantes(fechaTermino) {
  if (!fechaTermino) return 0;
  const diff = Math.ceil((new Date(fechaTermino) - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getEstadoLabel(value) {
  return ESTADOS_CONTRATO_PROYECTO.find((e) => e.value === value)?.label || value;
}

function getEstadoClass(estado) {
  if (estado === 'activo')     return 'estado-activo';
  if (estado === 'por_vencer') return 'estado-por-vencer';
  if (estado === 'inactivo')   return 'estado-inactivo';
  return '';
}

function mapContrato(c) {
  const p = c.proyecto || {};
  const cli = p.cliente || {};
  return {
    id_contrato_proyecto: c.id_contrato_proyecto,
    id_proyecto:          c.id_proyecto,
    descripcion:          c.descripcion,
    fecha_inicio:         c.fecha_inicio,
    fecha_termino:        c.fecha_termino,
    fecha_extension:      c.fecha_extension,
    estado_contrato:      c.estado_contrato,
    monto:                c.monto ?? null,
    proyecto: {
      nombre: p.nombre_proyecto || 'Proyecto sin nombre',
      direccion: p.direccion || '—',
      cliente: `${cli.nombres || ''} ${cli.apellidos || ''}`.trim() || 'Sin cliente',
    },
    diasRestantes: calcularDiasRestantes(c.fecha_termino),
  };
}

function formatearMonto(monto) {
  if (monto === null || monto === undefined || monto === '') return '—';
  return Number(monto).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function IconoFiltro() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// ─── Modal Crear / Editar Contrato ─────────────────────────────────────────────

const FORM_VACIO = {
  id_proyecto:     '',
  descripcion:     '',
  estado_contrato: 'activo',
  fecha_inicio:    '',
  fecha_termino:   '',
  monto:           '',
};

function ContratoProyectoModal({ onClose, onGuardado, contratoEdit, proyectosDisponibles }) {
  const listaProyectos = Array.isArray(proyectosDisponibles) ? proyectosDisponibles : [];

  const [form, setForm] = useState(
    contratoEdit
      ? {
          id_proyecto:     contratoEdit.id_proyecto,
          descripcion:     contratoEdit.descripcion   || '',
          estado_contrato: contratoEdit.estado_contrato || 'activo',
          fecha_inicio:    contratoEdit.fecha_inicio  || '',
          fecha_termino:   contratoEdit.fecha_termino || '',
          monto:           contratoEdit.monto ?? '',
        }
      : FORM_VACIO
  );
  const [guardando, setGuardando] = useState(false);
  const [errores,   setErrores]   = useState([]);

  const hoy = hoyLocal();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores([]);
  };

  const handleGuardar = async () => {
    const errs = validarFormContratoProyecto(form, !!contratoEdit);
    if (errs.length) { setErrores(errs); return; }

    setGuardando(true);
    setErrores([]);
    try {
      if (contratoEdit) {
        await updateContratoProyecto(contratoEdit.id_contrato_proyecto, {
          descripcion:     form.descripcion,
          estado_contrato: form.estado_contrato,
          fecha_inicio:    form.fecha_inicio,
          fecha_termino:   form.fecha_termino,
          monto:           form.monto === '' ? null : Number(form.monto),
        });
      } else {
        await createContratoProyecto({
          id_proyecto:     Number(form.id_proyecto),
          descripcion:     form.descripcion,
          estado_contrato: form.estado_contrato,
          fecha_inicio:    form.fecha_inicio,
          fecha_termino:   form.fecha_termino,
          monto:           form.monto === '' ? null : Number(form.monto),
        });
      }
      onGuardado();
    } catch (err) {
      setErrores([err.message]);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{contratoEdit ? 'Editar Contrato de Proyecto' : 'Nuevo Contrato de Proyecto'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {errores.length > 0 && (
            <div className="modal-error-list">
              {errores.map((e, i) => (
                <p key={i} className="modal-error"><AlertTriangle size={14} /> {e}</p>
              ))}
            </div>
          )}

          <label>Proyecto *</label>
          {contratoEdit ? (
            <input type="text" value={contratoEdit.proyecto.nombre} disabled />
          ) : (
            <select name="id_proyecto" value={form.id_proyecto} onChange={handleChange}>
              <option value="">— Seleccionar —</option>
              {listaProyectos.map((p) => (
                <option key={p.id_proyecto} value={p.id_proyecto}>
                  {p.nombre_proyecto} — {p.cliente?.nombres} {p.cliente?.apellidos}
                </option>
              ))}
            </select>
          )}
          {!contratoEdit && listaProyectos.length === 0 && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '-4px' }}>
              No hay proyectos activos disponibles (todos ya tienen contrato, o no hay proyectos activos).
            </p>
          )}

          <label>Descripción *</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
            placeholder="Alcance y condiciones generales del contrato..."
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Estado *
            {!contratoEdit && (
              <span style={{
                fontSize: '11px', color: '#6b7280',
                background: '#f3f4f6', borderRadius: '4px',
                padding: '2px 6px', fontWeight: 500,
              }}>
                Los contratos nuevos se crean como Activo
              </span>
            )}
          </label>
          <select
            name="estado_contrato"
            value={form.estado_contrato}
            onChange={handleChange}
            disabled={!contratoEdit}
            title={!contratoEdit ? 'Los contratos nuevos siempre inician en estado Activo' : ''}
            style={!contratoEdit ? { opacity: 0.6, cursor: 'not-allowed', background: '#f9fafb' } : {}}
          >
            {ESTADOS_CONTRATO_PROYECTO.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>

          <label>Fecha de inicio *</label>
          <input
            type="date"
            name="fecha_inicio"
            value={form.fecha_inicio}
            onChange={handleChange}
          />

          <label>Fecha de término *</label>
          <input
            type="date"
            name="fecha_termino"
            value={form.fecha_termino}
            min={form.fecha_inicio || hoy}
            onChange={handleChange}
          />

          <label>Monto del contrato *</label>
          <input
            type="number"
            name="monto"
            value={form.monto}
            onChange={handleChange}
            min="0"
            step="1"
            placeholder="Ej: 4500000"
          />
        </div>

        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="btn-guardar" onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : contratoEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Agregar Anexo ───────────────────────────────────────────────────────

const ANEXO_VACIO = {
  fecha_anexo: '',
  fecha_vigencia: '',
  motivo: '',
  descripcion_modificacion: '',
  monto_nuevo: '',
  observaciones: '',
};

function AnexoModal({ idContrato, onClose, onGuardado }) {
  const [form, setForm]       = useState(ANEXO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errores,   setErrores]   = useState([]);
  const hoy = hoyLocal();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores([]);
  };

  const handleGuardar = async () => {
    const errs = validarFormAnexo(form);
    if (errs.length) { setErrores(errs); return; }

    setGuardando(true);
    setErrores([]);
    try {
      await createAnexo(idContrato, {
        fecha_anexo: form.fecha_anexo,
        fecha_vigencia: form.fecha_vigencia,
        motivo: form.motivo,
        descripcion_modificacion: form.descripcion_modificacion,
        monto_nuevo: form.monto_nuevo === '' ? null : Number(form.monto_nuevo),
        observaciones: form.observaciones || null,
      });
      onGuardado();
    } catch (err) {
      setErrores([err.message]);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Anexo</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {errores.length > 0 && (
            <div className="modal-error-list">
              {errores.map((e, i) => (
                <p key={i} className="modal-error"><AlertTriangle size={14} /> {e}</p>
              ))}
            </div>
          )}

          <label>Fecha del anexo *</label>
          <input type="date" name="fecha_anexo" value={form.fecha_anexo} max={hoy} onChange={handleChange} />

          <label>Fecha de vigencia (nueva fecha de término efectiva) *</label>
          <input type="date" name="fecha_vigencia" value={form.fecha_vigencia}
            min={form.fecha_anexo || undefined} onChange={handleChange} />

          <label>Motivo *</label>
          <input type="text" name="motivo" value={form.motivo}
            onChange={handleChange} placeholder="Ej: Extensión de plazo, ajuste de alcance..." />

          <label>Descripción de la modificación *</label>
          <textarea name="descripcion_modificacion" value={form.descripcion_modificacion}
            onChange={handleChange} rows={3} placeholder="Detalle de lo que cambia..." />

          <label>Monto nuevo (opcional)</label>
          <input type="number" name="monto_nuevo" value={form.monto_nuevo} onChange={handleChange} />

          <label>Observaciones</label>
          <textarea name="observaciones" value={form.observaciones}
            onChange={handleChange} rows={2} placeholder="Notas adicionales..." />
        </div>

        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="btn-guardar" onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar anexo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Ver Detalle (contrato + anexos) ─────────────────────────────────────

function DetalleModal({ contratoResumen, onClose, onCambio }) {
  const [contrato, setContrato] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [modalAnexo, setModalAnexo] = useState(false);
  const [eliminandoAnexoId, setEliminandoAnexoId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getContratoProyectoDetalle(contratoResumen.id_contrato_proyecto);
      setContrato(data);
    } catch {
      // silencioso: el modal simplemente queda vacío si falla
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEliminarAnexo = async (id_anexo_contrato_proyecto) => {
    if (!window.confirm('¿Eliminar este anexo? Esta acción no se puede deshacer.')) return;
    setEliminandoAnexoId(id_anexo_contrato_proyecto);
    try {
      await deleteAnexo(id_anexo_contrato_proyecto);
      await cargar();
      onCambio();
    } catch (e) {
      alert(e.message);
    } finally {
      setEliminandoAnexoId(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-detalle-contrato" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalle del Contrato de Proyecto</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {loading || !contrato ? (
          <div className="modal-body"><p>Cargando...</p></div>
        ) : (
          <>
            <div className="modal-body detalle-grid">
              <div><span className="detalle-label">Proyecto</span><span>{contrato.proyecto?.nombre_proyecto}</span></div>
              <div><span className="detalle-label">Cliente</span>
                <span>{contrato.proyecto?.cliente?.nombres} {contrato.proyecto?.cliente?.apellidos}</span>
              </div>
              <div>
                <span className="detalle-label">Estado</span>
                <span className={`estado-badge ${getEstadoClass(contrato.estado_contrato)}`}>
                  {getEstadoLabel(contrato.estado_contrato)}
                </span>
              </div>
              <div><span className="detalle-label">Días restantes</span><span>{calcularDiasRestantes(contrato.fecha_termino)} días</span></div>
              <div><span className="detalle-label">Fecha inicio</span><span>{formatearFecha(contrato.fecha_inicio)}</span></div>
              <div><span className="detalle-label">Fecha término</span><span>{formatearFecha(contrato.fecha_termino)}</span></div>
              <div><span className="detalle-label">Fecha extensión vigente</span><span>{formatearFecha(contrato.fecha_extension)}</span></div>
              <div><span className="detalle-label">Monto</span><span>{formatearMonto(contrato.monto)}</span></div>
              <div className="detalle-full">
                <span className="detalle-label">Descripción</span>
                <span>{contrato.descripcion}</span>
              </div>
            </div>

            <div className="anexos-section">
              <div className="anexos-header">
                <h3>Anexos ({contrato.anexos?.length || 0})</h3>
                <button className="btn-agregar-anexo" onClick={() => setModalAnexo(true)}>
                  <FilePlus size={14} /> Agregar anexo
                </button>
              </div>

              {(!contrato.anexos || contrato.anexos.length === 0) ? (
                <p className="anexos-empty">Este contrato aún no tiene anexos.</p>
              ) : (
                <ul className="anexos-list">
                  {contrato.anexos.map((a) => (
                    <li key={a.id_anexo_contrato_proyecto} className="anexo-item">
                      <div className="anexo-item-header">
                        <span className="anexo-fecha">{formatearFecha(a.fecha_anexo)}</span>
                        <span className="anexo-motivo">{a.motivo}</span>
                        <button
                          className="btn-eliminar-anexo"
                          onClick={() => handleEliminarAnexo(a.id_anexo_contrato_proyecto)}
                          disabled={eliminandoAnexoId === a.id_anexo_contrato_proyecto}
                          title="Eliminar anexo"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="anexo-descripcion">{a.descripcion_modificacion}</p>
                      <div className="anexo-meta">
                        <span>Vigencia hasta: {formatearFecha(a.fecha_vigencia)}</span>
                        {a.monto_nuevo !== null && a.monto_nuevo !== undefined && (
                          <span>Monto nuevo: ${Number(a.monto_nuevo).toLocaleString('es-CL')}</span>
                        )}
                      </div>
                      {a.observaciones && <p className="anexo-observaciones">{a.observaciones}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cerrar</button>
          {contrato && (
            <button className="btn-guardar"
              onClick={() => generarPDFContratoProyecto({ ...contrato, estadoLabel: getEstadoLabel(contrato.estado_contrato) })}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={15} /> Descargar PDF
            </button>
          )}
        </div>
      </div>

      {modalAnexo && (
        <AnexoModal
          idContrato={contratoResumen.id_contrato_proyecto}
          onClose={() => setModalAnexo(false)}
          onGuardado={async () => { setModalAnexo(false); await cargar(); onCambio(); }}
        />
      )}
    </div>
  );
}

// ─── Modal Confirmar Eliminar ──────────────────────────────────────────────────

function ConfirmModal({ contrato, onClose, onConfirmar, eliminando }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Eliminar contrato de proyecto</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p>¿Eliminar el contrato del proyecto <strong>{contrato.proyecto.nombre}</strong>?</p>
          <p className="modal-warn">Esto también eliminará todos sus anexos. Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="btn-eliminar" onClick={onConfirmar} disabled={eliminando}>
            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Menú contextual ──────────────────────────────────────────────────────────

function ContextMenu({ contrato, onEditar, onEliminar, onCerrar }) {
  return (
    <div className="context-menu" onMouseLeave={onCerrar}>
      <button onClick={() => { onEditar(contrato); onCerrar(); }}>Editar</button>
      <button className="ctx-danger" onClick={() => { onEliminar(contrato); onCerrar(); }}>Eliminar</button>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

const POR_PAGINA = 10;

function ContratoProyectos({ usuario, onLogout }) {
  const [contratos, setContratos]   = useState([]);
  const [proyectosDisponibles, setProyectosDisponibles] = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState('');

  const [searchTerm,     setSearchTerm]     = useState('');
  const [filtroEstado,   setFiltroEstado]   = useState('Todos');
  const [filtroFecha,    setFiltroFecha]    = useState('Todos');
  const [filtrosActivos, setFiltrosActivos] = useState(false);
  const [pagina,          setPagina]        = useState(1);

  const [modalNuevo,      setModalNuevo]      = useState(false);
  const [contratoEdit,    setContratoEdit]    = useState(null);
  const [contratoDetalle, setContratoDetalle] = useState(null);
  const [contratoDelete,  setContratoDelete]  = useState(null);
  const [eliminando,      setEliminando]      = useState(false);
  const [menuAbierto,     setMenuAbierto]     = useState(null);

  const fetchContratos = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getContratosProyecto({ page: 1, limit: 500 });
      setContratos((Array.isArray(res.data) ? res.data : []).map(mapContrato));
    } catch {
      setError('No se pudo cargar los contratos de proyecto. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProyectosDisponibles = async () => {
    try {
      const data = await getProyectosDisponibles();
      setProyectosDisponibles(Array.isArray(data) ? data : []);
    } catch {
      setProyectosDisponibles([]);
    }
  };

  useEffect(() => {
    fetchContratos();
    fetchProyectosDisponibles();
  }, []);

  const getFechaLimite = (rango) => {
    const hoy = new Date();
    switch (rango) {
      case 'Último mes': return new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
      case '3 meses':    return new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
      case '6 meses':    return new Date(hoy.getFullYear(), hoy.getMonth() - 6, hoy.getDate());
      case '12 meses':   return new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());
      default:           return null;
    }
  };

  const filtrados = contratos.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      c.proyecto.nombre.toLowerCase().includes(term) ||
      c.proyecto.cliente.toLowerCase().includes(term);
    const matchEstado = !filtrosActivos || filtroEstado === 'Todos' || c.estado_contrato === filtroEstado;
    let matchFecha = true;
    if (filtrosActivos && filtroFecha !== 'Todos') {
      const lim = getFechaLimite(filtroFecha);
      matchFecha = new Date(c.fecha_inicio + 'T00:00:00') >= lim;
    }
    return matchSearch && matchEstado && matchFecha;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles     = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const handleGuardado = () => {
    setModalNuevo(false);
    setContratoEdit(null);
    fetchContratos();
    fetchProyectosDisponibles();
  };

  const handleConfirmarEliminar = async () => {
    if (!contratoDelete) return;
    setEliminando(true);
    try {
      await deleteContratoProyecto(contratoDelete.id_contrato_proyecto);
      setContratoDelete(null);
      fetchContratos();
      fetchProyectosDisponibles();
    } catch (e) {
      alert(e.message);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="dashboard-wrapper contrato-proyecto-page">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">
          <div className="contratos-container">

            <div className="contratos-header">
              <div>
                <h1 className="vista-general-title">Contratos de Proyecto</h1>
                <p className="vista-general-subtitle">Gestiona el contrato y los anexos de cada proyecto.</p>
              </div>
              <button className="btn-nuevo-contrato" onClick={() => setModalNuevo(true)}>
                <Plus size={16} /> Nuevo Contrato
              </button>
            </div>

            {error && <div className="alert-error"><AlertTriangle size={16} /> {error}</div>}

            <div className="contratos-filters">
              <div className="search-box">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por proyecto o cliente..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPagina(1); }}
                />
              </div>
              <div className="filter-controls">
                <div className="filter-group">
                  <label>Estado</label>
                  <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}>
                    <option value="Todos">Todos</option>
                    {ESTADOS_CONTRATO_PROYECTO.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Fecha</label>
                  <select value={filtroFecha} onChange={(e) => { setFiltroFecha(e.target.value); setPagina(1); }}>
                    <option value="Todos">Todas</option>
                    <option value="Último mes">Último mes</option>
                    <option value="3 meses">3 meses</option>
                    <option value="6 meses">6 meses</option>
                    <option value="12 meses">12 meses</option>
                  </select>
                </div>
                <button
                  className={`btn-filtros${filtrosActivos ? ' btn-filtros-activo' : ''}`}
                  onClick={() => setFiltrosActivos((p) => !p)}
                >
                  <IconoFiltro /> Filtrar
                </button>
              </div>
            </div>

            <div className="contratos-count">
              {filtrados.length} contrato{filtrados.length !== 1 ? 's' : ''}
              {filtrosActivos && filtroEstado !== 'Todos' && ` · ${getEstadoLabel(filtroEstado)}`}
              {filtrosActivos && filtroFecha  !== 'Todos' && ` · ${filtroFecha}`}
            </div>

            <div className="contratos-table-wrapper">
              {loading ? (
                <div className="table-loading">Cargando contratos...</div>
              ) : (
                <table className="contratos-table">
                  <thead>
                    <tr>
                      <th>PROYECTO</th><th>CLIENTE</th><th>INICIO</th>
                      <th>TÉRMINO</th><th>ESTADO</th><th>TIEMPO RESTANTE</th><th>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.length === 0 ? (
                      <tr><td colSpan={7} className="table-empty">No se encontraron contratos de proyecto.</td></tr>
                    ) : visibles.map((contrato) => (
                      <tr key={contrato.id_contrato_proyecto}>
                        <td className="col-trabajador">
                          <div className="trabajador-info">
                            <div>
                              <div className="nombre">{contrato.proyecto.nombre}</div>
                              <div className="rut">{contrato.proyecto.direccion}</div>
                            </div>
                          </div>
                        </td>
                        <td>{contrato.proyecto.cliente}</td>
                        <td>{formatearFecha(contrato.fecha_inicio)}</td>
                        <td>{formatearFecha(contrato.fecha_termino)}</td>
                        <td>
                          <span className={`estado-badge ${getEstadoClass(contrato.estado_contrato)}`}>
                            {getEstadoLabel(contrato.estado_contrato)}
                          </span>
                        </td>
                        <td>
                          <span className="dias-text">{contrato.diasRestantes} días</span>
                        </td>
                        <td className="col-acciones" style={{ position: 'relative' }}>
                          <button className="btn-accion" title="Ver detalles"
                            onClick={() => setContratoDetalle(contrato)}>
                            <Eye size={18} />
                          </button>
                          <button className="btn-accion" title="Más opciones"
                            onClick={() => setMenuAbierto(menuAbierto === contrato.id_contrato_proyecto ? null : contrato.id_contrato_proyecto)}>
                            <MoreVertical size={18} />
                          </button>
                          {menuAbierto === contrato.id_contrato_proyecto && (
                            <ContextMenu contrato={contrato}
                              onEditar={setContratoEdit}
                              onEliminar={setContratoDelete}
                              onCerrar={() => setMenuAbierto(null)} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pagination">
              <span className="pagination-info">
                Mostrando {filtrados.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1} a{' '}
                {Math.min(paginaActual * POR_PAGINA, filtrados.length)} de {filtrados.length} contratos.
              </span>
              <div className="pagination-controls">
                <button className="btn-pagina prev"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}>‹</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button key={n} className={`btn-pagina ${n === paginaActual ? 'active' : ''}`}
                    onClick={() => setPagina(n)}>{n}</button>
                ))}
                <button className="btn-pagina next"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}>›</button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {(modalNuevo || contratoEdit) && (
        <ContratoProyectoModal
          proyectosDisponibles={proyectosDisponibles}
          contratoEdit={contratoEdit}
          onClose={() => { setModalNuevo(false); setContratoEdit(null); }}
          onGuardado={handleGuardado}
        />
      )}
      {contratoDetalle && (
        <DetalleModal
          contratoResumen={contratoDetalle}
          onClose={() => setContratoDetalle(null)}
          onCambio={fetchContratos}
        />
      )}
      {contratoDelete && (
        <ConfirmModal contrato={contratoDelete}
          onClose={() => setContratoDelete(null)}
          onConfirmar={handleConfirmarEliminar}
          eliminando={eliminando} />
      )}
    </div>
  );
}

export default ContratoProyectos;