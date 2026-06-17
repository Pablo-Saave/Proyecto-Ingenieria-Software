import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  CalendarOff, Plus, X, Save, AlertCircle, ClipboardList, Trash2, Paperclip, FileText,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Error ${res.status}`);
  }
  return res.json();
}

const EMPTY_FORM = { fecha_inicio: '', fecha_termino: '', motivo: '' };
const FILTROS = ['Todas', 'Pendiente', 'Aprobada', 'Rechazada'];

function MisAusencias({ usuario, onLogout }) {
  const [ausencias, setAusencias]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [filtro, setFiltro]               = useState('Todas');
  const [showModal, setShowModal]         = useState(false);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [formError, setFormError]         = useState(null);
  const [saving, setSaving]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // PDF adjunto
  const [archivoPDF, setArchivoPDF]       = useState(null);
  const fileInputRef                       = useRef(null);

  const idTrabajador = usuario?.id_trabajador;

  const fetchAusencias = async () => {
    if (!idTrabajador) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/ausencias/trabajador/${idTrabajador}`);
      setAusencias(Array.isArray(res) ? res : res.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAusencias(); }, [idTrabajador]);

  const filtered = filtro === 'Todas'
    ? ausencias
    : ausencias.filter((a) => a.estado === filtro);

  const estadoBadgeClass = (estado) => {
    if (estado === 'Aprobada')  return 'badge-activo';
    if (estado === 'Rechazada') return 'badge-inactivo';
    return 'badge-licencia';
  };

  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const diasAusencia = (inicio, fin) => {
    if (!inicio || !fin) return '—';
    const diff = (new Date(fin) - new Date(inicio)) / (1000 * 60 * 60 * 24);
    return diff >= 0 ? `${diff + 1} día${diff !== 0 ? 's' : ''}` : '—';
  };

  const total      = ausencias.length;
  const aprobadas  = ausencias.filter((a) => a.estado === 'Aprobada').length;
  const pendientes = ausencias.filter((a) => a.estado === 'Pendiente').length;
  const rechazadas = ausencias.filter((a) => a.estado === 'Rechazada').length;

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setFormError('Solo se aceptan archivos PDF.');
      setArchivoPDF(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('El archivo no puede superar 5 MB.');
      setArchivoPDF(null);
      return;
    }
    setFormError(null);
    setArchivoPDF(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      // 1. Crear la ausencia
      const resAusencia = await apiFetch('/api/ausencias', {
        method: 'POST',
        body: JSON.stringify({ ...formData, id_trabajador: idTrabajador }),
      });

      const idAusencia = resAusencia?.id_ausencia ?? resAusencia?.data?.id_ausencia;

      // 2. Si hay PDF, subirlo vinculado a la ausencia
      if (archivoPDF && idAusencia) {
        const formDataPDF = new FormData();
        formDataPDF.append('archivo', archivoPDF);

        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/api/ausencias/${idAusencia}/documento`, {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formDataPDF,
        });
        // Si el endpoint aún no existe, falla silenciosamente
      }

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

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/ausencias/${id}`, { method: 'DELETE' });
      setAusencias((prev) => prev.filter((a) => a.id_ausencia !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const abrirModal = () => {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setArchivoPDF(null);
    setShowModal(true);
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
              <p className="vista-general-subtitle">
                Historial y solicitudes de {usuario?.nombres} {usuario?.apellidos}
              </p>
            </div>
            <button className="btn-nuevo-trabajador" onClick={abrirModal}>
              <Plus size={16} /> Nueva Solicitud
            </button>
          </div>

          {/* Resumen */}
          <div className="metrics-grid" style={{ marginBottom: '20px' }}>
            {[
              { label: 'Total',      value: total,      color: '#4F46E5' },
              { label: 'Aprobadas',  value: aprobadas,  color: '#10B981' },
              { label: 'Pendientes', value: pendientes, color: '#F59E0B' },
              { label: 'Rechazadas', value: rechazadas, color: '#EF4444' },
            ].map((m) => (
              <div key={m.label} className="metric-card">
                <div className="metric-header">
                  <h3 className="metric-title">{m.label}</h3>
                  <CalendarOff size={18} color={m.color} />
                </div>
                <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="tw-toolbar" style={{ marginBottom: '12px' }}>
            <div className="tw-filters">
              {FILTROS.map((f) => (
                <button
                  key={f}
                  className={`tw-filter-btn ${filtro === f ? 'tw-filter-active' : ''}`}
                  onClick={() => setFiltro(f)}
                >{f}</button>
              ))}
            </div>
          </div>

          {error && <div className="tw-error-banner"><AlertCircle size={16} /> {error}</div>}

          <div className="tw-table-card">
            {loading ? (
              <div className="tw-loading"><div className="tw-spinner" /> Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="tw-empty">
                <ClipboardList size={40} />
                <p>No hay ausencias {filtro !== 'Todas' ? `con estado "${filtro}"` : 'registradas'}</p>
              </div>
            ) : (
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>Fecha Inicio</th>
                    <th>Fecha Término</th>
                    <th>Duración</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Comentario</th>
                    <th>Doc.</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id_ausencia}>
                      <td>{formatFecha(a.fecha_inicio)}</td>
                      <td>{formatFecha(a.fecha_termino)}</td>
                      <td className="aus-duracion">{diasAusencia(a.fecha_inicio, a.fecha_termino)}</td>
                      <td className="aus-motivo">{a.motivo ?? '—'}</td>
                      <td>
                        <span className={`tw-badge ${estadoBadgeClass(a.estado)}`}>
                          {a.estado ?? '—'}
                        </span>
                      </td>
                      <td className="aus-motivo">
                        {a.comentario_revision
                          ? <span title={a.comentario_revision}>{a.comentario_revision}</span>
                          : <span style={{ color: '#9ca3af' }}>Sin revisión</span>
                        }
                      </td>
                      <td>
                        {a.url_documento
                          ? <a href={a.url_documento} target="_blank" rel="noopener noreferrer" title="Ver documento">
                              <FileText size={16} color="#4F46E5" />
                            </a>
                          : <span style={{ color: '#d1d5db' }}>—</span>
                        }
                      </td>
                      <td>
                        {a.estado === 'Pendiente' && (
                          <button
                            className="tw-btn-delete"
                            title="Cancelar solicitud"
                            onClick={() => setConfirmDelete(a.id_ausencia)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Solicitud */}
      {showModal && (
        <div className="tw-modal-overlay" onClick={() => setShowModal(false)}>
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

                {/* Adjuntar PDF */}
                <div className="tw-field tw-field-full">
                  <label>Documento de respaldo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(PDF, máx. 5 MB — opcional)</span></label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div
                    style={{
                      border: '1.5px dashed #d1d5db',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      background: archivoPDF ? '#f0fdf4' : '#fafafa',
                      borderColor: archivoPDF ? '#10B981' : '#d1d5db',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {archivoPDF ? (
                      <>
                        <FileText size={18} color="#10B981" />
                        <span style={{ fontSize: '13px', color: '#065f46', flex: 1 }}>{archivoPDF.name}</span>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                          onClick={(e) => { e.stopPropagation(); setArchivoPDF(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Paperclip size={18} color="#9ca3af" />
                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                          Haz clic para adjuntar un PDF de respaldo
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="tw-modal-footer">
                <button type="button" className="tw-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={saving}>
                  <Save size={14} /> {saving ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar cancelación */}
      {confirmDelete !== null && (
        <div className="tw-modal-overlay" onClick={() => setConfirmDelete(null)}>
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