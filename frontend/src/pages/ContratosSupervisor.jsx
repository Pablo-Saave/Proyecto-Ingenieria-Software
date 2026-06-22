// pages/ContratosSupervisor.jsx  (Supervisor)
// Solo lectura: puede ver todos los contratos pero NO crear, editar ni eliminar.
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/contratos.css';
import { Eye, X, AlertTriangle } from 'lucide-react';
import { getContratos } from '../services/contratosService';

// ─── Helpers (iguales al admin) ────────────────────────────────────────────────

function calcularDiasRestantes(fechaTermino) {
  if (!fechaTermino) return null;
  return Math.max(0, Math.ceil((new Date(fechaTermino) - new Date()) / (1000 * 60 * 60 * 24)));
}

function calcularDiasTotal(fechaInicio, fechaTermino) {
  if (!fechaInicio || !fechaTermino) return 365;
  const diff = Math.ceil((new Date(fechaTermino) - new Date(fechaInicio)) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 365;
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getIniciales(nombres = '', apellidos = '') {
  return ((nombres.trim()[0] || '') + (apellidos.trim()[0] || '')).toUpperCase();
}

function calcularEstado(fechaTermino) {
  if (!fechaTermino) return 'Activo';
  const dias = calcularDiasRestantes(fechaTermino);
  if (dias <= 0)  return 'Inactivo';
  if (dias <= 30) return 'Por vencer';
  return 'Activo';
}

function mapContrato(c) {
  const t = c.trabajador || {};
  const diasRestantes = calcularDiasRestantes(c.fecha_termino) ?? 0;
  const diasTotal     = calcularDiasTotal(c.fecha_inicio, c.fecha_termino);
  return {
    id_contrato:     c.id_contrato,
    tipo_contrato:   c.tipo_contrato  || '—',
    estado_contrato: c.estado_contrato,
    fecha_inicio:    c.fecha_inicio,
    fecha_termino:   c.fecha_termino  || '',
    observaciones:   c.observaciones  || '',
    id_trabajador:   t.id_trabajador,
    trabajador: {
      nombre:    `${t.nombres || ''} ${t.apellidos || ''}`.trim() || 'Sin nombre',
      rut:       t.rut || '—',
      iniciales: getIniciales(t.nombres, t.apellidos),
    },
    estado: calcularEstado(c.fecha_termino),
    diasRestantes,
    diasTotal,
  };
}

function getEstadoClass(estado) {
  if (estado === 'Activo')     return 'estado-activo';
  if (estado === 'Por vencer') return 'estado-por-vencer';
  if (estado === 'Inactivo')   return 'estado-inactivo';
  return '';
}

function getProgressClass(diasRestantes, diasTotal) {
  const pct = diasTotal > 0 ? (diasRestantes / diasTotal) * 100 : 0;
  if (pct <= 0 || pct < 15) return 'progress-rojo';
  if (pct < 30)              return 'progress-naranja';
  return 'progress-azul';
}

// ─── Modal Detalle (solo lectura) ─────────────────────────────────────────────

function DetalleModal({ contrato, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalle del Contrato</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body detalle-grid">
          <div><span className="detalle-label">Trabajador</span><span>{contrato.trabajador.nombre}</span></div>
          <div><span className="detalle-label">RUT</span><span>{contrato.trabajador.rut}</span></div>
          <div><span className="detalle-label">Tipo de contrato</span><span>{contrato.tipo_contrato}</span></div>
          <div>
            <span className="detalle-label">Estado</span>
            <span className={`estado-badge ${getEstadoClass(contrato.estado)}`}>{contrato.estado}</span>
          </div>
          <div><span className="detalle-label">Fecha inicio</span><span>{formatearFecha(contrato.fecha_inicio)}</span></div>
          <div>
            <span className="detalle-label">Fecha término</span>
            <span>{contrato.tipo_contrato === 'Indefinido' ? 'Sin fecha (Indefinido)' : formatearFecha(contrato.fecha_termino)}</span>
          </div>
          <div>
            <span className="detalle-label">Días restantes</span>
            <span>{contrato.tipo_contrato === 'Indefinido' ? '—' : `${contrato.diasRestantes} días`}</span>
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

// ─── Componente principal ──────────────────────────────────────────────────────

const POR_PAGINA = 10;

function ContratosSupervisor({ usuario, onLogout }) {
  const [contratos,      setContratos]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filtroEstado,   setFiltroEstado]   = useState('Todos');
  const [filtrosActivos, setFiltrosActivos] = useState(false);
  const [pagina,         setPagina]         = useState(1);
  const [contratoDetalle, setContratoDetalle] = useState(null);

  useEffect(() => {
    getContratos()
      .then((data) => setContratos(data.map(mapContrato)))
      .catch(() => setError('No se pudo cargar los contratos.'))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = contratos.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      c.trabajador.nombre.toLowerCase().includes(term) ||
      c.trabajador.rut.toLowerCase().includes(term)    ||
      c.tipo_contrato.toLowerCase().includes(term);
    const matchEstado = !filtrosActivos || filtroEstado === 'Todos' || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles     = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">
          <div className="contratos-container">

            <div className="contratos-header">
              <div>
                <h1 className="vista-general-title">Contratos</h1>
                <p className="vista-general-subtitle">Consulta el historial contractual del personal.</p>
              </div>
              {/* Supervisor: sin botón Nuevo Contrato */}
            </div>

            {error && <div className="alert-error"><AlertTriangle size={16} /> {error}</div>}

            {/* Filtros */}
            <div className="contratos-filters">
              <div className="search-box">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por trabajador, RUT o tipo..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPagina(1); }}
                />
              </div>
              <div className="filter-controls">
                <div className="filter-group">
                  <label>Estado</label>
                  <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}>
                    <option value="Todos">Todos</option>
                    <option value="Activo">Activo</option>
                    <option value="Por vencer">Por vencer</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <button
                  className={`btn-filtros${filtrosActivos ? ' btn-filtros-activo' : ''}`}
                  onClick={() => setFiltrosActivos((p) => !p)}
                >
                  Filtros
                </button>
              </div>
            </div>

            <div className="contratos-count">
              {filtrados.length} contrato{filtrados.length !== 1 ? 's' : ''}
            </div>

            <div className="contratos-table-wrapper">
              {loading ? (
                <div className="table-loading">Cargando contratos...</div>
              ) : (
                <table className="contratos-table">
                  <thead>
                    <tr>
                      <th>TRABAJADOR</th><th>TIPO CONTRATO</th><th>INICIO</th>
                      <th>TÉRMINO</th><th>ESTADO</th><th>TIEMPO RESTANTE</th><th>VER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.length === 0 ? (
                      <tr><td colSpan={7} className="table-empty">No se encontraron contratos.</td></tr>
                    ) : visibles.map((contrato) => (
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
                        <td>{contrato.tipo_contrato === 'Indefinido' ? '—' : formatearFecha(contrato.fecha_termino)}</td>
                        <td>
                          <span className={`estado-badge ${getEstadoClass(contrato.estado)}`}>
                            {contrato.estado}
                          </span>
                        </td>
                        <td>
                          {contrato.tipo_contrato === 'Indefinido' ? (
                            <span style={{ color: '#6b7280', fontSize: '13px' }}>Sin vencimiento</span>
                          ) : (
                            <div className="tiempo-restante">
                              <div className={`progress-bar ${getProgressClass(contrato.diasRestantes, contrato.diasTotal)}`}>
                                <div className="progress-fill"
                                  style={{ width: `${Math.min(100, (contrato.diasRestantes / contrato.diasTotal) * 100)}%` }} />
                              </div>
                              <span className="dias-text">{contrato.diasRestantes} días</span>
                            </div>
                          )}
                        </td>
                        <td className="col-acciones">
                          <button className="btn-accion" title="Ver detalles"
                            onClick={() => setContratoDetalle(contrato)}>
                            <Eye size={18} />
                          </button>
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

      {contratoDetalle && (
        <DetalleModal contrato={contratoDetalle} onClose={() => setContratoDetalle(null)} />
      )}
    </div>
  );
}

export default ContratosSupervisor;