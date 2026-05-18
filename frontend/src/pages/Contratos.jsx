import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/contratos.css';
import { Eye, MoreVertical, Plus } from 'lucide-react';

function Contratos({ onLogout }) {
  const [searchTerm, setSearchTerm] = useState('');

  const contratos = [
    {
      id: 1,
      trabajador: { nombre: 'María González', rut: '12.345.678-9', iniciales: 'MG' },
      cargo: 'Auxiliar de Aseo',
      sede: 'Torre Titanium',
      inicio: '12 Ene 2026',
      termino: '12 Ene 2027',
      estado: 'Activo',
      diasRestantes: 89,
      diasTotal: 365,
    },
    {
      id: 2,
      trabajador: { nombre: 'Juan Pérez', rut: '11.234.567-8', iniciales: 'JP' },
      cargo: 'Operario de Limpieza',
      sede: 'Plaza Norte',
      inicio: '05 Feb 2026',
      termino: '05 Feb 2027',
      estado: 'Por vencer',
      diasRestantes: 23,
      diasTotal: 365,
    },
    {
      id: 3,
      trabajador: { nombre: 'Ana Silva', rut: '15.678.912-3', iniciales: 'AS' },
      cargo: 'Supervisora',
      sede: 'Torre Sur',
      inicio: '10 Ene 2025',
      termino: '10 Ene 2026',
      estado: 'Vencido',
      diasRestantes: 0,
      diasTotal: 365,
    },
    {
      id: 4,
      trabajador: { nombre: 'Carlos Mendoza', rut: '17.456.321-0', iniciales: 'CM' },
      cargo: 'Auxiliar de Aseo',
      sede: 'Sede Este',
      inicio: '01 Oct 2026',
      termino: '01 Oct 2027',
      estado: 'Activo',
      diasRestantes: 342,
      diasTotal: 365,
    },
    {
      id: 5,
      trabajador: { nombre: 'Laura Martínez', rut: '16.987.654-1', iniciales: 'LM' },
      cargo: 'Operario de Limpieza',
      sede: 'Plaza Sur',
      inicio: '20 Mar 2026',
      termino: '20 Mar 2027',
      estado: 'Activo',
      diasRestantes: 118,
      diasTotal: 365,
    },
    {
      id: 6,
      trabajador: { nombre: 'Pedro Ramírez', rut: '13.112.223-4', iniciales: 'PR' },
      cargo: 'Supervisor de Área',
      sede: 'Sede Centro',
      inicio: '15 Abr 2026',
      termino: '15 Abr 2027',
      estado: 'Por vencer',
      diasRestantes: 45,
      diasTotal: 365,
    },
  ];

  const stats = {
    total: contratos.length,
    activos: contratos.filter(c => c.estado === 'Activo').length,
    porVencer: contratos.filter(c => c.estado === 'Por vencer').length,
    vencidos: contratos.filter(c => c.estado === 'Vencido').length,
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'Activo': return 'estado-activo';
      case 'Por vencer': return 'estado-por-vencer';
      case 'Vencido': return 'estado-vencido';
      default: return '';
    }
  };

  const getProgressClass = (diasRestantes, diasTotal) => {
    const percentage = (diasRestantes / diasTotal) * 100;
    if (percentage < 15) return 'progress-rojo';
    if (percentage < 30) return 'progress-naranja';
    return 'progress-azul';
  };

  const filteredContratos = contratos.filter(c =>
    c.trabajador.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sede.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-wrapper">
      <Sidebar />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">
          <div className="contratos-container">

            {/* Header con título y botón */}
            <div className="contratos-header">
              <div>
                <h1>Contratos</h1>
                <p>Gestiona y consulta todos los contratos laborales.</p>
              </div>
              <button className="btn-nuevo-contrato">
                <Plus size={16} />
                Nuevo Contrato
              </button>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">Total contratos</div>
                  <div className="stat-sub">Todos los contratos</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon activo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.activos}</div>
                  <div className="stat-label">Activos</div>
                  <div className="stat-sub">{Math.round((stats.activos / stats.total) * 100)}% del total</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon por-vencer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.porVencer}</div>
                  <div className="stat-label">Por vencer</div>
                  <div className="stat-sub">Próximos 30 días</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon vencido">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.vencidos}</div>
                  <div className="stat-label">Vencidos</div>
                  <div className="stat-sub">Requieren atención</div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="contratos-filters">
              <div className="search-box">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por trabajador, cargo o sede..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-controls">
                <div className="filter-group">
                  <label>Estado</label>
                  <select>
                    <option>Todos</option>
                    <option>Activo</option>
                    <option>Por vencer</option>
                    <option>Vencido</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Sede</label>
                  <select>
                    <option>Todas</option>
                    <option>Torre Titanium</option>
                    <option>Plaza Norte</option>
                    <option>Torre Sur</option>
                    <option>Sede Este</option>
                    <option>Plaza Sur</option>
                    <option>Sede Centro</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Fecha</label>
                  <select>
                    <option>Todas</option>
                    <option>Últimos 30 días</option>
                    <option>Últimos 90 días</option>
                    <option>Este año</option>
                  </select>
                </div>
                <button className="btn-filtros">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                  Filtros
                </button>
              </div>
            </div>

            {/* Tabla */}
            <div className="contratos-table-wrapper">
              <table className="contratos-table">
                <thead>
                  <tr>
                    <th>TRABAJADOR</th>
                    <th>CARGO</th>
                    <th>SEDE</th>
                    <th>INICIO</th>
                    <th>TÉRMINO</th>
                    <th>ESTADO</th>
                    <th>TIEMPO RESTANTE</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContratos.map((contrato) => (
                    <tr key={contrato.id}>
                      <td className="col-trabajador">
                        <div className="trabajador-info">
                          <div className="avatar">{contrato.trabajador.iniciales}</div>
                          <div>
                            <div className="nombre">{contrato.trabajador.nombre}</div>
                            <div className="rut">{contrato.trabajador.rut}</div>
                          </div>
                        </div>
                      </td>
                      <td>{contrato.cargo}</td>
                      <td>{contrato.sede}</td>
                      <td>{contrato.inicio}</td>
                      <td>{contrato.termino}</td>
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
                              style={{ width: `${(contrato.diasRestantes / contrato.diasTotal) * 100}%` }}
                            ></div>
                          </div>
                          <span className="dias-text">{contrato.diasRestantes} días</span>
                        </div>
                      </td>
                      <td className="col-acciones">
                        <button className="btn-accion" title="Ver detalles">
                          <Eye size={18} />
                        </button>
                        <button className="btn-accion" title="Más opciones">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="pagination">
              <span className="pagination-info">Mostrando 1 a 10 de {stats.total} contratos.</span>
              <div className="pagination-controls">
                <button className="btn-pagina prev">‹</button>
                <button className="btn-pagina active">1</button>
                <button className="btn-pagina">2</button>
                <button className="btn-pagina">3</button>
                <button className="btn-pagina">4</button>
                <button className="btn-pagina">5</button>
                <button className="btn-pagina">15</button>
                <button className="btn-pagina next">›</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Contratos;