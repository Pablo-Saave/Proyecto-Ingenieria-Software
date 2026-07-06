// pages/Contratos.jsx  (Administrador)
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/contratos.css';
import { Eye, MoreVertical, Plus, X, AlertTriangle, Download, FilePlus } from 'lucide-react';
import { generarPDFContrato } from '../utils/generarPDFContrato';
import {
  getContratos,
  getContratoById,
  createContrato,
  updateContrato,
  deleteContrato,
  getTrabajadores,
  validarFormContrato,
  hoyLocal,
  TIPOS_CONTRATO,
  ESTADOS_CONTRATO,
  getAnexosContrato,
  createAnexoContrato,
  deleteAnexoContrato,
  validarFormAnexoContrato,
} from '../services/contratosService';

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatearMonto(monto) {
  if (monto === null || monto === undefined || monto === '') return '—';
  return Number(monto).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
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
    monto:           c.monto ?? null,
    id_trabajador:   t.id_trabajador,
    trabajador: {
      nombre:    `${t.nombres || ''} ${t.apellidos || ''}`.trim() || 'Sin nombre',
      rut:       t.rut || '—',
      iniciales: getIniciales(t.nombres, t.apellidos),
    },
    // Usamos el estado real guardado en BD (lo que el admin edita y lo que
    // el cron de contratos actualiza). calcularEstado() queda solo como
    // fallback por si algún contrato antiguo no tiene estado_contrato.
    estado: c.estado_contrato || calcularEstado(c.fecha_termino),
    diasRestantes,
    diasTotal,
    anexos: c.anexos || [],
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
  if (pct <= 0)  return 'progress-rojo';
  if (pct < 15)  return 'progress-rojo';
  if (pct < 30)  return 'progress-naranja';
  return 'progress-azul';
}

function IconoFiltro() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// ─── Modal Crear / Editar ──────────────────────────────────────────────────────

const FORM_VACIO = {
  id_trabajador:   '',
  tipo_contrato:   '',
  estado_contrato: 'Activo',
  fecha_inicio:    '',
  fecha_termino:   '',
  monto:           '',
  observaciones:   '',
};

