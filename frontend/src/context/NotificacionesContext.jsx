// src/context/NotificacionesContext.jsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  getNotificaciones,
  getContadorNoLeidas,
  marcarNotificacionLeida,
  marcarTodasLeidas as marcarTodasLeidasApi,
} from '../services/notificacionService';

const SOCKET_URL = 'http://146.83.198.35:1323/';

const NotificacionesContext = createContext(null);

export function NotificacionesProvider({ usuario, children }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const cargarInicial = useCallback(async () => {
    setLoading(true);
    try {
      const [listado, count] = await Promise.all([
        getNotificaciones(1, 20),
        getContadorNoLeidas(),
      ]);
      setNotificaciones(listado.notificaciones ?? []);
      setNoLeidas(count);
    } catch {
      // Si falla, simplemente queda vacío; no bloquea el resto de la app
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!usuario || !token) {
      // Usuario deslogueado: cerrar socket si existía y limpiar estado
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotificaciones([]);
      setNoLeidas(0);
      return;
    }

    cargarInicial();

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('notificacion:nueva', (nueva) => {
      setNotificaciones((prev) => [nueva, ...prev]);
      setNoLeidas((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [usuario, cargarInicial]);

  const marcarLeida = async (id_notificacion) => {
    // Optimista: actualiza UI antes de esperar la respuesta del servidor
    setNotificaciones((prev) =>
      prev.map((n) => (n.id_notificacion === id_notificacion ? { ...n, leido: true } : n))
    );
    setNoLeidas((prev) => Math.max(0, prev - 1));
    try {
      await marcarNotificacionLeida(id_notificacion);
    } catch {
      cargarInicial(); // si falla, resincroniza con el servidor
    }
  };

  const marcarTodas = async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    setNoLeidas(0);
    try {
      await marcarTodasLeidasApi();
    } catch {
      cargarInicial();
    }
  };

  return (
    <NotificacionesContext.Provider
      value={{ notificaciones, noLeidas, loading, marcarLeida, marcarTodas, recargar: cargarInicial, usuario }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de <NotificacionesProvider>');
  return ctx;
}