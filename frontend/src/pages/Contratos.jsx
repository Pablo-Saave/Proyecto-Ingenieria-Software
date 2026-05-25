import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/contratos.css';
import { Eye, MoreVertical, Plus, X, AlertTriangle } from 'lucide-react';
import {
  getContratos,
  createContrato,
  updateContrato,
  deleteContrato,
  getTrabajadores,
} from '../services/contratosService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularDiasRestantes(fechaTermino) {
  if (!fechaTermino) return null;
  const diff = Math.ceil((new Date(fechaTermino) - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function calcularDiasTotal(fechaInicio, fechaTermino) {
  if (!fechaInicio || !fechaTermino) return 365;
  const diff = Math.ceil((new Date(fechaTermino) - new Date(fechaInicio)) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 365;
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getIniciales(nombres = '', apellidos = '') {
  return ((nombres.trim()[0] || '') + (apellidos.trim()[0] || '')).toUpperCase();
}

function calcularEstado(fechaTermino) {
  const dias = calcularDiasRestantes(fechaTermino);
  if (dias === null) return 'Activo';
  if (dias === 0)    return 'Vencido';
  if (dias <= 30)    return 'Por vencer';
  return 'Activo';
}

function mapContrato(c) {
  const t = c.trabajador || {};
  const diasRestantes = calcularDiasRestantes(c.fecha_termino) ?? 0;
  const diasTotal     = calcularDiasTotal(c.fecha_inicio, c.fecha_termino);

  return {
    id_contrato:    c.id_contrato,
    tipo_contrato:  c.tipo_contrato  || '—',
    estado_contrato: c.estado_contrato,
    fecha_inicio:   c.fecha_inicio,
    fecha_termino:  c.fecha_termino  || '',
    observaciones:  c.observaciones  || '',
    id_trabajador:  t.id_trabajador,

    trabajador: {
      nombre:    `${t.nombres || ''} ${t.apellidos || ''}`.trim() || 'Sin nombre',
      rut:       t.rut || '—',
      iniciales: getIniciales(t.nombres, t.apellidos),
    },
    estado:       calcularEstado(c.fecha_termino),
    diasRestantes,
    diasTotal,
  };
}

function getEstadoClass(estado) {
  if (estado === 'Activo')     return 'estado-activo';
  if (estado === 'Por vencer') return 'estado-por-vencer';
  if (estado === 'Vencido')    return 'estado-vencido';
  return '';
}

function getProgressClass(diasRestantes, diasTotal) {
  const pct = diasTotal > 0 ? (diasRestantes / diasTotal) * 100 : 0;
  if (pct <= 0)  return 'progress-rojo';
  if (pct < 15)  return 'progress-rojo';
  if (pct < 30)  return 'progress-naranja';
  return 'progress-azul';
}

// ─── Ícono Embudo (Filtro) ────────────────────────────────────────────────────

function IconoFiltro() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// ─── Modal Crear / Editar ─────────────────────────────────────────────────────

const FORM_VACIO = {
  id_trabajador:  '',
  tipo_contrato:  '',
  estado_contrato: 'Activo',
  fecha_inicio:   '',
  fecha_termino:  '',
  observaciones:  '',
};

function ContratoModal({ onClose, onGuardado, contratoEdit, trabajadores }) {
  const [form, setForm] = useState(
    contratoEdit
      ? {
          id_trabajador:   contratoEdit.id_trabajador   || '',
          tipo_contrato:   contratoEdit.tipo_contrato   || '',
          estado_contrato: contratoEdit.estado_contrato || 'Activo',
          fecha_inicio:    contratoEdit.fecha_inicio    || '',
          fecha_termino:   contratoEdit.fecha_termino   || '',
          observaciones:   contratoEdit.observaciones   || '',
        }
      : FORM_VACIO
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.id_trabajador || !form.tipo_contrato || !form.estado_contrato || !form.fecha_inicio) {
      setError('Trabajador, tipo, estado y fecha de inicio son obligatorios.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const payload = {
        tipo_contrato:   form.tipo_contrato,
        estado_contrato: form.estado_contrato,
        fecha_inicio:    form.fecha_inicio,
        fecha_termino:   form.fecha_termino  || null,
        observaciones:   form.observaciones  || null,
        id_trabajador:   Number(form.id_trabajador),
      };

      if (contratoEdit) {
        await updateContrato(contratoEdit.id_contrato, payload);
      } else {
        await createContrato(payload);
      }
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2>{contratoEdit ? 'Editar Contrato' : 'Nuevo Contrato'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {error && (
            <p className="modal-error"><AlertTriangle size={14} /> {error}</p>
          )}

          <label>Trabajador *</label>
          <select
            name="id_trabajador"
            value={form.id_trabajador}
            onChange={handleChange}
            disabled={!!contratoEdit}
          >
            <option value="">— Seleccionar —</option>
            {trabajadores.map((t) => (
              <option key={t.id_trabajador} value={t.id_trabajador}>
                {t.nombres} {t.apellidos} — {t.rut}
              </option>
            ))}
          </select>

          <label>Tipo de contrato *</label>
          <select name="tipo_contrato" value={form.tipo_contrato} onChange={handleChange}>
            <option value="">— Seleccionar —</option>
            <option value="Indefinido">Indefinido</option>
            <option value="Plazo fijo">Plazo fijo</option>
          </select>

          <label>Estado *</label>
          <select name="estado_contrato" value={form.estado_contrato} onChange={handleChange}>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>

          <label>Fecha de inicio *</label>
          <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} />

          <label>Fecha de término</label>
          <input type="date" name="fecha_termino" value={form.fecha_termino} onChange={handleChange} />

          <label>Observaciones</label>
          <textarea
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            rows={3}
            placeholder="Notas adicionales..."
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

// ─── Modal Ver Detalle ────────────────────────────────────────────────────────

function DetalleModal({ contrato, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2>Detalle del Contrato</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body detalle-grid">
          <div>
            <span className="detalle-label">Trabajador</span>
            <span>{contrato.trabajador.nombre}</span>
          </div>
          <div>
            <span className="detalle-label">RUT</span>
            <span>{contrato.trabajador.rut}</span>
          </div>
          <div>
            <span className="detalle-label">Tipo de contrato</span>
            <span>{contrato.tipo_contrato}</span>
          </div>
          <div>
            <span className="detalle-label">Estado</span>
            <span className={`estado-badge ${getEstadoClass(contrato.estado)}`}>
              {contrato.estado}
            </span>
          </div>
          <div>
            <span className="detalle-label">Fecha inicio</span>
            <span>{formatearFecha(contrato.fecha_inicio)}</span>
          </div>
          <div>
            <span className="detalle-label">Fecha término</span>
            <span>{formatearFecha(contrato.fecha_termino)}</span>
          </div>
          <div>
            <span className="detalle-label">Días restantes</span>
            <span>{contrato.diasRestantes} días</span>
          </div>
          {contrato.observaciones && (
            <div className="detalle-full">
              <span className="detalle-label">Observaciones</span>
              <span>{contrato.observaciones}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-guardar" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Confirmar Eliminar ─────────────────────────────────────────────────

function ConfirmModal({ contrato, onClose, onConfirmar, eliminando }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2>Eliminar contrato</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <p>
            ¿Eliminar el contrato de <strong>{contrato.trabajador.nombre}</strong>?
          </p>
          <p className="modal-warn">Esta acción no se puede deshacer.</p>
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

// ─── Menú contextual (⋮) ─────────────────────────────────────────────────────

function ContextMenu({ contrato, onEditar, onEliminar, onCerrar }) {
  return (
    <div className="context-menu" onMouseLeave={onCerrar}>
      <button onClick={() => { onEditar(contrato); onCerrar(); }}>
        Editar
      </button>
      <button
        className="ctx-danger"
        onClick={() => { onEliminar(contrato); onCerrar(); }}
      >
        Eliminar
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const POR_PAGINA = 10;

function Contratos({ onLogout }) {
  const [contratos,    setContratos]    = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Filtros
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filtroEstado,   setFiltroEstado]   = useState('Todos');
  const [filtroFecha,    setFiltroFecha]    = useState('Todos');
  const [filtrosActivos, setFiltrosActivos] = useState(false);

  // Paginación
  const [pagina, setPagina] = useState(1);

  // Modales
  const [modalNuevo,      setModalNuevo]      = useState(false);
  const [contratoEdit,    setContratoEdit]    = useState(null);
  const [contratoDetalle, setContratoDetalle] = useState(null);
  const [contratoDelete,  setContratoDelete]  = useState(null);
  const [eliminando,      setEliminando]      = useState(false);
  const [menuAbierto,     setMenuAbierto]     = useState(null);

  // ── Carga inicial ───────────────────────────────────────────────────────────

  const fetchContratos = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getContratos();
      setContratos(data.map(mapContrato));
    } catch (e) {
      setError('No se pudo cargar los contratos. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContratos();
    getTrabajadores()
      .then(setTrabajadores)
      .catch(() => {});
  }, []);

  // ── Filtrado y paginación ───────────────────────────────────────────────────

  const getFechaLimite = (rango) => {
    const hoy = new Date();
    switch (rango) {
      case 'Último mes':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
      case '3 meses':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
      case '6 meses':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 6, hoy.getDate());
      case '12 meses':
        return new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());
      default:
        return null;
    }
  };

  const filtrados = contratos.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      c.trabajador.nombre.toLowerCase().includes(term) ||
      c.trabajador.rut.toLowerCase().includes(term)    ||
      c.tipo_contrato.toLowerCase().includes(term);

    // Los filtros de Estado y Fecha solo se aplican si el botón Filtros está activo
    const matchEstado = !filtrosActivos || filtroEstado === 'Todos' || c.estado === filtroEstado;

    let matchFecha = true;
    if (filtrosActivos && filtroFecha !== 'Todos') {
      const fechaLimite = getFechaLimite(filtroFecha);
      const fechaInicio = new Date(c.fecha_inicio + 'T00:00:00');
      matchFecha = fechaInicio >= fechaLimite;
    }

    return matchSearch && matchEstado && matchFecha;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles     = filtrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  // ── Eliminar ────────────────────────────────────────────────────────────────

  const handleConfirmarEliminar = async () => {
    if (!contratoDelete) return;
    setEliminando(true);
    try {
      await deleteContrato(contratoDelete.id_contrato);
      setContratoDelete(null);
      fetchContratos();
    } catch {
      alert('Error al eliminar el contrato.');
    } finally {
      setEliminando(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">
          <div className="contratos-container">

            {/* Encabezado */}
            <div className="contratos-header">
              <div>
                <h1 className="vista-general-title">Contratos</h1>
                <p className="vista-general-subtitle">Gestiona y consulta todos los contratos laborales.</p>
              </div>
              <button className="btn-nuevo-contrato" onClick={() => setModalNuevo(true)}>
                <Plus size={16} />
                Nuevo Contrato
              </button>
            </div>

            {/* Error de carga */}
            {error && (
              <div className="alert-error">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {/* Filtros */}
            <div className="contratos-filters">
              <div className="search-box">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por trabajador, RUT o tipo de contrato..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPagina(1); }}
                />
              </div>

              <div className="filter-controls">
                <div className="filter-group">
                  <label>Estado</label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
                  >
                    <option value="Todos">Todos</option>
                    <option value="Activo">Activo</option>
                    <option value="Por vencer">Por vencer</option>
                    <option value="Vencido">Vencido</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Fecha</label>
                  <select
                    value={filtroFecha}
                    onChange={(e) => { setFiltroFecha(e.target.value); setPagina(1); }}
                  >
                    <option value="Todos">Todas</option>
                    <option value="Último mes">Último mes</option>
                    <option value="3 meses">3 meses</option>
                    <option value="6 meses">6 meses</option>
                    <option value="12 meses">12 meses</option>
                  </select>
                </div>

                {/* ── Botón Filtros con toggle activo ── */}
                <button
                  className={`btn-filtros${filtrosActivos ? ' btn-filtros-activo' : ''}`}
                  onClick={() => setFiltrosActivos((prev) => !prev)}
                >
                  <IconoFiltro />
                  Filtros
                </button>
              </div>
            </div>

            {/* Contador */}
            <div className="contratos-count">
              {filtrados.length} contrato{filtrados.length !== 1 ? 's' : ''}
              {filtrosActivos && filtroEstado !== 'Todos' && ` · ${filtroEstado}`}
              {filtrosActivos && filtroFecha !== 'Todos' && ` · ${filtroFecha}`}
            </div>

            {/* Tabla */}
            <div className="contratos-table-wrapper">
              {loading ? (
                <div className="table-loading">Cargando contratos...</div>
              ) : (
                <table className="contratos-table">
                  <thead>
                    <tr>
                      <th>TRABAJADOR</th>
                      <th>TIPO CONTRATO</th>
                      <th>INICIO</th>
                      <th>TÉRMINO</th>
                      <th>ESTADO</th>
                      <th>TIEMPO RESTANTE</th>
                      <th>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="table-empty">
                          No se encontraron contratos.
                        </td>
                      </tr>
                    ) : (
                      visibles.map((contrato) => (
                        <tr key={contrato.id_contrato}>
                          <td className="col-trabajador">
                            <div className="trabajador-info">
                              <div className="avatar">{contrato.trabajador.iniciales}</div>
                              <div>
                                <div className="nombre">{contrato.trabajador.nombre}</div>
                                <div className="rut">{contrato.trabajador.rut}</div>
                              </div>
                            </div>
                          </td>
                          <td>{contrato.tipo_contrato}</td>
                          <td>{formatearFecha(contrato.fecha_inicio)}</td>
                          <td>{formatearFecha(contrato.fecha_termino)}</td>
                          <td>
                            <span className={`estado-badge ${getEstadoClass(contrato.estado)}`}>
                              {contrato.estado}
                            </span>
                          </td>
                          <td>
                            <div className="tiempo-restante">
                              <div className={`progress-bar ${getProgressClass(contrato.diasRestantes, contrato.diasTotal)}`}>
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${Math.min(100, (contrato.diasRestantes / contrato.diasTotal) * 100)}%`
                                  }}
                                />
                              </div>
                              <span className="dias-text">{contrato.diasRestantes} días</span>
                            </div>
                          </td>
                          <td className="col-acciones" style={{ position: 'relative' }}>
                            <button
                              className="btn-accion"
                              title="Ver detalles"
                              onClick={() => setContratoDetalle(contrato)}
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              className="btn-accion"
                              title="Más opciones"
                              onClick={() =>
                                setMenuAbierto(menuAbierto === contrato.id_contrato ? null : contrato.id_contrato)
                              }
                            >
                              <MoreVertical size={18} />
                            </button>
                            {menuAbierto === contrato.id_contrato && (
                              <ContextMenu
                                contrato={contrato}
                                onEditar={setContratoEdit}
                                onEliminar={setContratoDelete}
                                onCerrar={() => setMenuAbierto(null)}
                              />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Paginación */}
            <div className="pagination">
              <span className="pagination-info">
                Mostrando{' '}
                {filtrados.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1} a{' '}
                {Math.min(paginaActual * POR_PAGINA, filtrados.length)} de {filtrados.length} contratos.
              </span>
              <div className="pagination-controls">
                <button
                  className="btn-pagina prev"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                >‹</button>

                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`btn-pagina ${n === paginaActual ? 'active' : ''}`}
                    onClick={() => setPagina(n)}
                  >{n}</button>
                ))}

                <button
                  className="btn-pagina next"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                >›</button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modales */}
      {(modalNuevo || contratoEdit) && (
        <ContratoModal
          trabajadores={trabajadores}
          contratoEdit={contratoEdit}
          onClose={() => { setModalNuevo(false); setContratoEdit(null); }}
          onGuardado={() => {
            setModalNuevo(false);
            setContratoEdit(null);
            fetchContratos();
          }}
        />
      )}

      {contratoDetalle && (
        <DetalleModal
          contrato={contratoDetalle}
          onClose={() => setContratoDetalle(null)}
        />
      )}

      {contratoDelete && (
        <ConfirmModal
          contrato={contratoDelete}
          onClose={() => setContratoDelete(null)}
          onConfirmar={handleConfirmarEliminar}
          eliminando={eliminando}
        />
      )}
    </div>
  );
}

export default Contratos;