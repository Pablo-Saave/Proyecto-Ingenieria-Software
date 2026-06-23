// pages/ContratosSupervisor.jsx  (Supervisor)
// Ve sus propios contratos en formato card (igual que trabajador)
// + tabla de todos los contratos del equipo (solo lectura)
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/contratos.css';
import {
  Eye, X, AlertTriangle, FileText, Infinity, Clock,
  Filter, CalendarDays, ArrowRight, Users,
} from 'lucide-react';
import { getMisContratos, getContratos } from '../services/contratosService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function calcularAntiguedad(fechaInicio) {
  if (!fechaInicio) return '—';
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const hoy = new Date();
  let years = hoy.getFullYear() - inicio.getFullYear();
  let months = hoy.getMonth() - inicio.getMonth();
  if (months < 0) { years--; months += 12; }
  return `${years} año${years !== 1 ? 's' : ''}, ${months} mes${months !== 1 ? 'es' : ''}`;
}

function calcularEstado(fechaTermino) {
  if (!fechaTermino) return 'Activo';
  const dias = calcularDiasRestantes(fechaTermino);
  if (dias <= 0)  return 'Inactivo';
  if (dias <= 30) return 'Por vencer';
  return 'Activo';
}

function getIniciales(nombres = '', apellidos = '') {
  return ((nombres.trim()[0] || '') + (apellidos.trim()[0] || '')).toUpperCase();
}