function ContratoModal({ onClose, onGuardado, contratoEdit, trabajadores }) {
  const [form, setForm]       = useState(
    contratoEdit
      ? {
          id_trabajador:   contratoEdit.id_trabajador   || '',
          tipo_contrato:   contratoEdit.tipo_contrato   || '',
          estado_contrato: contratoEdit.estado_contrato || 'Activo',
          fecha_inicio:    contratoEdit.fecha_inicio    || '',
          fecha_termino:   contratoEdit.fecha_termino   || '',
          monto:           contratoEdit.monto ?? '',
          observaciones:   contratoEdit.observaciones   || '',
        }
      : FORM_VACIO
  );
  const [guardando, setGuardando] = useState(false);
  const [errores,   setErrores]   = useState([]);

  const esIndefinido = form.tipo_contrato === 'Indefinido';
  const hoy          = hoyLocal();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Al cambiar a Indefinido limpiar fecha_termino automáticamente
      if (name === 'tipo_contrato' && value === 'Indefinido') {
        next.fecha_termino = '';
      }
      return next;
    });
    // Limpiar errores al editar
    setErrores([]);
  };

  const handleGuardar = async () => {
    const errs = validarFormContrato(form, !!contratoEdit);
    if (errs.length) { setErrores(errs); return; }

    setGuardando(true);
    setErrores([]);
    try {
      // En edición solo se puede tocar observaciones; el resto (tipo, fechas,
      // monto, estado) se cambia creando un anexo — el estado en particular
      // requiere un anexo de término para pasar a Inactivo.
      const payload = contratoEdit
        ? {
            observaciones: form.observaciones || null,
          }
        : {
            tipo_contrato:   form.tipo_contrato,
            estado_contrato: form.estado_contrato,
            fecha_inicio:    form.fecha_inicio,
            fecha_termino:   esIndefinido ? null : (form.fecha_termino || null),
            monto:           form.monto === '' ? null : Number(form.monto),
            observaciones:   form.observaciones || null,
            id_trabajador:   Number(form.id_trabajador),
          };

      if (contratoEdit) {
        await updateContrato(contratoEdit.id_contrato, payload);
      } else {
        await createContrato(payload);
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
          <h2>{contratoEdit ? 'Editar Contrato' : 'Nuevo Contrato'}</h2>
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

          <label>Trabajador *</label>
          <select name="id_trabajador" value={form.id_trabajador}
            onChange={handleChange} disabled={!!contratoEdit}>
            <option value="">— Seleccionar —</option>
            {trabajadores.map((t) => (
              <option key={t.id_trabajador} value={t.id_trabajador}>
                {t.nombres} {t.apellidos} — {t.rut}
              </option>
            ))}
          </select>

          <label>Tipo de contrato *</label>
          <select
            name="tipo_contrato"
            value={form.tipo_contrato}
            onChange={handleChange}
            disabled={!!contratoEdit}
            title={contratoEdit ? 'Se necesita crear un anexo para modificar esto' : ''}
            style={contratoEdit ? { opacity: 0.6, cursor: 'not-allowed', background: '#f9fafb' } : {}}
          >
            <option value="">— Seleccionar —</option>
            {TIPOS_CONTRATO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Estado
            <span style={{
              fontSize: '11px', color: '#6b7280',
              background: '#f3f4f6', borderRadius: '4px',
              padding: '2px 6px', fontWeight: 500,
            }}>
              {contratoEdit
                ? 'Para inactivar el contrato crea un anexo de término'
                : 'Los contratos nuevos se crean como Activo'}
            </span>
          </label>
          <select
            name="estado_contrato"
            value={form.estado_contrato}
            onChange={handleChange}
            disabled
            title="El estado no se edita directamente. Para inactivar el contrato crea un anexo de término desde el detalle del contrato."
            style={{ opacity: 0.6, cursor: 'not-allowed', background: '#f9fafb' }}
          >
            {ESTADOS_CONTRATO.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          <label>Fecha de inicio *</label>
          <input
            type="date"
            name="fecha_inicio"
            value={form.fecha_inicio}
            min={hoy}
            onChange={handleChange}
            disabled={!!contratoEdit}
            title={contratoEdit ? 'Se necesita crear un anexo para modificar esto' : ''}
            style={contratoEdit ? { opacity: 0.6, cursor: 'not-allowed', background: '#f9fafb' } : {}}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Fecha de término
            {esIndefinido && (
              <span style={{
                fontSize: '11px', color: '#6b7280',
                background: '#f3f4f6', borderRadius: '4px',
                padding: '2px 6px', fontWeight: 500,
              }}>
                No aplica para contratos Indefinidos
              </span>
            )}
          </label>
          <input
            type="date"
            name="fecha_termino"
            value={form.fecha_termino}
            min={form.fecha_inicio || hoy}
            onChange={handleChange}
            disabled={esIndefinido || !!contratoEdit}
            title={
              contratoEdit
                ? 'Se necesita crear un anexo para modificar esto'
                : esIndefinido ? 'Los contratos indefinidos no tienen fecha de término' : ''
            }
            style={(esIndefinido || contratoEdit) ? { opacity: 0.4, cursor: 'not-allowed', background: '#f9fafb' } : {}}
          />

          <label>Monto (sueldo) *</label>
          <input
            type="number"
            name="monto"
            value={form.monto}
            onChange={handleChange}
            min="0"
            step="1"
            placeholder="Ej: 650000"
            disabled={!!contratoEdit}
            title={contratoEdit ? 'Se necesita crear un anexo para modificar esto' : ''}
            style={contratoEdit ? { opacity: 0.6, cursor: 'not-allowed', background: '#f9fafb' } : {}}
          />

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

// ─── Modal Agregar Anexo ───────────────────────────────────────────────────────

const ANEXO_VACIO = {
  fecha_anexo: '',
  fecha_vigencia: '',
  motivo: '',
  descripcion_modificacion: '',
  tipo_contrato_nuevo: '',
  fecha_termino_nueva: '',
  monto_nuevo: '',
  observaciones: '',
  es_anexo_termino: false,
};

function AnexoModal({ idContrato, onClose, onGuardado }) {
  const [form, setForm]       = useState(ANEXO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errores,   setErrores]   = useState([]);
  const hoy = hoyLocal();
  const esIndefinidoNuevo = form.tipo_contrato_nuevo === 'Indefinido';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'tipo_contrato_nuevo' && value === 'Indefinido') {
        next.fecha_termino_nueva = '';
      }
      return next;
    });
    setErrores([]);
  };

  const handleGuardar = async () => {
    const errs = validarFormAnexoContrato(form);
    if (form.es_anexo_termino && !form.fecha_termino_nueva) {
      errs.push('Debes indicar la fecha real de término para inactivar el contrato.');
    }
    if (errs.length) { setErrores(errs); return; }

    setGuardando(true);
    setErrores([]);
    try {
      await createAnexoContrato(idContrato, {
        fecha_anexo: form.fecha_anexo,
        fecha_vigencia: form.fecha_vigencia,
        motivo: form.motivo,
        descripcion_modificacion: form.descripcion_modificacion,
        tipo_contrato_nuevo: form.tipo_contrato_nuevo || null,
        fecha_termino_nueva: esIndefinidoNuevo ? null : (form.fecha_termino_nueva || null),
        monto_nuevo: form.monto_nuevo === '' ? null : Number(form.monto_nuevo),
        observaciones: form.observaciones || null,
        es_anexo_termino: form.es_anexo_termino || false,
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

          <label>Fecha de vigencia *</label>
          <input type="date" name="fecha_vigencia" value={form.fecha_vigencia}
            min={form.fecha_anexo || undefined} onChange={handleChange} />

          <label>Motivo *</label>
          <input type="text" name="motivo" value={form.motivo}
            onChange={handleChange} placeholder="Ej: Renovación, cambio de sueldo..." />

          <label>Descripción de la modificación *</label>
          <textarea name="descripcion_modificacion" value={form.descripcion_modificacion}
            onChange={handleChange} rows={3} placeholder="Detalle de lo que cambia..." />

          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: form.es_anexo_termino ? '#fee2e2' : '#f9fafb',
            border: `1px solid ${form.es_anexo_termino ? '#fecaca' : '#e5e7eb'}`,
            borderRadius: '6px', padding: '10px 12px', marginTop: '4px', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              name="es_anexo_termino"
              checked={form.es_anexo_termino}
              onChange={handleChange}
              style={{ width: 'auto' }}
            />
            <span style={{ fontWeight: 500, color: form.es_anexo_termino ? '#991b1b' : '#374151' }}>
              Este anexo termina el contrato (pasará a Inactivo)
            </span>
          </label>
          {form.es_anexo_termino && (
            <p style={{ fontSize: '12px', color: '#991b1b', margin: '2px 0 8px' }}>
              Debes indicar la fecha real de término abajo. Una vez guardado, el contrato
              quedará <strong>Inactivo</strong> y no se podrán agregar más anexos.
            </p>
          )}

          <label>Nuevo tipo de contrato (opcional)</label>
          <select name="tipo_contrato_nuevo" value={form.tipo_contrato_nuevo} onChange={handleChange}>
            <option value="">— Sin cambio —</option>
            {TIPOS_CONTRATO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {form.es_anexo_termino ? 'Fecha real de término *' : 'Nueva fecha de término (opcional)'}
            {esIndefinidoNuevo && !form.es_anexo_termino && (
              <span style={{
                fontSize: '11px', color: '#6b7280',
                background: '#f3f4f6', borderRadius: '4px',
                padding: '2px 6px', fontWeight: 500,
              }}>
                No aplica para Indefinido
              </span>
            )}
          </label>
          <input
            type="date"
            name="fecha_termino_nueva"
            value={form.fecha_termino_nueva}
            onChange={handleChange}
            disabled={esIndefinidoNuevo && !form.es_anexo_termino}
            style={(esIndefinidoNuevo && !form.es_anexo_termino) ? { opacity: 0.4, cursor: 'not-allowed', background: '#f9fafb' } : {}}
          />

          <label>Nuevo monto (opcional)</label>
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

// ─── Modal Ver Detalle ─────────────────────────────────────────────────────────

function DetalleModal({ contrato: contratoResumen, onClose, onCambio }) {
  const [contrato, setContrato] = useState(contratoResumen);
  const [loading,  setLoading]  = useState(true);
  const [modalAnexo, setModalAnexo] = useState(false);
  const [eliminandoAnexoId, setEliminandoAnexoId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getContratoById(contratoResumen.id_contrato);
      setContrato(mapContrato(data));
    } catch {
      // silencioso: el modal simplemente se queda con lo que ya tenía
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEliminarAnexo = async (id_anexo_contrato) => {
    if (!window.confirm('¿Eliminar este anexo? Esta acción no se puede deshacer.')) return;
    setEliminandoAnexoId(id_anexo_contrato);
    try {
      await deleteAnexoContrato(id_anexo_contrato);
      await cargar();
      onCambio && onCambio();
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
          <div>
            <span className="detalle-label">Monto</span>
            <span>{formatearMonto(contrato.monto)}</span>
          </div>
          {contrato.observaciones && (
            <div className="detalle-full">
              <span className="detalle-label">Observaciones</span>
              <span>{contrato.observaciones}</span>
            </div>
          )}
        </div>

        <div className="anexos-section">
          <div className="anexos-header">
            <h3>Anexos ({contrato.anexos?.length || 0})</h3>
            <button
              className="btn-agregar-anexo"
              onClick={() => setModalAnexo(true)}
              disabled={contrato.estado_contrato === 'Inactivo'}
              title={contrato.estado_contrato === 'Inactivo' ? 'No se pueden agregar anexos a un contrato Inactivo' : ''}
              style={contrato.estado_contrato === 'Inactivo' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <FilePlus size={14} /> Agregar anexo
            </button>
          </div>
          {contrato.estado_contrato === 'Inactivo' && (
            <p className="anexos-empty" style={{ color: '#991b1b' }}>
              Este contrato está Inactivo, no se pueden agregar nuevos anexos.
            </p>
          )}

          {loading ? (
            <p className="anexos-empty">Cargando anexos...</p>
          ) : (!contrato.anexos || contrato.anexos.length === 0) ? (
            <p className="anexos-empty">Este contrato aún no tiene anexos.</p>
          ) : (
            <ul className="anexos-list">
              {contrato.anexos.map((a) => (
                <li key={a.id_anexo_contrato} className="anexo-item">
                  <div className="anexo-item-header">
                    <span className="anexo-fecha">{formatearFecha(a.fecha_anexo)}</span>
                    <span className="anexo-motivo">{a.motivo}</span>
                    <button
                      className="btn-eliminar-anexo"
                      onClick={() => handleEliminarAnexo(a.id_anexo_contrato)}
                      disabled={eliminandoAnexoId === a.id_anexo_contrato}
                      title="Eliminar anexo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="anexo-descripcion">{a.descripcion_modificacion}</p>
                  <div className="anexo-meta">
                    <span>Vigencia hasta: {formatearFecha(a.fecha_vigencia)}</span>
                    {a.tipo_contrato_nuevo && <span>Nuevo tipo: {a.tipo_contrato_nuevo}</span>}
                    {a.fecha_termino_nueva && <span>Nueva fecha término: {formatearFecha(a.fecha_termino_nueva)}</span>}
                    {a.monto_nuevo !== null && a.monto_nuevo !== undefined && (
                      <span>Monto nuevo: {formatearMonto(a.monto_nuevo)}</span>
                    )}
                  </div>
                  {a.observaciones && <p className="anexo-observaciones">{a.observaciones}</p>}
                </li>
              ))}
            </ul>
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

      {modalAnexo && (
        <AnexoModal
          idContrato={contratoResumen.id_contrato}
          onClose={() => setModalAnexo(false)}
          onGuardado={async () => { setModalAnexo(false); await cargar(); onCambio && onCambio(); }}
        />
      )}
    </div>
  );
}

// ─── Modal Confirmar Eliminar ──────────────────────────────────────────────────

function ConfirmModal({ contrato, onClose, onConfirmar, eliminando }) {
  const puedeEliminar = contrato.estado_contrato === 'Inactivo';

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Eliminar contrato</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {puedeEliminar ? (
            <>
              <p>¿Eliminar el contrato de <strong>{contrato.trabajador.nombre}</strong>?</p>
              <p className="modal-warn">Esta acción no se puede deshacer.</p>
            </>
          ) : (
            <div className="modal-error">
              <AlertTriangle size={16} />
              Solo se pueden eliminar contratos con estado <strong>Inactivo</strong>.
              Este contrato está <strong>{contrato.estado_contrato}</strong>.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          {puedeEliminar && (
            <button className="btn-eliminar" onClick={onConfirmar} disabled={eliminando}>
              {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Menú contextual ──────────────────────────────────────────────────────────

function ContextMenu({ contrato, onEditar, onEliminar, onCerrar }) {
  const puedeEliminar = contrato.estado_contrato === 'Inactivo';
  return (
    <div className="context-menu" onMouseLeave={onCerrar}>
      <button onClick={() => { onEditar(contrato); onCerrar(); }}>Editar</button>
      <button
        className="ctx-danger"
        disabled={!puedeEliminar}
        title={puedeEliminar ? '' : 'Solo se pueden eliminar contratos Inactivos.'}
        style={!puedeEliminar ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        onClick={() => { if (puedeEliminar) { onEliminar(contrato); onCerrar(); } }}
      >
        Eliminar
      </button>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

const POR_PAGINA = 10;

function Contratos({ usuario, onLogout }) {
  const [contratos,    setContratos]    = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const [searchTerm,     setSearchTerm]     = useState('');
  const [filtroEstado,   setFiltroEstado]   = useState('Todos');
  const [filtroFecha,    setFiltroFecha]    = useState('Todos');
  const [filtrosActivos, setFiltrosActivos] = useState(false);
  const [pagina,         setPagina]         = useState(1);

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
      const data = await getContratos();
      setContratos(data.map(mapContrato));
    } catch {
      setError('No se pudo cargar los contratos. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContratos();
    getTrabajadores().then(setTrabajadores).catch(() => {});
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
      c.trabajador.nombre.toLowerCase().includes(term) ||
      c.trabajador.rut.toLowerCase().includes(term)    ||
      c.tipo_contrato.toLowerCase().includes(term);
    const matchEstado = !filtrosActivos || filtroEstado === 'Todos' || c.estado === filtroEstado;
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

  const handleConfirmarEliminar = async () => {
    if (!contratoDelete) return;
    setEliminando(true);
    try {
      await deleteContrato(contratoDelete.id_contrato);
      setContratoDelete(null);
      fetchContratos();
    } catch (e) {
      alert(e.message);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="dashboard-wrapper contratos-page">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">
          <div className="contratos-container">

            <div className="contratos-header">
              <div>
                <h1 className="vista-general-title">Contratos laborales</h1>
                <p className="vista-general-subtitle">Gestiona y consulta todos los contratos laborales.</p>
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
                  placeholder="Buscar por trabajador, RUT o tipo de contrato..."
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
              {filtrosActivos && filtroEstado !== 'Todos' && ` · ${filtroEstado}`}
              {filtrosActivos && filtroFecha  !== 'Todos' && ` · ${filtroFecha}`}
            </div>

            <div className="contratos-table-wrapper">
              {loading ? (
                <div className="table-loading">Cargando contratos...</div>
              ) : (
                <table className="contratos-table">
                  <thead>
                    <tr>
                      <th>TRABAJADOR</th><th>TIPO CONTRATO</th><th>INICIO</th>
                      <th>TÉRMINO</th><th>ESTADO</th><th>TIEMPO RESTANTE</th><th>ACCIONES</th>
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
                        <td className="col-acciones" style={{ position: 'relative' }}>
                          <button className="btn-accion" title="Ver detalles"
                            onClick={() => setContratoDetalle(contrato)}>
                            <Eye size={18} />
                          </button>
                          <button className="btn-accion" title="Más opciones"
                            onClick={() => setMenuAbierto(menuAbierto === contrato.id_contrato ? null : contrato.id_contrato)}>
                            <MoreVertical size={18} />
                          </button>
                          {menuAbierto === contrato.id_contrato && (
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
        <ContratoModal
          trabajadores={trabajadores}
          contratoEdit={contratoEdit}
          onClose={() => { setModalNuevo(false); setContratoEdit(null); }}
          onGuardado={() => { setModalNuevo(false); setContratoEdit(null); fetchContratos(); }}
        />
      )}
      {contratoDetalle && (
        <DetalleModal contrato={contratoDetalle} onClose={() => setContratoDetalle(null)} onCambio={fetchContratos} />
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

export default Contratos;