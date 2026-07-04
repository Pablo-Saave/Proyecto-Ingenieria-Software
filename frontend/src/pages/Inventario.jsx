import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  getMiProyecto,
  getInventarios,
  getLowStockInventarios,
  crearInventario,
  eliminarInventario,
  getMateriales,
  crearMaterial,
  actualizarMaterial,
  eliminarMaterial,
} from '../services/inventariosService';
import '../styles/inventarios.css';

const CREAR_MAT_INITIAL = {
  nombre_material: '',
  tipo_material: '',
  stock_actual: '',
  stock_minimo: '',
};

export default function Inventarios({ usuario, onLogout }) {

  // ── Datos ──────────────────────────────────────────────────────────────
  const [proyecto, setProyecto]               = useState(null);
  const [inventarios, setInventarios]         = useState([]);
  const [invMeta, setInvMeta]                 = useState({ total: 0, page: 1, limit: 8, totalPages: 1 });
  const [selectedInv, setSelectedInv]         = useState(null);
  const [materiales, setMateriales]           = useState([]);
  const [matMeta, setMatMeta]                 = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // ── Filtros y paginación ───────────────────────────────────────────────
  const [filtro, setFiltro]     = useState('todos'); // 'todos' | 'lowStock'
  const [invPage, setInvPage]   = useState(1);
  const [matPage, setMatPage]   = useState(1);

  // ── UI ─────────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(false);
  const [loadingMat, setLoadingMat]     = useState(false);
  const [error, setError]               = useState(null);
  const [actionError, setActionError]   = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // ── Modales ────────────────────────────────────────────────────────────
  const [showCrearInv, setShowCrearInv]         = useState(false);
  const [showConfirmElimInv, setShowConfirmElimInv] = useState(false);
  const [showCrearMat, setShowCrearMat]         = useState(false);
  const [showEditarMat, setShowEditarMat]       = useState(false);
  const [matToEdit, setMatToEdit]               = useState(null);
  const [matToDelete, setMatToDelete]           = useState(null); // id_material

  // ── Formularios ────────────────────────────────────────────────────────
  const [nombreInv, setNombreInv]       = useState('');
  const [crearMatForm, setCrearMatForm] = useState(CREAR_MAT_INITIAL);
  const [editarMatForm, setEditarMatForm] = useState({});
  const [formError, setFormError]       = useState('');
  const [stockInputs, setStockInputs]   = useState({}); // { [id_material]: string }
  const [stockInputErrors, setStockInputErrors] = useState({}); // { [id_material]: string }

  // ── Fetch proyecto ─────────────────────────────────────────────────────
  useEffect(() => {
    getMiProyecto()
      .then(setProyecto)
      .catch(e => setError(e.message));
  }, []);

  // ── Fetch inventarios ──────────────────────────────────────────────────
  const fetchInventarios = useCallback(async (keepSelected = true) => {
    try {
      setLoading(true);
      setError(null);
      const fn = filtro === 'lowStock' ? getLowStockInventarios : getInventarios;
      const res = await fn({ page: invPage, limit: 8 });
      setInventarios(res.data);
      setInvMeta(res.meta);

      if (keepSelected && selectedInv) {
        const found = res.data.find(i => i.id_inventario === selectedInv.id_inventario);
        if (!found) {
          setSelectedInv(null);
          setMateriales([]);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filtro, invPage, selectedInv?.id_inventario]);

  useEffect(() => { fetchInventarios(true); }, [filtro, invPage]);

  // ── Fetch materiales ───────────────────────────────────────────────────
  const fetchMateriales = useCallback(async () => {
    if (!selectedInv) return;
    try {
      setLoadingMat(true);
      const res = await getMateriales(selectedInv.id_inventario, { page: matPage, limit: 10 });
      setMateriales(res.data);
      setMatMeta(res.meta);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setLoadingMat(false);
    }
  }, [selectedInv?.id_inventario, matPage]);

  useEffect(() => {
    if (selectedInv) {
      setMatPage(1);
      fetchMateriales();
    }
  }, [selectedInv?.id_inventario]);

  useEffect(() => {
    if (selectedInv) fetchMateriales();
  }, [matPage]);

  // ── Seleccionar inventario ─────────────────────────────────────────────
  function handleSelectInv(inv) {
    setSelectedInv(inv);
    setActionError(null);
    setShowConfirmElimInv(false);
    setMatToDelete(null);
    setStockInputs({});
    setStockInputErrors({});
  }

  // ─────────────────────────────────────────────────────────────────────
  // CREAR INVENTARIO
  // ─────────────────────────────────────────────────────────────────────
  async function handleCrearInventario() {
    if (!nombreInv.trim()) {
      setFormError('El nombre del inventario es obligatorio.');
      return;
    }
    try {
      setLoadingAction(true);
      setFormError('');
      await crearInventario(nombreInv.trim());
      setShowCrearInv(false);
      setNombreInv('');
      setInvPage(1);
      await fetchInventarios(false);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // ELIMINAR INVENTARIO
  // ─────────────────────────────────────────────────────────────────────
  async function handleEliminarInventario() {
    try {
      setLoadingAction(true);
      setActionError(null);
      await eliminarInventario(selectedInv.id_inventario);
      setShowConfirmElimInv(false);
      setSelectedInv(null);
      setMateriales([]);
      await fetchInventarios(false);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // CREAR MATERIAL
  // ─────────────────────────────────────────────────────────────────────
  async function handleCrearMaterial() {
    const { nombre_material, tipo_material, stock_actual, stock_minimo } = crearMatForm;

    if (!nombre_material.trim() || !tipo_material.trim() ||
        stock_actual === '' || stock_minimo === '') {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    if (isNaN(Number(stock_actual)) || Number(stock_actual) < 0) {
      setFormError('Stock actual debe ser un número mayor o igual a 0.');
      return;
    }
    if (isNaN(Number(stock_minimo)) || Number(stock_minimo) < 0) {
      setFormError('Stock mínimo debe ser un número mayor o igual a 0.');
      return;
    }

    try {
      setLoadingAction(true);
      setFormError('');
      await crearMaterial({
        id_inventario:   selectedInv.id_inventario,
        nombre_material: nombre_material.trim(),
        tipo_material:   tipo_material.trim(),
        stock_actual:    Number(stock_actual),
        stock_minimo:    Number(stock_minimo),
      });
      setShowCrearMat(false);
      setCrearMatForm(CREAR_MAT_INITIAL);
      await fetchMateriales();
      await fetchInventarios(true);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // EDITAR MATERIAL
  // ─────────────────────────────────────────────────────────────────────
  function abrirEditarMaterial(mat) {
    setMatToEdit(mat);
    setEditarMatForm({
      nombre_material: mat.nombre_material,
      tipo_material:   mat.tipo_material,
      stock_actual:    String(mat.stock_actual),
      stock_minimo:    mat.stock_minimo !== null ? String(mat.stock_minimo) : '',
    });
    setFormError('');
    setShowEditarMat(true);
  }

  async function handleEditarMaterial() {
    const campos = {};
    if (editarMatForm.nombre_material.trim() !== matToEdit.nombre_material)
      campos.nombre_material = editarMatForm.nombre_material.trim();
    if (editarMatForm.tipo_material.trim() !== matToEdit.tipo_material)
      campos.tipo_material = editarMatForm.tipo_material.trim();
    if (Number(editarMatForm.stock_actual) !== matToEdit.stock_actual)
      campos.stock_actual = Number(editarMatForm.stock_actual);
    if (Number(editarMatForm.stock_minimo) !== matToEdit.stock_minimo)
      campos.stock_minimo = Number(editarMatForm.stock_minimo);

    if (!Object.keys(campos).length) {
      setFormError('No hay cambios para guardar.');
      return;
    }
    if (campos.stock_actual !== undefined && (isNaN(campos.stock_actual) || campos.stock_actual < 0)) {
      setFormError('Stock actual debe ser un número mayor o igual a 0.');
      return;
    }
    if (campos.stock_minimo !== undefined && (isNaN(campos.stock_minimo) || campos.stock_minimo < 0)) {
      setFormError('Stock mínimo debe ser un número mayor o igual a 0.');
      return;
    }

    try {
      setLoadingAction(true);
      setFormError('');
      await actualizarMaterial(matToEdit.id_material, campos);
      setShowEditarMat(false);
      await fetchMateriales();
      await fetchInventarios(true);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // ELIMINAR MATERIAL
  // ─────────────────────────────────────────────────────────────────────
  async function handleEliminarMaterial(id_material) {
    try {
      setLoadingAction(true);
      setActionError(null);
      await eliminarMaterial(id_material);
      setMatToDelete(null);
      await fetchMateriales();
      await fetchInventarios(true);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setLoadingAction(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // AJUSTAR STOCK (+ / -)
  // ─────────────────────────────────────────────────────────────────────
  async function handleAjustarStock(mat, delta) {
    const nuevoStock = mat.stock_actual + delta;
    if (nuevoStock < 0) return;
    try {
      await actualizarMaterial(mat.id_material, { stock_actual: nuevoStock });
      await fetchMateriales();
      await fetchInventarios(true);
    } catch (e) {
      setActionError(e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // ESTABLECER STOCK (input)
  // ─────────────────────────────────────────────────────────────────────
  async function handleEstablecerStock(mat) {
    const raw = stockInputs[mat.id_material];
    if (raw === undefined || raw === '') return;
    const num = Number(raw);
    if (!Number.isInteger(num) || num < 0) {
      setStockInputErrors(prev => ({ ...prev, [mat.id_material]: 'Valor inválido' }));
      return;
    }
    try {
      setStockInputErrors(prev => ({ ...prev, [mat.id_material]: '' }));
      await actualizarMaterial(mat.id_material, { stock_actual: num });
      setStockInputs(prev => ({ ...prev, [mat.id_material]: '' }));
      await fetchMateriales();
      await fetchInventarios(true);
    } catch (e) {
      setStockInputErrors(prev => ({ ...prev, [mat.id_material]: e.message }));
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // PAGINACIÓN
  // ─────────────────────────────────────────────────────────────────────
  function Pagination({ meta, page, setPage }) {
    if (meta.totalPages <= 1) return null;
    return (
      <div className="inv-pagination">
        <span className="inv-page-info">
          {meta.total} registros · pág. {meta.page}/{meta.totalPages}
        </span>
        <div className="inv-page-controls">
          <button className="inv-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
          <span className="inv-page-btn current">{page}</span>
          <button className="inv-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === meta.totalPages}>›</button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />

      <div className="dashboard-main">
        <Header onLogout={onLogout} />

        <div className="dashboard-content">

          {/* ── TOPE ─────────────────────────────────────────────────── */}
          <div className="inv-tope">
            <div>
              <h1 className="inv-tope-title">
                Inventarios{proyecto && <span className="inv-tope-proyecto"> — {proyecto.nombre_proyecto}</span>}
              </h1>
              <p className="inv-tope-subtitle">Gestión de inventario del proyecto</p>
            </div>
            <button
              className="inv-btn-primary"
              onClick={() => { setNombreInv(''); setFormError(''); setShowCrearInv(true); }}
            >
              + Crear Inventario
            </button>
          </div>

          {error && <div className="inv-error-banner">⚠ {error}</div>}

          {/* ── GRID PRINCIPAL ───────────────────────────────────────── */}
          <div className="inv-grid">

            {/* ── PANEL IZQUIERDO ────────────────────────────────────── */}
            <div className="inv-left">
              <div className="inv-toolbar">
                <button
                  className={`inv-filter-btn ${filtro === 'todos' ? 'active' : ''}`}
                  onClick={() => { setFiltro('todos'); setInvPage(1); setSelectedInv(null); setMateriales([]); }}
                >
                  Todos
                </button>
                <button
                  className={`inv-filter-btn ${filtro === 'lowStock' ? 'active' : ''}`}
                  onClick={() => { setFiltro('lowStock'); setInvPage(1); setSelectedInv(null); setMateriales([]); }}
                >
                  ⚠ Requiere reposición
                </button>
              </div>

              {loading ? (
                <div className="inv-empty"><div className="inv-spinner" /></div>
              ) : inventarios.length === 0 ? (
                <div className="inv-empty">
                  <p>{filtro === 'lowStock' ? 'Sin inventarios con stock bajo' : 'Sin inventarios'}</p>
                </div>
              ) : (
                <ul className="inv-list">
                  {inventarios.map(inv => (
                    <li
                      key={inv.id_inventario}
                      className={`inv-list-item ${selectedInv?.id_inventario === inv.id_inventario ? 'selected' : ''}`}
                      onClick={() => handleSelectInv(inv)}
                    >
                      <span className="inv-item-name">{inv.nombre_inventario}</span>
                      <span className="inv-arrow">›</span>
                    </li>
                  ))}
                </ul>
              )}

              <Pagination meta={invMeta} page={invPage} setPage={setInvPage} />
            </div>

            {/* ── PANEL DERECHO ──────────────────────────────────────── */}
            <div className="inv-right">
              {!selectedInv ? (
                <div className="inv-right-empty">
                  <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
                  </svg>
                  <p>Selecciona un inventario para ver sus materiales</p>
                </div>
              ) : (
                <div className="inv-detail">

                  {/* Header inventario */}
                  <div className="inv-detail-header">
                    <h2 className="inv-detail-title">{selectedInv.nombre_inventario}</h2>
                    {!showConfirmElimInv ? (
                      <button
                        className="inv-btn-danger"
                        onClick={() => { setShowConfirmElimInv(true); setActionError(null); }}
                      >
                        Eliminar inventario
                      </button>
                    ) : (
                      <div className="inv-confirm-panel">
                        <span>¿Eliminar <strong>{selectedInv.nombre_inventario}</strong> y todos sus materiales?</span>
                        <div className="inv-confirm-actions">
                          <button className="inv-btn-danger-sm" onClick={handleEliminarInventario} disabled={loadingAction}>
                            {loadingAction ? '...' : 'Confirmar'}
                          </button>
                          <button className="inv-btn-cancel-sm" onClick={() => setShowConfirmElimInv(false)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {actionError && <div className="inv-action-error">⚠ {actionError}</div>}

                  {/* Subheader materiales */}
                  <div className="inv-mat-subheader">
                    <span className="inv-mat-label">Materiales de limpieza</span>
                    <button
                      className="inv-btn-primary"
                      onClick={() => { setCrearMatForm(CREAR_MAT_INITIAL); setFormError(''); setShowCrearMat(true); }}
                    >
                      + Crear Material
                    </button>
                  </div>

                  {/* Tabla materiales */}
                  {loadingMat ? (
                    <div className="inv-empty"><div className="inv-spinner" /></div>
                  ) : materiales.length === 0 ? (
                    <div className="inv-empty"><p>Sin materiales en este inventario</p></div>
                  ) : (
                    <div className="inv-mat-table-wrapper">
                      <table className="inv-mat-table">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th>Tipo</th>
                            <th>Stock actual</th>
                            <th>Stock mínimo</th>
                            <th>Ajustar</th>
                            <th>Establecer</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materiales.map(mat => {
                            const isLowStock = mat.stock_minimo !== null && mat.stock_actual < mat.stock_minimo;
                            const stockVal   = stockInputs[mat.id_material] ?? '';
                            const stockErr   = stockInputErrors[mat.id_material] ?? '';

                            return (
                              <React.Fragment key={mat.id_material}>
                                <tr className={isLowStock ? 'inv-row-low-stock' : ''}>
                                  <td className="inv-mat-name">{mat.nombre_material}</td>
                                  <td className="inv-mat-tipo">{mat.tipo_material}</td>
                                  <td>
                                    <span className={`inv-stock-badge ${isLowStock ? 'low' : ''}`}>
                                      {mat.stock_actual}
                                    </span>
                                  </td>
                                  <td className="inv-mat-minimo">{mat.stock_minimo ?? '—'}</td>

                                  {/* Controles + / - */}
                                  <td>
                                    <div className="inv-adjust-controls">
                                      <button
                                        className="inv-adj-btn"
                                        onClick={() => handleAjustarStock(mat, -1)}
                                        disabled={mat.stock_actual <= 0}
                                        title="Restar 1"
                                      >−</button>
                                      <button
                                        className="inv-adj-btn"
                                        onClick={() => handleAjustarStock(mat, 1)}
                                        title="Sumar 1"
                                      >+</button>
                                    </div>
                                  </td>

                                  {/* Input establecer stock */}
                                  <td>
                                    <div className="inv-stock-input-group">
                                      <input
                                        className={`inv-stock-input ${stockErr ? 'error' : ''}`}
                                        type="number"
                                        min="0"
                                        placeholder="Establecer"
                                        value={stockVal}
                                        onChange={e => {
                                          setStockInputs(prev => ({ ...prev, [mat.id_material]: e.target.value }));
                                          setStockInputErrors(prev => ({ ...prev, [mat.id_material]: '' }));
                                        }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleEstablecerStock(mat); }}
                                        title={stockErr || undefined}
                                      />
                                      <button
                                        className="inv-stock-confirm-btn"
                                        onClick={() => handleEstablecerStock(mat)}
                                        disabled={!stockVal}
                                        title="Confirmar stock"
                                      >✓</button>
                                    </div>
                                  </td>

                                  {/* Editar / Eliminar */}
                                  <td>
                                    <div className="inv-mat-actions">
                                      <button
                                        className="inv-action-btn edit"
                                        onClick={() => abrirEditarMaterial(mat)}
                                        title="Editar"
                                      >✏</button>
                                      <button
                                        className="inv-action-btn delete"
                                        onClick={() => setMatToDelete(
                                          matToDelete === mat.id_material ? null : mat.id_material
                                        )}
                                        title="Eliminar"
                                      >🗑</button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Confirmación eliminar material (inline) */}
                                {matToDelete === mat.id_material && (
                                  <tr className="inv-confirm-row">
                                    <td colSpan={7}>
                                      <div className="inv-confirm-panel inline">
                                        <span>¿Eliminar <strong>{mat.nombre_material}</strong>?</span>
                                        <div className="inv-confirm-actions">
                                          <button
                                            className="inv-btn-danger-sm"
                                            onClick={() => handleEliminarMaterial(mat.id_material)}
                                            disabled={loadingAction}
                                          >
                                            {loadingAction ? '...' : 'Confirmar'}
                                          </button>
                                          <button className="inv-btn-cancel-sm" onClick={() => setMatToDelete(null)}>
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <Pagination meta={matMeta} page={matPage} setPage={setMatPage} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL CREAR INVENTARIO ─────────────────────────────────────── */}
      {showCrearInv && (
        <div className="inv-modal-overlay" onClick={() => setShowCrearInv(false)}>
          <div className="inv-modal inv-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h2>Crear Inventario</h2>
              <button className="inv-modal-close" onClick={() => setShowCrearInv(false)}>✕</button>
            </div>
            <div className="inv-modal-body">
              {formError && <div className="inv-form-error">⚠ {formError}</div>}
              <div className="inv-field">
                <label>Nombre del Inventario</label>
                <input
                  placeholder="Ej: Inventario Principal"
                  value={nombreInv}
                  onChange={e => setNombreInv(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCrearInventario(); }}
                  autoFocus
                />
              </div>
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-secondary" onClick={() => setShowCrearInv(false)}>Cancelar</button>
              <button className="inv-btn-primary" onClick={handleCrearInventario} disabled={loadingAction}>
                {loadingAction ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR MATERIAL ──────────────────────────────────────── */}
      {showCrearMat && (
        <div className="inv-modal-overlay" onClick={() => setShowCrearMat(false)}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h2>Crear Material de Limpieza</h2>
              <button className="inv-modal-close" onClick={() => setShowCrearMat(false)}>✕</button>
            </div>
            <div className="inv-modal-body">
              {formError && <div className="inv-form-error">⚠ {formError}</div>}
              <div className="inv-form-grid">
                <div className="inv-field inv-field-full">
                  <label>Nombre del Material</label>
                  <input
                    placeholder="Ej: Detergente líquido"
                    value={crearMatForm.nombre_material}
                    onChange={e => setCrearMatForm(f => ({ ...f, nombre_material: e.target.value }))}
                  />
                </div>
                <div className="inv-field inv-field-full">
                  <label>Tipo de Material</label>
                  <input
                    placeholder="Ej: Limpieza"
                    value={crearMatForm.tipo_material}
                    onChange={e => setCrearMatForm(f => ({ ...f, tipo_material: e.target.value }))}
                  />
                </div>
                <div className="inv-field">
                  <label>Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={crearMatForm.stock_actual}
                    onChange={e => setCrearMatForm(f => ({ ...f, stock_actual: e.target.value }))}
                  />
                </div>
                <div className="inv-field">
                  <label>Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={crearMatForm.stock_minimo}
                    onChange={e => setCrearMatForm(f => ({ ...f, stock_minimo: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-secondary" onClick={() => setShowCrearMat(false)}>Cancelar</button>
              <button className="inv-btn-primary" onClick={handleCrearMaterial} disabled={loadingAction}>
                {loadingAction ? 'Creando...' : 'Crear material'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR MATERIAL ─────────────────────────────────────── */}
      {showEditarMat && matToEdit && (
        <div className="inv-modal-overlay" onClick={() => setShowEditarMat(false)}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h2>Editar Material</h2>
              <button className="inv-modal-close" onClick={() => setShowEditarMat(false)}>✕</button>
            </div>
            <div className="inv-modal-body">
              {formError && <div className="inv-form-error">⚠ {formError}</div>}
              <div className="inv-form-grid">
                <div className="inv-field inv-field-full">
                  <label>Nombre del Material</label>
                  <input
                    value={editarMatForm.nombre_material}
                    onChange={e => setEditarMatForm(f => ({ ...f, nombre_material: e.target.value }))}
                  />
                </div>
                <div className="inv-field inv-field-full">
                  <label>Tipo de Material</label>
                  <input
                    value={editarMatForm.tipo_material}
                    onChange={e => setEditarMatForm(f => ({ ...f, tipo_material: e.target.value }))}
                  />
                </div>
                <div className="inv-field">
                  <label>Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    value={editarMatForm.stock_actual}
                    onChange={e => setEditarMatForm(f => ({ ...f, stock_actual: e.target.value }))}
                  />
                </div>
                <div className="inv-field">
                  <label>Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={editarMatForm.stock_minimo}
                    onChange={e => setEditarMatForm(f => ({ ...f, stock_minimo: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-secondary" onClick={() => setShowEditarMat(false)}>Cancelar</button>
              <button className="inv-btn-primary" onClick={handleEditarMaterial} disabled={loadingAction}>
                {loadingAction ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}