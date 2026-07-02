import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  Plus, X, Save, AlertCircle, ClipboardList,
  Trash2, Paperclip, FileText, AlertTriangle,
} from 'lucide-react';
import {
  crearAusencia,
  justificarAusencia as justificarAusenciaService,
  eliminarAusencia as eliminarAusenciaService,
  getAusenciasPorTrabajador,
} from '../services/ausenciasService';
import { getMiCuadrilla } from '../services/cuadrillasService';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const EMPTY_FORM = { fecha_inicio: '', fecha_termino: '', motivo: '' };
const FILTROS = ['Todas', 'Por Justificar', 'Pendiente', 'Justificada', 'Injustificada'];

function MisAusencias({ usuario, onLogout }) {
  const [ausencias, setAusencias]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [filtro, setFiltro]               = useState('Todas');

  // Cuadrilla propia del trabajador (necesaria para crear una ausencia propia)
  const [miCuadrilla, setMiCuadrilla]           = useState(null);
  const [miCuadrillaLoading, setMiCuadrillaLoading] = useState(false);
  const [miCuadrillaError, setMiCuadrillaError]     = useState(null);

  // Modal nueva solicitud
  const [showModal, setShowModal]         = useState(false);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [formError, setFormError]         = useState(null);
  const [saving, setSaving]               = useState(false);
  const [archivoPDF, setArchivoPDF]       = useState(null);
  const fileInputRef                       = useRef(null);

  // Modal justificar (ausencias "Por Justificar")
  const [showJustificar, setShowJustificar] = useState(false);
  const [justificarId, setJustificarId]     = useState(null);
  const [justificarMotivo, setJustificarMotivo] = useState('');
  const [justificarError, setJustificarError]   = useState(null);
  const [savingJustificar, setSavingJustificar] = useState(false);
  const [archivoJustificar, setArchivoJustificar] = useState(null);
  const fileJustificarRef                          = useRef(null);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const idTrabajador = usuario?.id_trabajador;

  const fetchAusencias = async () => {
    if (!idTrabajador) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAusenciasPorTrabajador(idTrabajador);
      setAusencias(Array.isArray(res) ? res : res.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMiCuadrilla = async () => {
    setMiCuadrillaLoading(true);
    setMiCuadrillaError(null);
    try {
      const res = await getMiCuadrilla();
      setMiCuadrilla(res?.data ?? null);
    } catch (e) {
      setMiCuadrilla(null);
      setMiCuadrillaError(e.message || 'No se pudo determinar tu cuadrilla');
    } finally {
      setMiCuadrillaLoading(false);
    }
  };

  useEffect(() => {
    fetchAusencias();
    fetchMiCuadrilla();
  }, [idTrabajador]);

  const filtered = filtro === 'Todas' ? ausencias : ausencias.filter((a) => a.estado === filtro);

  const estadoBadgeClass = (estado) => {
    if (estado === 'Justificada')    return 'badge-activo';
    if (estado === 'Injustificada')  return 'badge-inactivo';
    if (estado === 'Por Justificar') return 'badge-por-justificar';
    return 'badge-licencia'; // Pendiente
  };

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const diasAusencia = (inicio, fin) => {
    if (!inicio || !fin) return '—';
    const diff = (new Date(fin) - new Date(inicio)) / (1000 * 60 * 60 * 24);
    return diff >= 0 ? `${diff + 1} día${diff !== 0 ? 's' : ''}` : '—';
  };

  const ausenciasPorJustificar = ausencias.filter((a) => a.estado === 'Por Justificar');

  // La columna Acciones solo se muestra si alguna fila visible tiene una acción posible
  const hayAccionesVisibles = filtered.some(
    (a) => a.estado === 'Por Justificar' || a.estado === 'Pendiente'
  );

  // ── Nueva solicitud ──────────────────────────────────────────────────────
  const abrirModal = () => {
    setFormData(EMPTY_FORM); setFormError(null); setArchivoPDF(null); setShowModal(true);
    if (!miCuadrilla && !miCuadrillaLoading) fetchMiCuadrilla();
  };
  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setFormError('Solo se aceptan archivos PDF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setFormError('El archivo no puede superar 5 MB.'); return; }
    setFormError(null);
    setArchivoPDF(file);
  };

  const subirPDF = async (idAusencia, archivo) => {
    if (!archivo) return;
    const formDataPDF = new FormData();
    formDataPDF.append('archivo', archivo);
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/api/ausencias/${idAusencia}/documento`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formDataPDF,
    }).catch(() => {}); // si el endpoint no existe, falla silenciosamente
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!miCuadrilla?.id_cuadrilla) {
      setFormError('No se pudo determinar tu cuadrilla. No es posible registrar la solicitud.');
      return;
    }

    setSaving(true);
    try {
      const resAusencia = await crearAusencia({
        ...formData,
        id_trabajador: idTrabajador,
        id_cuadrilla: miCuadrilla.id_cuadrilla,
      });
      const idAusencia = resAusencia?.id_ausencia ?? resAusencia?.data?.id_ausencia;
      await subirPDF(idAusencia, archivoPDF);

      setShowModal(false);
      setFormData(EMPTY_FORM);
      setArchivoPDF(null);
      fetchAusencias();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Justificar ausencia "Por Justificar" ─────────────────────────────────
  const abrirJustificar = (ausencia) => {
    setJustificarId(ausencia.id_ausencia);
    setJustificarMotivo('');
    setJustificarError(null);
    setArchivoJustificar(null);
    setShowJustificar(true);
  };

  const handleFileJustificar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setJustificarError('Solo se aceptan archivos PDF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setJustificarError('El archivo no puede superar 5 MB.'); return; }
    setJustificarError(null);
    setArchivoJustificar(file);
  };

  const handleSubmitJustificar = async (e) => {
    e.preventDefault();
    setJustificarError(null);
    setSavingJustificar(true);
    try {
      await justificarAusenciaService(justificarId, { motivo: justificarMotivo });
      await subirPDF(justificarId, archivoJustificar);

      setShowJustificar(false);
      fetchAusencias();
    } catch (e) {
      setJustificarError(e.message);
    } finally {
      setSavingJustificar(false);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await eliminarAusenciaService(id);
      setAusencias((prev) => prev.filter((a) => a.id_ausencia !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar usuario={usuario} />
      <div className="dashboard-main">
        <Header onLogout={onLogout} />
        <div className="dashboard-content">

          <div className="vista-general-header">
            <div>
              <h1 className="vista-general-title">Mis Ausencias</h1>
              <p className="vista-general-subtitle">Historial y solicitudes de {usuario?.nombres} {usuario?.apellidos}</p>
            </div>
            <button
              className="btn-nuevo-trabajador"
              onClick={abrirModal}
              disabled={miCuadrillaLoading}
              title={miCuadrillaError ? 'No se pudo determinar tu cuadrilla' : undefined}
            >
              <Plus size={16} /> Nueva Solicitud
            </button>
          </div>

          {miCuadrillaError && (
            <div className="tw-error-banner" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} /> No pudimos determinar tu cuadrilla ({miCuadrillaError}). No podrás crear solicitudes nuevas hasta que estés asignado a una.
            </div>
          )}

          {/* Aviso de ausencias por justificar */}
          {ausenciasPorJustificar.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
            }}>
              <AlertTriangle size={20} color="#ea580c" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#9a3412' }}>
                  Tienes {ausenciasPorJustificar.length} ausencia{ausenciasPorJustificar.length !== 1 ? 's' : ''} por justificar
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#c2410c' }}>
                  Tu supervisor registró una inasistencia. Tienes 24 horas para justificarla.
                </p>
              </div>
              <button
                className="btn-nuevo-trabajador"
                style={{ background: '#ea580c', flexShrink: 0 }}
                onClick={() => abrirJustificar(ausenciasPorJustificar[0])}
              >
                Justificar ahora
              </button>
            </div>
          )}

          {/* Filtros */}
          <div className="tw-toolbar" style={{ marginBottom: '12px' }}>
            <div className="tw-filters">
              {FILTROS.map((f) => (
                <button key={f} className={`tw-filter-btn ${filtro === f ? 'tw-filter-active' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
              ))}
            </div>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          <div className="tw-table-card">
            {loading ? (
              <div className="tw-loading"><div className="tw-spinner" /> Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="tw-empty"><ClipboardList size={40} /><p>No hay ausencias {filtro !== 'Todas' ? `con estado "${filtro}"` : 'registradas'}</p></div>
            ) : (
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>Fecha Inicio</th><th>Fecha Término</th><th>Duración</th>
                    <th>Motivo</th><th>Estado</th><th>Comentario</th><th>Doc.</th>
                    {hayAccionesVisibles && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const esPorJustificar = a.estado === 'Por Justificar';
                    return (
                      <tr key={a.id_ausencia}>
                        <td>{formatFecha(a.fecha_inicio)}</td>
                        <td>{formatFecha(a.fecha_termino)}</td>
                        <td className="aus-duracion">{diasAusencia(a.fecha_inicio, a.fecha_termino)}</td>
                        <td className="aus-motivo">
                          {esPorJustificar
                            ? <span style={{ color: '#ea580c', fontWeight: 600 }}>Pendiente de tu justificación</span>
                            : (a.justificacion?.motivo ?? '—')}
                        </td>
                        <td><span className={`tw-badge ${estadoBadgeClass(a.estado)}`}>{a.estado ?? '—'}</span></td>
                        <td className="aus-motivo">
                          {a.justificacion?.comentario_revision
                            ? <span title={a.justificacion.comentario_revision}>{a.justificacion.comentario_revision}</span>
                            : <span style={{ color: '#9ca3af' }}>Sin revisión</span>}
                        </td>
                        <td>
                          {a.justificacion?.documento_respaldo
                            ? <a href={`${API_BASE}${a.justificacion.documento_respaldo}`} target="_blank" rel="noopener noreferrer"><FileText size={16} color="#4F46E5" /></a>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        {hayAccionesVisibles && (
                          <td>
                            {esPorJustificar && (
                              <button
                                className="tw-btn-edit"
                                title="Justificar"
                                onClick={() => abrirJustificar(a)}
                                style={{ background: '#fff7ed', color: '#ea580c' }}
                              >
                                <AlertTriangle size={14} />
                              </button>
                            )}
                            {a.estado === 'Pendiente' && (
                              <button className="tw-btn-delete" title="Cancelar solicitud" onClick={() => setConfirmDelete(a.id_ausencia)}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Solicitud */}
      {showModal && (
        <div className="tw-modal-overlay">
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Nueva Solicitud de Ausencia</h2>
              <button className="tw-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            {formError && <div className="tw-form-error"><AlertCircle size={14} /> {formError}</div>}
            <form className="tw-form" onSubmit={handleSubmit}>
              <div className="tw-form-grid">
                <div className="tw-field">
                  <label>Fecha Inicio *</label>
                  <input name="fecha_inicio" type="date" value={formData.fecha_inicio} onChange={handleChange} required />
                </div>
                <div className="tw-field">
                  <label>Fecha Término *</label>
                  <input name="fecha_termino" type="date" value={formData.fecha_termino} onChange={handleChange} required />
                </div>
                <div className="tw-field tw-field-full">
                  <label>Motivo *</label>
                  <input name="motivo" value={formData.motivo} onChange={handleChange} required placeholder="Describe el motivo de tu ausencia" />
                </div>
                <div className="tw-field tw-field-full">
                  <label>Documento de respaldo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(PDF, máx. 5 MB — opcional)</span></label>
                  <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                  <div
                    style={{
                      border: '1.5px dashed #d1d5db', borderRadius: '8px', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                      background: archivoPDF ? '#f0fdf4' : '#fafafa', borderColor: archivoPDF ? '#10B981' : '#d1d5db',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {archivoPDF ? (
                      <>
                        <FileText size={18} color="#10B981" />
                        <span style={{ fontSize: '13px', color: '#065f46', flex: 1 }}>{archivoPDF.name}</span>
                        <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                          onClick={(e) => { e.stopPropagation(); setArchivoPDF(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Paperclip size={18} color="#9ca3af" />
                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>Haz clic para adjuntar un PDF de respaldo</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={saving || !miCuadrilla?.id_cuadrilla}>
                  <Save size={14} /> {saving ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Justificar */}
      {showJustificar && (
        <div className="tw-modal-overlay" onClick={() => setShowJustificar(false)}>
          <div className="tw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Justificar Ausencia</h2>
              <button className="tw-modal-close" onClick={() => setShowJustificar(false)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 24px 14px' }}>
              Tu supervisor registró esta ausencia. Cuéntanos qué pasó para que pueda revisarla.
            </p>
            {justificarError && <div className="tw-form-error"><AlertCircle size={14} /> {justificarError}</div>}
            <form className="tw-form" onSubmit={handleSubmitJustificar}>
              <div className="tw-form-grid">
                <div className="tw-field tw-field-full">
                  <label>Tu justificación *</label>
                  <input
                    value={justificarMotivo}
                    onChange={(e) => setJustificarMotivo(e.target.value)}
                    required
                    placeholder="Ej: Tuve una consulta médica de urgencia"
                  />
                </div>
                <div className="tw-field tw-field-full">
                  <label>Documento de respaldo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(PDF, máx. 5 MB — opcional)</span></label>
                  <input ref={fileJustificarRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileJustificar} />
                  <div
                    style={{
                      border: '1.5px dashed #d1d5db', borderRadius: '8px', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                      background: archivoJustificar ? '#f0fdf4' : '#fafafa', borderColor: archivoJustificar ? '#10B981' : '#d1d5db',
                    }}
                    onClick={() => fileJustificarRef.current?.click()}
                  >
                    {archivoJustificar ? (
                      <>
                        <FileText size={18} color="#10B981" />
                        <span style={{ fontSize: '13px', color: '#065f46', flex: 1 }}>{archivoJustificar.name}</span>
                        <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                          onClick={(e) => { e.stopPropagation(); setArchivoJustificar(null); if (fileJustificarRef.current) fileJustificarRef.current.value = ''; }}>
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Paperclip size={18} color="#9ca3af" />
                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>Ej: certificado médico, comprobante, etc.</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowJustificar(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" style={{ background: '#ea580c' }} disabled={savingJustificar}>
                  <Save size={14} /> {savingJustificar ? 'Enviando...' : 'Enviar Justificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar cancelación */}
      {confirmDelete !== null && (
        <div className="tw-modal-overlay">
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Cancelar solicitud</h2>
              <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <p className="tw-confirm-text">¿Estás seguro de que deseas cancelar esta solicitud?</p>
            <div className="tw-modal-footer">
              <button className="tw-btn-cancel" onClick={() => setConfirmDelete(null)}>No, mantener</button>
              <button className="tw-btn-delete-confirm" onClick={() => handleDelete(confirmDelete)}>
                <Trash2 size={14} /> Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MisAusencias;