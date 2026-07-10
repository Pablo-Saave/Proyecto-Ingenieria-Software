// pages/PagosTrabajador.jsx  (Trabajador)
// Solo puede ver su propia remuneración. Sin ninguna acción de escritura.
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/pagos.css';
import { DollarSign, AlertTriangle, Eye, X, Filter } from 'lucide-react';
import { getMiRemuneracion } from '../services/remuneracionesService';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const formatCLP = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n ?? 0);

const formatFecha = (fecha) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const badgeClass = (estado) => {
  switch (estado?.toLowerCase()) {
    case 'pagado':    return 'badge-pagado';
    case 'pendiente': return 'badge-pendiente';
    case 'atrasado':  return 'badge-atrasado';
    default:          return '';
  }
};

const cumpleFiltroFecha = (fechaPago, fechaFiltro) => {
  if (fechaFiltro === 'Todas') return true;
  if (!fechaPago) return false;

  const fechaDelPago = new Date(fechaPago);
  const limite = new Date();

  if (fechaFiltro === 'Últimos 30 días') limite.setDate(limite.getDate() - 30);
  if (fechaFiltro === 'Últimos 6 meses') limite.setMonth(limite.getMonth() - 6);
  if (fechaFiltro === 'Último año') limite.setFullYear(limite.getFullYear() - 1);

  return fechaDelPago >= limite;
};

/* ─── Modal de detalle (solo lectura) ────────────────────────────────────── */
function DetalleModal({ pago, onClose }) {
  const total = (pago.sueldo ?? 0) + (pago.bono ?? 0) - (pago.descuento ?? 0);

  return (
    <div className="pag-modal-overlay" onClick={onClose}>
      <div className="pag-modal pag-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="pag-modal-header">
          <h2>Detalle del Pago</h2>
          <button className="pag-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pag-form">
          <div className="pag-form-grid">
            <div className="pag-field">
              <label>Fecha de pago</label>
              <span>{formatFecha(pago.fecha_pago)}</span>
            </div>
            <div className="pag-field">
              <label>Estado</label>
              <span className={`pag-badge ${badgeClass(pago.estado_pago)}`}>{pago.estado_pago}</span>
            </div>
            <div className="pag-field">
              <label>Sueldo</label>
              <span className="pag-monto">{formatCLP(pago.sueldo)}</span>
            </div>
            <div className="pag-field">
              <label>Bono</label>
              <span className="pag-monto">{formatCLP(pago.bono)}</span>
            </div>
            <div className="pag-field">
              <label>Descuento</label>
              <span className="pag-monto-descuento">- {formatCLP(pago.descuento)}</span>
            </div>
            <div className="pag-field">
              <label>Total</label>
              <span className="pag-monto">{formatCLP(total)}</span>
            </div>
          </div>
        </div>
        <div className="pag-modal-footer">
          <button className="pag-btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────────────────────── */
function PagosTrabajador({ usuario, onLogout }) {
  const [pago, setPago]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [detalle, setDetalle] = useState(null);

  // Filtros
  const [estadoFiltro, setEstadoFiltro]           = useState('Todos');
  const [fechaFiltro, setFechaFiltro]             = useState('Todas');
  const [estadoFiltroDraft, setEstadoFiltroDraft] = useState('Todos');
  const [fechaFiltroDraft, setFechaFiltroDraft]   = useState('Todas');
  const [filtrosActivos, setFiltrosActivos]       = useState(false);

  useEffect(() => {
    getMiRemuneracion()
      .then((data) => setPago(data))
      .catch((e) => {
        // 404 del backend cuando aún no tiene remuneración asignada: no es un error real
        if (e.message?.toLowerCase().includes('no tienes')) {
          setPago(null);
        } else {
          setError(e.message || 'No se pudo cargar tu remuneración.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const pagos = pago ? [pago] : [];

  const pagosFiltrados = pagos.filter((p) => {
    const matchEstado = !filtrosActivos || estadoFiltro === 'Todos' || p.estado_pago === estadoFiltro;
    const matchFecha  = !filtrosActivos || cumpleFiltroFecha(p.fecha_pago, fechaFiltro);
    return matchEstado && matchFecha;
  });

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
          <div className="pagos-container">
            <div className="pag-header">
              <div>
                <h1 className="vista-general-title">Mis Remuneraciones</h1>
                <p className="vista-general-subtitle">Consulta tu remuneración registrada.</p>
              </div>
            </div>

            {error && (
              <div className="pag-error-banner">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {loading ? (
              <div className="pag-loading">
                <div className="pag-spinner" /> Cargando tu remuneración…
              </div>
            ) : (
              <>
                {/* Filtros */}
                <section className="pag-worker-filters">
                  <div className="pag-filter-row">
                    <div className="pag-filter-group">
                      <label>Estado</label>
                      <select value={estadoFiltroDraft} onChange={(e) => handleEstadoDraftChange(e.target.value)}>
                        <option value="Todos">Todos</option>
                        <option value="pagado">Pagado</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="atrasado">Atrasado</option>
                      </select>
                    </div>

                    <div className="pag-filter-group">
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
                      className={`pag-filter-button${filtrosActivos ? ' is-active' : ''}`}
                      onClick={aplicarFiltros}
                    >
                      <Filter size={15} /> Filtrar
                    </button>
                  </div>
                </section>


                <div className="pag-table-card">
                  {pagosFiltrados.length === 0 ? (
                    <div className="pag-empty">
                      <DollarSign size={40} />
                      <p>No se encontraron pagos registrados.</p>
                    </div>
                  ) : (
                    <table className="pag-table">
                      <thead>
                        <tr>
                          <th>FECHA DE PAGO</th>
                          <th>SUELDO</th>
                          <th>BONO</th>
                          <th>DESCUENTO</th>
                          <th>TOTAL</th>
                          <th>ESTADO</th>
                          <th>ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagosFiltrados.map((p) => {
                          const total = (p.sueldo ?? 0) + (p.bono ?? 0) - (p.descuento ?? 0);
                          return (
                            <tr key={p.id_remuneracion}>
                              <td>{formatFecha(p.fecha_pago)}</td>
                              <td className="pag-monto">{formatCLP(p.sueldo)}</td>
                              <td className="pag-monto">{formatCLP(p.bono)}</td>
                              <td className="pag-monto-descuento">- {formatCLP(p.descuento)}</td>
                              <td className="pag-monto">{formatCLP(total)}</td>
                              <td><span className={`pag-badge ${badgeClass(p.estado_pago)}`}>{p.estado_pago}</span></td>
                              <td>
                                <div className="pag-actions">
                                  <button className="pag-btn-edit" onClick={() => setDetalle(p)} title="Ver detalle">
                                    <Eye size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {detalle && <DetalleModal pago={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}

export default PagosTrabajador;
