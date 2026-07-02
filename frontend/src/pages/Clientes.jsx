// pages/Clientes.jsx (Administrador)
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/trabajadores.css';
import {
  Building2, Plus, Search, Edit2, Trash2, X, Save, AlertCircle,
} from 'lucide-react';
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../services/clienteService';

const EMPTY_FORM = {
  nombres: '',
  apellidos: '',
  tipo_cliente: '',
  rubro: '',
  telefono: '',
  correo: '',
  direccion: '',
};

function getIniciales(nombres = '', apellidos = '') {
  const n = String(nombres || '').trim();
  const a = String(apellidos || '').trim();
  return ((n[0] || '') + (a[0] || '')).toUpperCase();
}

function Clientes({ usuario, onLogout }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('crear');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = clientes.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(q) ||
      c.correo?.toLowerCase().includes(q) ||
      c.rubro?.toLowerCase().includes(q) ||
      c.tipo_cliente?.toLowerCase().includes(q)
    );
  });

  const openCrear = () => {
    setFormData(EMPTY_FORM);
    setSelectedId(null);
    setFormError(null);
    setModalMode('crear');
    setShowModal(true);
  };

  const openEditar = (c) => {
    setFormData({
      nombres: c.nombres ?? '',
      apellidos: c.apellidos ?? '',
      tipo_cliente: c.tipo_cliente ?? '',
      rubro: c.rubro ?? '',
      telefono: c.telefono ?? '',
      correo: c.correo ?? '',
      direccion: c.direccion ?? '',
    });
    setSelectedId(c.id_cliente);
    setFormError(null);
    setModalMode('editar');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormError(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (modalMode === 'crear') {
        const item = await createCliente(formData);
        setClientes((prev) => [...prev, item]);
      } else {
        const item = await updateCliente(selectedId, formData);
        setClientes((prev) =>
          prev.map((c) => (c.id_cliente === selectedId ? item : c))
        );
      }
      closeModal();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDelete = async (id) => {
    try {
      await deleteCliente(id);
      setClientes((prev) => prev.filter((c) => c.id_cliente !== id));
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
              <h1 className="vista-general-title">Clientes</h1>
              <p className="vista-general-subtitle">Gestion de clientes y empresas asociadas</p>
            </div>
            <div className="tw-header-actions">
              <button className="btn-nuevo-trabajador" onClick={openCrear}>
                <Plus size={14} /> Nuevo Cliente
              </button>
            </div>
          </div>

          <div className="tw-toolbar">
            <div className="tw-search-wrapper">
              <Search size={16} className="tw-search-icon" />
              <input
                type="text"
                className="tw-search-input"
                placeholder="Buscar por nombre, correo, rubro o tipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="tw-count">
            <Building2 size={14} />
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
          </div>

          {error && (
            <div className="tw-error-banner">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="tw-table-card">
            {loading ? (
              <div className="tw-loading">
                <div className="tw-spinner" /> Cargando clientes...
              </div>
            ) : filtered.length === 0 ? (
              <div className="tw-empty">
                <Building2 size={40} />
                <p>No se encontraron clientes</p>
              </div>
            ) : (
              <table className="tw-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Rubro</th>
                    <th>Correo</th>
                    <th>Telefono</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id_cliente}>
                      <td>
                        <div className="tw-name-cell">
                          <div className="tw-avatar">
                            {getIniciales(c.nombres, c.apellidos) || '?'}
                          </div>
                          <div className="tw-fullname">
                            {c.nombres} {c.apellidos}
                          </div>
                        </div>
                      </td>
                      <td>{c.tipo_cliente ?? '-'}</td>
                      <td>{c.rubro ?? '-'}</td>
                      <td className="tw-email">{c.correo ?? '-'}</td>
                      <td>{c.telefono ?? '-'}</td>
                      <td>
                        <div className="tw-actions">
                          <button className="tw-btn-edit" title="Editar" onClick={() => openEditar(c)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="tw-btn-delete" title="Eliminar" onClick={() => setConfirmDelete(c.id_cliente)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="tw-modal-overlay">
          <div className="tw-modal tw-modal-md" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '95vw' }}>
            <div className="tw-modal-header" style={{ padding: '14px 22px' }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>{modalMode === 'crear' ? 'Nuevo Cliente' : 'Editar Cliente'}</h2>
              <button className="tw-modal-close" onClick={closeModal}><X size={16} /></button>
            </div>

            {formError && (
              <div className="tw-form-error"><AlertCircle size={13} /> {formError}</div>
            )}

            <form className="tw-form" onSubmit={handleSubmit} style={{ padding: '14px 22px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
                {[
                  { label: 'Nombres *', name: 'nombres', type: 'text', required: true, placeholder: 'Maria Jose', span: 1 },
                  { label: 'Apellidos *', name: 'apellidos', type: 'text', required: true, placeholder: 'Rojas Perez', span: 1 },
                  { label: 'Tipo de cliente *', name: 'tipo_cliente', type: 'text', required: true, placeholder: 'Ej: Empresa, Particular', span: 1 },
                  { label: 'Rubro *', name: 'rubro', type: 'text', required: true, placeholder: 'Ej: Retail, Salud, Educacion', span: 1 },
                  { label: 'Telefono *', name: 'telefono', type: 'text', required: true, placeholder: '+56 9 1234 5678', span: 1 },
                  { label: 'Correo *', name: 'correo', type: 'email', required: true, placeholder: 'cliente@empresa.cl', span: 1 },
                  { label: 'Direccion *', name: 'direccion', type: 'text', required: true, placeholder: 'Ej: Av. Principal 456, Concepcion', span: 2 },
                ].map(({ label, name, type, required, placeholder, span }) => (
                  <div key={name} className="tw-field" style={{ marginBottom: 0, gridColumn: span === 2 ? 'span 2' : 'auto' }}>
                    <label style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4, display: 'block', textTransform: 'uppercase', color: '#6b7280' }}>{label}</label>
                    <input name={name} type={type} value={formData[name] ?? ''} onChange={handleChange} required={required} placeholder={placeholder}
                      style={{ height: 36, fontSize: 13, padding: '0 11px', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>

              <div className="tw-modal-footer" style={{ padding: '12px 0 0', marginTop: 12 }}>
                <button type="button" className="tw-btn-cancel" onClick={closeModal} style={{ fontSize: 13, padding: '8px 18px' }}>Cancelar</button>
                <button type="submit" className="tw-btn-save" disabled={saving} style={{ fontSize: 13, padding: '8px 18px' }}>
                  <Save size={12} />
                  {saving ? 'Guardando...' : modalMode === 'crear' ? 'Crear Cliente' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="tw-modal-overlay">
          <div className="tw-modal tw-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tw-modal-header">
              <h2>Confirmar eliminacion</h2>
              <button className="tw-modal-close" onClick={() => setConfirmDelete(null)}><X size={18} /></button>
            </div>
            <p className="tw-confirm-text">
              Estas seguro de que deseas eliminar este cliente? Esta accion no se puede deshacer.
              Si el cliente tiene proyectos asociados, es posible que el backend no permita eliminarlo.
            </p>
            <div className="tw-modal-footer">
              <button className="tw-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="tw-btn-delete-confirm" onClick={() => handleDelete(confirmDelete)}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;