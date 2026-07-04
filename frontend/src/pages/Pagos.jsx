"use strict";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  AlertCircle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import "../styles/Pagos.css";
import {
  getRemuneracionesPaginadas,
  getRemuneracionPorRut,
  crearRemuneracion as crearRemuneracionService,
  actualizarRemuneracion as actualizarRemuneracionService,
  eliminarRemuneracion as eliminarRemuneracionService,
} from "../services/remuneracionesService";

/* ─── Constantes ─────────────────────────────────────────────────────────── */
const ESTADO_OPTIONS = ["pagado", "pendiente", "atrasado"];

const EMPTY_FORM = {
  fecha_pago: "",
  sueldo: "",
  bono: "",
  descuento: "",
  estado_pago: "pendiente",
  rut: "",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const formatCLP = (n) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n ?? 0);

const getInitials = (nombres = "", apellidos = "") =>
  `${nombres.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();

const badgeClass = (estado) => {
  switch (estado?.toLowerCase()) {
    case "pagado":    return "badge-pagado";
    case "pendiente": return "badge-pendiente";
    case "atrasado":  return "badge-atrasado";
    default:          return "";
  }
};

/* ─── Componente principal ───────────────────────────────────────────────── */
export const Pagos = ({ usuario, onLogout }) => {
  /* ── Estado ─────────────────────────────────────────────────────────── */
  const [remuneraciones, setRemuneraciones] = useState([]);
  const [total, setTotal]                   = useState(0);
  const [totalPages, setTotalPages]         = useState(1);
  const [page, setPage]                     = useState(1);
  const LIMIT = 10;

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  // Búsqueda por RUT
  const [rutBusqueda, setRutBusqueda] = useState("");
  const [buscando, setBuscando]       = useState(false);
  const [resultadoRut, setResultadoRut] = useState(null);

  // Modales
  const [modalCrear, setModalCrear]               = useState(false);
  const [modalEditar, setModalEditar]             = useState(false);
  const [modalEliminar, setModalEliminar]         = useState(false);
  const [remuneracionActual, setRemuneracionActual] = useState(null);

  // Formulario
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving]       = useState(false);

  /* ── Carga paginada ──────────────────────────────────────────────────── */
  const cargarPaginadas = useCallback(async (p = 1) => {
    setLoading(true);
    setError("");
    setResultadoRut(null);
    setRutBusqueda("");
    try {
      const data = await getRemuneracionesPaginadas(p, LIMIT);
      setRemuneraciones(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarPaginadas(1); }, [cargarPaginadas]);

  /* ── Búsqueda por RUT ────────────────────────────────────────────────── */
  const buscarPorRut = async () => {
    const rut = rutBusqueda.trim();
    if (!rut) { cargarPaginadas(1); return; }

    setBuscando(true);
    setError("");
    setRemuneraciones([]);
    setResultadoRut(null);
    try {
      const data = await getRemuneracionPorRut(rut);
      setResultadoRut(data);
      setRemuneraciones([data]);
      setTotal(1);
      setTotalPages(1);
    } catch (e) {
      setError(e.message);
      setRemuneraciones([]);
    } finally {
      setBuscando(false);
    }
  };

  const limpiarBusqueda = () => {
    setRutBusqueda("");
    setResultadoRut(null);
    cargarPaginadas(1);
  };

  /* ── Crear ───────────────────────────────────────────────────────────── */
  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setModalCrear(true);
  };

  const crearRemuneracion = async () => {
    if (!form.fecha_pago || !form.sueldo || !form.estado_pago || !form.rut) {
      setFormError("Fecha, sueldo, estado de pago y RUT del trabajador son obligatorios.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await crearRemuneracionService({
        fecha_pago:  form.fecha_pago,
        estado_pago: form.estado_pago,
        rut:         form.rut,
        sueldo:      parseInt(form.sueldo),
        bono:        parseInt(form.bono || 0),
        descuento:   parseInt(form.descuento || 0),
      });
      setModalCrear(false);
      cargarPaginadas(page);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Editar ──────────────────────────────────────────────────────────── */
  const abrirEditar = (rem) => {
    setRemuneracionActual(rem);
    setForm({
      fecha_pago:  rem.fecha_pago ?? "",
      sueldo:      rem.sueldo ?? "",
      bono:        rem.bono ?? "",
      descuento:   rem.descuento ?? "",
      estado_pago: rem.estado_pago ?? "pendiente",
      rut:         rem.trabajador?.rut ?? "",
    });
    setFormError("");
    setModalEditar(true);
  };

  const actualizarRemuneracion = async () => {
    setSaving(true);
    setFormError("");
    try {
      const body = {
        fecha_pago:  form.fecha_pago  || undefined,
        sueldo:      form.sueldo !== "" ? parseInt(form.sueldo) : undefined,
        bono:        form.bono   !== "" ? parseInt(form.bono)   : undefined,
        descuento:   form.descuento !== "" ? parseInt(form.descuento) : undefined,
        estado_pago: form.estado_pago || undefined,
      };
      await actualizarRemuneracionService(remuneracionActual.id_remuneracion, body);
      setModalEditar(false);
      cargarPaginadas(page);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Eliminar ────────────────────────────────────────────────────────── */
  const abrirEliminar = (rem) => {
    setRemuneracionActual(rem);
    setModalEliminar(true);
  };

  const eliminarRemuneracion = async () => {
    setSaving(true);
    try {
      await eliminarRemuneracionService(remuneracionActual.id_remuneracion);
      setModalEliminar(false);
      const nuevaPag = remuneraciones.length === 1 && page > 1 ? page - 1 : page;
      cargarPaginadas(nuevaPag);
    } catch (e) {
      setError(e.message);
      setModalEliminar(false);
    } finally {
      setSaving(false);
    }
  };

  /* ── Cambio de formulario ────────────────────────────────────────────── */
  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ── Render paginación ───────────────────────────────────────────────── */
  const renderPaginacion = () => {
    if (totalPages <= 1 || resultadoRut) return null;

    const pages = [];
    const range = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - range && i <= page + range)) {
        pages.push(i);
      }
    }
    const items = [];
    let last = 0;
    for (const p of pages) {
      if (p - last > 1) items.push("...");
      items.push(p);
      last = p;
    }

    return (
      <div className="pag-pagination">
        <span>
          Mostrando {remuneraciones.length} de {total} registros
        </span>
        <div className="pag-pagination-btns">
          <button
            className="pag-page-btn"
            disabled={page === 1}
            onClick={() => cargarPaginadas(page - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          {items.map((item, idx) =>
            item === "..." ? (
              <span key={`e-${idx}`} style={{ padding: "0 4px", color: "#9ca3af" }}>…</span>
            ) : (
              <button
                key={item}
                className={`pag-page-btn${item === page ? " active" : ""}`}
                onClick={() => cargarPaginadas(item)}
              >
                {item}
              </button>
            )
          )}
          <button
            className="pag-page-btn"
            disabled={page === totalPages}
            onClick={() => cargarPaginadas(page + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  };

  /* ─── JSX ───────────────────────────────────────────────────────────── */
  return (
    <AdminLayout usuario={usuario} onLogout={onLogout}>

      {/* Encabezado */}
      <div className="pag-header">
        <div>
          <h1 className="vista-general-title">Pagos</h1>
          <p className="vista-general-subtitle">
            Administra las remuneraciones, bonos, descuentos y estado de pago de los trabajadores.
          </p>
        </div>
        <button className="btn-nueva-remuneracion" onClick={abrirCrear}>
          <Plus size={16} /> Nueva Remuneración
        </button>
      </div>

      {/* Toolbar */}
      <div className="pag-toolbar">
        <div className="pag-search-wrapper">
          <Search size={15} className="pag-search-icon" />
          <input
            className="pag-search-input"
            placeholder="Buscar por RUT del trabajador…"
            value={rutBusqueda}
            onChange={(e) => setRutBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarPorRut()}
          />
        </div>
        {rutBusqueda && (
          <button className="pag-btn-cancel" onClick={limpiarBusqueda}>
            <X size={14} style={{ marginRight: 4 }} /> Limpiar
          </button>
        )}
        <button className="pag-btn-save" onClick={buscarPorRut} disabled={buscando}>
          <Search size={14} /> {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {/* Contador */}
      <div className="pag-count">
        <DollarSign size={14} />
        {resultadoRut
          ? "1 resultado encontrado"
          : `${total} remuneracion${total !== 1 ? "es" : ""} en total`}
      </div>

      {/* Error global */}
      {error && (
        <div className="pag-error-banner">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Tabla */}
      <div className="pag-table-card">
        <table className="pag-table">
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>Fecha de Pago</th>
              <th>Sueldo</th>
              <th>Bono</th>
              <th>Descuento</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="pag-loading">
                    <span className="pag-spinner" />
                    Cargando remuneraciones…
                  </div>
                </td>
              </tr>
            ) : remuneraciones.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="pag-empty">
                    <DollarSign size={32} />
                    No se encontraron remuneraciones
                  </div>
                </td>
              </tr>
            ) : (
              remuneraciones.map((rem) => {
                const totalNeto = (rem.sueldo ?? 0) + (rem.bono ?? 0) - (rem.descuento ?? 0);
                const t = rem.trabajador ?? {};
                return (
                  <tr key={rem.id_remuneracion}>
                    <td>
                      <div className="pag-name-cell">
                        <div className="pag-avatar">
                          {getInitials(t.nombres, t.apellidos)}
                        </div>
                        <div>
                          <div className="pag-fullname">
                            {t.nombres} {t.apellidos}
                          </div>
                          <div className="pag-rut">{t.rut ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td>{rem.fecha_pago ?? "—"}</td>
                    <td><span className="pag-monto">{formatCLP(rem.sueldo)}</span></td>
                    <td><span className="pag-monto">{formatCLP(rem.bono)}</span></td>
                    <td><span className="pag-monto-descuento">-{formatCLP(rem.descuento)}</span></td>
                    <td><span className="pag-monto">{formatCLP(totalNeto)}</span></td>
                    <td>
                      <span className={`pag-badge ${badgeClass(rem.estado_pago)}`}>
                        {rem.estado_pago ?? "—"}
                      </span>
                    </td>
                    <td>
                      <div className="pag-actions">
                        <button
                          className="pag-btn-edit"
                          title="Editar"
                          onClick={() => abrirEditar(rem)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="pag-btn-delete"
                          title="Eliminar"
                          onClick={() => abrirEliminar(rem)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {renderPaginacion()}
      </div>

      {/* ── Modal Crear ──────────────────────────────────────────────────── */}
      {modalCrear && (
        <div className="pag-modal-overlay">
          <div className="pag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pag-modal-header">
              <h2>Nueva Remuneración</h2>
              <button className="pag-modal-close" onClick={() => setModalCrear(false)}>
                <X size={16} />
              </button>
            </div>
            {formError && (
              <div className="pag-form-error">
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            <div className="pag-form">
              <div className="pag-form-grid">
                <div className="pag-field pag-field-full">
                  <label>RUT Trabajador *</label>
                  <input
                    name="rut"
                    type="text"
                    placeholder="Ej: 12345678-9"
                    value={form.rut}
                    onChange={handleForm}
                  />
                </div>
                <div className="pag-field">
                  <label>Fecha de Pago *</label>
                  <input
                    name="fecha_pago"
                    type="date"
                    value={form.fecha_pago}
                    onChange={handleForm}
                  />
                </div>
                <div className="pag-field">
                  <label>Estado de Pago *</label>
                  <select name="estado_pago" value={form.estado_pago} onChange={handleForm}>
                    {ESTADO_OPTIONS.map((e) => (
                      <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="pag-field">
                  <label>Sueldo (CLP) *</label>
                  <input
                    name="sueldo"
                    type="number"
                    placeholder="Ej: 800000"
                    value={form.sueldo}
                    onChange={handleForm}
                  />
                </div>
                <div className="pag-field">
                  <label>Bono (CLP)</label>
                  <input
                    name="bono"
                    type="number"
                    placeholder="Ej: 50000"
                    value={form.bono}
                    onChange={handleForm}
                  />
                </div>
                <div className="pag-field pag-field-full">
                  <label>Descuento (CLP)</label>
                  <input
                    name="descuento"
                    type="number"
                    placeholder="Ej: 20000"
                    value={form.descuento}
                    onChange={handleForm}
                  />
                </div>
              </div>
            </div>
            <div className="pag-modal-footer">
              <button className="pag-btn-cancel" onClick={() => setModalCrear(false)}>
                Cancelar
              </button>
              <button className="pag-btn-save" onClick={crearRemuneracion} disabled={saving}>
                <Save size={14} /> {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar ─────────────────────────────────────────────────── */}
      {modalEditar && remuneracionActual && (
        <div className="pag-modal-overlay">
          <div className="pag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pag-modal-header">
              <h2>Editar Remuneración</h2>
              <button className="pag-modal-close" onClick={() => setModalEditar(false)}>
                <X size={16} />
              </button>
            </div>
            {formError && (
              <div className="pag-form-error">
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            <div className="pag-form">
              <div className="pag-form-grid">
                <div className="pag-field">
                  <label>Fecha de Pago</label>
                  <input
                    name="fecha_pago"
                    type="date"
                    value={form.fecha_pago}
                    onChange={handleForm}
                  />
                </div>
                <div className="pag-field">
                  <label>Estado de Pago</label>
                  <select name="estado_pago" value={form.estado_pago} onChange={handleForm}>
                    {ESTADO_OPTIONS.map((e) => (
                      <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="pag-field">
                  <label>Sueldo (CLP)</label>
                  <input
                    name="sueldo"
                    type="number"
                    value={form.sueldo}
                    onChange={handleForm}
                  />
                </div>
                <div className="pag-field">
                  <label>Bono (CLP)</label>
                  <input
                    name="bono"
                    type="number"
                    value={form.bono}
                    onChange={handleForm}
                  />
                </div>
                <div className="pag-field pag-field-full">
                  <label>Descuento (CLP)</label>
                  <input
                    name="descuento"
                    type="number"
                    value={form.descuento}
                    onChange={handleForm}
                  />
                </div>
              </div>
            </div>
            <div className="pag-modal-footer">
              <button className="pag-btn-cancel" onClick={() => setModalEditar(false)}>
                Cancelar
              </button>
              <button className="pag-btn-save" onClick={actualizarRemuneracion} disabled={saving}>
                <Save size={14} /> {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Eliminar ───────────────────────────────────────────────── */}
      {modalEliminar && remuneracionActual && (
        <div className="pag-modal-overlay">
          <div className="pag-modal pag-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="pag-modal-header">
              <h2>Eliminar Remuneración</h2>
              <button className="pag-modal-close" onClick={() => setModalEliminar(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="pag-confirm-text">
              ¿Estás seguro de que deseas eliminar la remuneración de{" "}
              <strong>
                {remuneracionActual.trabajador?.nombres}{" "}
                {remuneracionActual.trabajador?.apellidos}
              </strong>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="pag-modal-footer">
              <button className="pag-btn-cancel" onClick={() => setModalEliminar(false)}>
                Cancelar
              </button>
              <button
                className="pag-btn-delete-confirm"
                onClick={eliminarRemuneracion}
                disabled={saving}
              >
                <Trash2 size={14} /> {saving ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Pagos;