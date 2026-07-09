// pages/ContratosTrabajador.jsx  (Trabajador)
// Solo puede ver sus propios contratos. Sin ninguna acción de escritura.
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/contratos.css';
import {
  Eye, X, AlertTriangle, FileText, Clock,
  Filter, CalendarDays, ArrowRight, Download,
} from 'lucide-react';
import { generarPDFContrato } from '../utils/generarPDFContrato';
import { getMisContratos } from '../services/contratosService';

function calcularDiasRestantes(fechaTermino) {
  if (!fechaTermino) return null;
  return Math.max(0, Math.ceil((new Date(fechaTermino) - new Date()) / (1000 * 60 * 60 * 24)));
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatearMonto(monto) {
  if (monto === null || monto === undefined || monto === '') return '—';
  return Number(monto).toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
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

function getEstadoBadgeStyle(estado) {
  if (estado === 'Activo' || estado === 'Vigente') {
    return { background: '#D1FAE5', color: '#065F46', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 };
  }
  if (estado === 'Por vencer') {
    return { background: '#FEF3C7', color: '#92400E', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 };
  }
  return { background: '#FEE2E2', color: '#991B1B', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 600 };
}

function mapContrato(c) {
  const t = c.trabajador || {};

  return {
    id_contrato: c.id_contrato,
    tipo_contrato: c.tipo_contrato || '—',
    estado_contrato: c.estado_contrato || '—',
    fecha_inicio: c.fecha_inicio,
    fecha_termino: c.fecha_termino || '',
    monto: c.monto ?? null,
    observaciones: c.observaciones || '',
    trabajador: {
      id_trabajador: t.id_trabajador,
      nombre: `${t.nombres || ''} ${t.apellidos || ''}`.trim() || 'Sin nombre',
      rut: t.rut || '-',
      correo: t.correo || '',
      telefono: t.telefono || '',
    },
    // Estado real: viene del backend (actualizado por el cron con umbral
    // de 30 días), no se recalcula por fecha en el front.
    estado: c.estado_contrato || 'Activo',
    diasRestantes: calcularDiasRestantes(c.fecha_termino),
  };
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
          <div><span className="detalle-label">Trabajador</span><span>{contrato.trabajador?.nombre ?? '-'}</span></div>
          <div><span className="detalle-label">RUT</span><span>{contrato.trabajador?.rut ?? '-'}</span></div>
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
            <span className="detalle-label">Sueldo</span>
            <span>{formatearMonto(contrato.monto)}</span>
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
          <button className="btn-cancelar" onClick={onClose}>Cerrar</button>
          <button className="btn-guardar" onClick={() => generarPDFContrato(contrato)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={15} /> Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function ContratoCard({ contrato, onVer }) {
  const esIndefinido = contrato.tipo_contrato === 'Indefinido';
  const etiquetaEstado = contrato.estado === 'Activo' ? 'Vigente' : contrato.estado;

  return (
    <article className={`contrato-card-compact ${contrato.estado === 'Por vencer' ? 'is-warning' : ''}`}>
      <div className="contrato-card-header">
        <div className="contrato-card-title">
          <div className="contrato-card-icon">
            <FileText size={20} />
          </div>
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
          <div className="contrato-info-value">
            <CalendarDays size={14} />
            <span>{formatearFecha(contrato.fecha_inicio)}</span>
          </div>
        </div>

        <div className="contrato-card-info">
          <span className="contrato-info-label">Fecha término</span>
          <div className="contrato-info-value">
            {!esIndefinido && <CalendarDays size={14} />}
            <span>{esIndefinido ? 'Sin vencimiento' : formatearFecha(contrato.fecha_termino)}</span>
          </div>
        </div>

        <div className="contrato-card-info">
          <span className="contrato-info-label">Antigüedad</span>
          <div className="contrato-info-value">
            <Clock size={14} />
            <span>{calcularAntiguedad(contrato.fecha_inicio)}</span>
          </div>
        </div>

        <div className="contrato-card-info">
          <span className="contrato-info-label">Estado</span>
          <span style={getEstadoBadgeStyle(etiquetaEstado)}>{etiquetaEstado}</span>
        </div>

        <div className="contrato-card-info">
          <span className="contrato-info-label">Sueldo</span>
          <div className="contrato-info-value">
            <span>{formatearMonto(contrato.monto)}</span>
          </div>
        </div>
      </div>

      <button onClick={() => onVer(contrato)} className="contrato-detail-button">
        <span><Eye size={15} /> Ver detalle del contrato</span>
        <ArrowRight size={15} />
      </button>
    </article>
  );
}

function ContratosTrabajador({ usuario, onLogout }) {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contratoDetalle, setContratoDetalle] = useState(null);
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [fechaFiltro, setFechaFiltro] = useState('Todas');
  const [estadoFiltroDraft, setEstadoFiltroDraft] = useState('Todos');
  const [fechaFiltroDraft, setFechaFiltroDraft] = useState('Todas');
  const [filtrosActivos, setFiltrosActivos] = useState(false);

  const idTrabajador = usuario?.id_trabajador;

  useEffect(() => {
    if (!idTrabajador) return;
    getMisContratos(idTrabajador)
      .then((data) => setContratos(data.map(mapContrato)))
      .catch(() => setError('No se pudo cargar tus contratos.'))
      .finally(() => setLoading(false));
  }, [idTrabajador]);

  const contratosFiltrados = contratos.filter((c) => {
    const matchEstado = !filtrosActivos || estadoFiltro === 'Todos' || c.estado === estadoFiltro;
    const matchFecha = !filtrosActivos || cumpleFiltroFecha(c.fecha_inicio, fechaFiltro);

    return matchEstado && matchFecha;
  });

  const activos = contratosFiltrados.filter((c) => c.estado !== 'Inactivo');
  const historicos = contratosFiltrados.filter((c) => c.estado === 'Inactivo');

  const aplicarFiltros = () => {
    if (filtrosActivos) {
      setFiltrosActivos(false);
      return;
    }

    setEstadoFiltro(estadoFiltroDraft);
    setFechaFiltro(fechaFiltroDraft);
    setFiltrosActivos(true);
  };

  const handleEstadoDraftChange = (value) => {
    setEstadoFiltroDraft(value);
    if (filtrosActivos) setEstadoFiltro(value);
  };

  const handleFechaDraftChange = (value) => {
    setFechaFiltroDraft(value);
    if (filtrosActivos) setFechaFiltro(value);
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">
          <div className="contratos-container">
            <div className="contratos-header">
              <div>
                <h1 className="vista-general-title">Mis Contratos</h1>
                <p className="vista-general-subtitle">Consulta el historial de tus contratos laborales.</p>
              </div>
            </div>

            {error && (
              <div className="alert-error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {loading ? (
              <div className="tw-loading"><div className="tw-spinner" /> Cargando tus contratos...</div>
            ) : contratos.length === 0 ? (
              <div className="tw-empty" style={{ padding: '60px 20px' }}>
                <FileText size={40} />
                <p>No tienes contratos registrados.</p>
              </div>
            ) : (
              <>
                <section className="contratos-worker-filters">
                  <div className="worker-filter-row">
                    <div className="worker-filter-group">
                      <label>Estado</label>
                      <select value={estadoFiltroDraft} onChange={(e) => handleEstadoDraftChange(e.target.value)}>
                        <option value="Todos">Todos</option>
                        <option value="Activo">Activo</option>
                        <option value="Por vencer">Por vencer</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>

                    <div className="worker-filter-group">
                      <label>Fecha</label>
                      <select value={fechaFiltroDraft} onChange={(e) => handleFechaDraftChange(e.target.value)}>
                        <option value="Todas">Todas</option>
                        <option value="Últimos 30 días">Últimos 30 días</option>
                        <option value="Últimos 6 meses">Últimos 6 meses</option>
                        <option value="Último año">Último año</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className={`worker-filter-button${filtrosActivos ? ' is-active' : ''}`}
                      onClick={aplicarFiltros}
                    >
                      <Filter size={15} />
                      Filtrar
                    </button>
                  </div>
                </section>

                {contratosFiltrados.length === 0 ? (
                  <div className="tw-empty contratos-worker-empty">
                    <FileText size={34} />
                    <p>No se encontraron contratos con los filtros seleccionados.</p>
                  </div>
                ) : (
                  <>
                    {activos.length > 0 && (
                      <>
                        <div className="contratos-section-title">
                          <h2>Contratos</h2>
                          <span>{activos.length}</span>
                        </div>
                        {activos.map((c) => (
                          <ContratoCard key={c.id_contrato} contrato={c} onVer={setContratoDetalle} />
                        ))}
                      </>
                    )}

                    {historicos.length > 0 && (
                      <>
                        <div className="contratos-section-title is-muted">
                          <h2>Historial</h2>
                          <span>{historicos.length}</span>
                        </div>
                        {historicos.map((c) => (
                          <ContratoCard key={c.id_contrato} contrato={c} onVer={setContratoDetalle} />
                        ))}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {contratoDetalle && (
        <DetalleModal contrato={contratoDetalle} onClose={() => setContratoDetalle(null)} />
      )}
    </div>
  );
}

export default ContratosTrabajador;