function getEstadoBadgeStyle(estado) {
  if (estado === 'Activo' || estado === 'Vigente')
    return { background: '#D1FAE5', color: '#065F46', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 };
  if (estado === 'Por vencer')
    return { background: '#FEF3C7', color: '#92400E', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 };
  return { background: '#FEE2E2', color: '#991B1B', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 };
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

function cumpleFiltroFecha(fechaInicio, fechaFiltro) {
  if (fechaFiltro === 'Todas') return true;
  if (!fechaInicio) return false;
  const fechaContrato = new Date(`${fechaInicio}T00:00:00`);
  const limite = new Date();
  if (fechaFiltro === 'Últimos 30 días') limite.setDate(limite.getDate() - 30);
  if (fechaFiltro === 'Últimos 6 meses') limite.setMonth(limite.getMonth() - 6);
  if (fechaFiltro === 'Último año') limite.setFullYear(limite.getFullYear() - 1);
  return fechaContrato >= limite;
}

function mapMiContrato(c) {
  return {
    id_contrato:   c.id_contrato,
    tipo_contrato: c.tipo_contrato || '—',
    fecha_inicio:  c.fecha_inicio,
    fecha_termino: c.fecha_termino || '',
    observaciones: c.observaciones || '',
    estado:        calcularEstado(c.fecha_termino),
    diasRestantes: calcularDiasRestantes(c.fecha_termino),
  };
}

function mapContrato(c) {
  const t = c.trabajador || {};
  const diasRestantes = calcularDiasRestantes(c.fecha_termino) ?? 0;
  const diasTotal     = calcularDiasTotal(c.fecha_inicio, c.fecha_termino);
  return {
    id_contrato:   c.id_contrato,
    tipo_contrato: c.tipo_contrato || '—',
    fecha_inicio:  c.fecha_inicio,
    fecha_termino: c.fecha_termino || '',
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

// ─── Modal Detalle ─────────────────────────────────────────────────────────────

function DetalleModal({ contrato, onClose }) {
  const esIndefinido = contrato.tipo_contrato === 'Indefinido';
  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalle del Contrato</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body detalle-grid">
          {contrato.trabajador && (
            <>
              <div><span className="detalle-label">Trabajador</span><span>{contrato.trabajador.nombre}</span></div>
              <div><span className="detalle-label">RUT</span><span>{contrato.trabajador.rut}</span></div>
            </>
          )}
          <div><span className="detalle-label">Tipo de contrato</span><span>{contrato.tipo_contrato}</span></div>
          <div>
            <span className="detalle-label">Estado</span>
            <span style={getEstadoBadgeStyle(contrato.estado)}>{contrato.estado}</span>
          </div>
          <div><span className="detalle-label">Fecha inicio</span><span>{formatearFecha(contrato.fecha_inicio)}</span></div>
          <div>
            <span className="detalle-label">Fecha término</span>
            <span>{esIndefinido ? 'Sin vencimiento' : formatearFecha(contrato.fecha_termino)}</span>
          </div>
          <div>
            <span className="detalle-label">Antigüedad</span>
            <span>{calcularAntiguedad(contrato.fecha_inicio)}</span>
          </div>
          {!esIndefinido && contrato.diasRestantes !== null && (
            <div>
              <span className="detalle-label">Días restantes</span>
              <span>{contrato.diasRestantes} días</span>
            </div>
          )}
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

// ─── Card contrato propio (igual que trabajador) ───────────────────────────────

function ContratoCard({ contrato, onVer }) {
  const esIndefinido = contrato.tipo_contrato === 'Indefinido';
  const etiquetaEstado = contrato.estado === 'Activo' ? 'Vigente' : contrato.estado;
  return (
    <article className={`contrato-card-compact ${contrato.estado === 'Por vencer' ? 'is-warning' : ''}`}>
      <div className="contrato-card-header">
        <div className="contrato-card-title">
          <div className="contrato-card-icon"><FileText size={20} /></div>
          <div className="contrato-card-heading">
            <div className="contrato-card-name-row">
              <h3>{contrato.tipo_contrato}</h3>
              <span style={getEstadoBadgeStyle(etiquetaEstado)}>{etiquetaEstado}</span>
            </div>
            <p>Contrato de trabajo {esIndefinido ? 'a plazo indefinido' : 'a plazo fijo'}.</p>
          </div>
        </div>
      </div>
      <div className="contrato-card-grid">
        <div className="contrato-card-info">
          <span className="contrato-info-label">Fecha inicio</span>
          <div className="contrato-info-value"><CalendarDays size={14} /><span>{formatearFecha(contrato.fecha_inicio)}</span></div>
        </div>
        <div className="contrato-card-info">
          <span className="contrato-info-label">Fecha término</span>
          <div className="contrato-info-value"><Infinity size={14} /><span>{esIndefinido ? 'Sin vencimiento' : formatearFecha(contrato.fecha_termino)}</span></div>
        </div>
        <div className="contrato-card-info">
          <span className="contrato-info-label">Antigüedad</span>
          <div className="contrato-info-value"><Clock size={14} /><span>{calcularAntiguedad(contrato.fecha_inicio)}</span></div>
        </div>
        <div className="contrato-card-info">
          <span className="contrato-info-label">Estado</span>
          <span style={getEstadoBadgeStyle(etiquetaEstado)}>{etiquetaEstado}</span>
        </div>
      </div>
      <button onClick={() => onVer(contrato)} className="contrato-detail-button">
        <span><Eye size={15} /> Ver detalle del contrato</span>
        <ArrowRight size={15} />
      </button>
    </article>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

const POR_PAGINA = 10;

function ContratosSupervisor({ usuario, onLogout }) {
  // Mis contratos
  const [misContratos,    setMisContratos]    = useState([]);
  const [loadingMios,     setLoadingMios]     = useState(true);
  const [errorMios,       setErrorMios]       = useState('');
  const [estadoFiltroDraft, setEstadoFiltroDraft] = useState('Todos');
  const [fechaFiltroDraft,  setFechaFiltroDraft]  = useState('Todas');
  const [estadoFiltro,    setEstadoFiltro]    = useState('Todos');
  const [fechaFiltro,     setFechaFiltro]     = useState('Todas');
  const [filtrosMiosActivos, setFiltrosMiosActivos] = useState(false);

  // Contratos equipo
  const [contratos,       setContratos]       = useState([]);
  const [loadingEquipo,   setLoadingEquipo]   = useState(true);
  const [errorEquipo,     setErrorEquipo]     = useState('');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filtroEstado,    setFiltroEstado]    = useState('Todos');
  const [filtrosActivos,  setFiltrosActivos]  = useState(false);
  const [pagina,          setPagina]          = useState(1);

  // Modal detalle compartido
  const [contratoDetalle, setContratoDetalle] = useState(null);

  const idTrabajador = usuario?.id_trabajador;

  useEffect(() => {
    if (!idTrabajador) return;
    getMisContratos(idTrabajador)
      .then((data) => setMisContratos(data.map(mapMiContrato)))
      .catch(() => setErrorMios('No se pudo cargar tus contratos.'))
      .finally(() => setLoadingMios(false));
  }, [idTrabajador]);

  useEffect(() => {
    getContratos()
      .then((data) => setContratos(
        data
          .filter((c) => c.trabajador?.id_trabajador !== idTrabajador)
          .map(mapContrato)
      ))
      .catch(() => setErrorEquipo('No se pudo cargar los contratos del equipo.'))
      .finally(() => setLoadingEquipo(false));
  }, []);

  // Filtros mis contratos
  const misContratosFiltrados = misContratos.filter((c) => {
    const matchEstado = !filtrosMiosActivos || estadoFiltro === 'Todos' || c.estado === estadoFiltro;
    const matchFecha  = !filtrosMiosActivos || cumpleFiltroFecha(c.fecha_inicio, fechaFiltro);
    return matchEstado && matchFecha;
  });
  const activos    = misContratosFiltrados.filter((c) => c.estado !== 'Inactivo');
  const historicos = misContratosFiltrados.filter((c) => c.estado === 'Inactivo');

  const aplicarFiltrosMios = () => {
    if (filtrosMiosActivos) { setFiltrosMiosActivos(false); return; }
    setEstadoFiltro(estadoFiltroDraft);
    setFechaFiltro(fechaFiltroDraft);
    setFiltrosMiosActivos(true);
  };

  // Filtros equipo
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

            {/* ── Mis contratos ── */}
            <div className="contratos-header">
              <div>
                <h1 className="vista-general-title">Mis Contratos</h1>
                <p className="vista-general-subtitle">Consulta el historial de tus contratos laborales.</p>
              </div>
            </div>

            {errorMios && <div className="alert-error" style={{ marginBottom: 16 }}><AlertTriangle size={16} /> {errorMios}</div>}

            {loadingMios ? (
              <div className="tw-loading"><div className="tw-spinner" /> Cargando tus contratos...</div>
            ) : misContratos.length === 0 ? (
              <div className="tw-empty" style={{ padding: '40px 20px' }}>
                <FileText size={36} /><p>No tienes contratos registrados.</p>
              </div>
            ) : (
              <>
                <section className="contratos-worker-filters">
                  <div className="worker-filter-row">
                    <div className="worker-filter-group">
                      <label>Estado</label>
                      <select value={estadoFiltroDraft} onChange={(e) => { setEstadoFiltroDraft(e.target.value); if (filtrosMiosActivos) setEstadoFiltro(e.target.value); }}>
                        <option value="Todos">Todos</option>
                        <option value="Activo">Activo</option>
                        <option value="Por vencer">Por vencer</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>
                    <div className="worker-filter-group">
                      <label>Fecha</label>
                      <select value={fechaFiltroDraft} onChange={(e) => { setFechaFiltroDraft(e.target.value); if (filtrosMiosActivos) setFechaFiltro(e.target.value); }}>
                        <option value="Todas">Todas</option>
                        <option value="Últimos 30 días">Últimos 30 días</option>
                        <option value="Últimos 6 meses">Últimos 6 meses</option>
                        <option value="Último año">Último año</option>
                      </select>
                    </div>
                    <button type="button" className={`worker-filter-button${filtrosMiosActivos ? ' is-active' : ''}`} onClick={aplicarFiltrosMios}>
                      <Filter size={15} /> Filtrar
                    </button>
                  </div>
                </section>

                {misContratosFiltrados.length === 0 ? (
                  <div className="tw-empty contratos-worker-empty">
                    <FileText size={34} /><p>No se encontraron contratos con los filtros seleccionados.</p>
                  </div>
                ) : (
                  <>
                    {activos.length > 0 && (
                      <>
                        <div className="contratos-section-title"><h2>Contratos</h2><span>{activos.length}</span></div>
                        {activos.map((c) => <ContratoCard key={c.id_contrato} contrato={c} onVer={setContratoDetalle} />)}
                      </>
                    )}
                    {historicos.length > 0 && (
                      <>
                        <div className="contratos-section-title is-muted"><h2>Historial</h2><span>{historicos.length}</span></div>
                        {historicos.map((c) => <ContratoCard key={c.id_contrato} contrato={c} onVer={setContratoDetalle} />)}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── Separador ── */}
            <div style={{ margin: '32px 0 24px', borderTop: '1px solid #e5e7eb' }} />

            {/* ── Contratos del equipo ── */}
            <div className="contratos-header">
              <div>
                <h1 className="vista-general-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} /> Contratos del Equipo
                </h1>
                <p className="vista-general-subtitle">Consulta el historial contractual del personal.</p>
              </div>
            </div>

            {errorEquipo && <div className="alert-error"><AlertTriangle size={16} /> {errorEquipo}</div>}

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
                <button className={`btn-filtros${filtrosActivos ? ' btn-filtros-activo' : ''}`} onClick={() => setFiltrosActivos((p) => !p)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                  </svg>
                  Filtrar
                </button>
              </div>
            </div>

            <div className="contratos-count">
              {filtrados.length} contrato{filtrados.length !== 1 ? 's' : ''}
            </div>

            <div className="contratos-table-wrapper">
              {loadingEquipo ? (
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
                          <span className={`estado-badge ${getEstadoClass(contrato.estado)}`}>{contrato.estado}</span>
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
                          <button className="btn-accion" title="Ver detalles" onClick={() => setContratoDetalle(contrato)}>
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
                <button className="btn-pagina prev" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1}>‹</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button key={n} className={`btn-pagina ${n === paginaActual ? 'active' : ''}`} onClick={() => setPagina(n)}>{n}</button>
                ))}
                <button className="btn-pagina next" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>›</button>
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
