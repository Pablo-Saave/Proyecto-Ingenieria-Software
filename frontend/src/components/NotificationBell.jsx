// src/components/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, FileText, CalendarOff, Briefcase, Bell as BellIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificaciones } from '../context/NotificacionesContext';

function formatearTiempo(fecha) {
  const diffMs = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} d`;
}

function getIconoTipo(tipo) {
  if (tipo === 'contrato_por_vencer') return FileText;
  if (tipo === 'ausencia_aprobada' || tipo === 'ausencia_rechazada') return CalendarOff;
  if (tipo === 'nueva_asignacion') return Briefcase;
  return BellIcon;
}

// Ajusta este mapa cuando conectemos las notificaciones a sus páginas reales
function getRutaReferencia(n, tipoUsuario) {
  const base = tipoUsuario === 'administrador' ? '/admin' : '/app';
  if (n.referencia_tipo === 'aviso') {
    if (tipoUsuario === 'administrador') return `${base}/avisos`;
    if (tipoUsuario === 'supervisor') return '/supervisor/avisos';
    return `${base}/avisos`;
  }
  if (n.referencia_tipo === 'contrato') {
    return tipoUsuario === 'administrador' ? '/admin/contratos' : `${base}/mis-contratos`;
  }
  if (n.referencia_tipo === 'ausencia') return `${base}/mis-ausencias`;
  if (n.referencia_tipo === 'asignacion') return `${base}/mis-asignaciones`;
  return null;
}

function NotificationBell() {
  const { notificaciones, noLeidas, marcarLeida, marcarTodas, usuario } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const handleClickNotificacion = (n) => {
    if (!n.leido) marcarLeida(n.id_notificacion);
    const ruta = getRutaReferencia(n, usuario?.tipo_usuario);
    if (ruta) navigate(ruta);
    setAbierto(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setAbierto((p) => !p)}
        style={{
          position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
          color: '#6b7280', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8,
        }}
        title="Notificaciones"
      >
        <Bell size={20} />
        {noLeidas > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0, background: '#dc2626', color: '#fff',
            borderRadius: '999px', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, maxHeight: 420,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 1000, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Notificaciones</span>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodas}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                  color: '#4466ff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Check size={13} /> Marcar todas
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notificaciones.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                No tienes notificaciones
              </div>
            ) : (
              notificaciones.map((n) => {
                const Icono = getIconoTipo(n.tipo);
                return (
                  <button
                    key={n.id_notificacion}
                    onClick={() => handleClickNotificacion(n)}
                    style={{
                      display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px',
                      background: n.leido ? '#fff' : '#f5f7ff', border: 'none', borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: '#eef1ff', color: '#4466ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icono size={15} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: n.leido ? 500 : 700, color: '#111827' }}>
                        {n.titulo}
                      </p>
                      <p style={{
                        margin: '2px 0 0', fontSize: 12.5, color: '#6b7280',
                        overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {n.mensaje}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                        {formatearTiempo(n.fecha_creacion)}
                      </p>
                    </div>
                    {!n.leido && (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#4466ff', flexShrink: 0, marginTop: 4,
                      }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;