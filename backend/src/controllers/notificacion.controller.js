// controllers/notificacion.controller.js
import * as notificacionService from "../services/Notificacion.service.js";

const manejarError = (res, error, contexto) => {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(`Error en ${contexto}:`, error);
  return res.status(500).json({ message: "Error interno del servidor", error: error.message });
};

// GET /api/notificaciones?page=&limit=
export const getNotificaciones = async (req, res) => {
  try {
    const { id_trabajador } = req.user;
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.max(1, Number(req.query.limit) || 20);

    const data = await notificacionService.listarNotificaciones(id_trabajador, { page, limit });
    return res.status(200).json(data);
  } catch (error) {
    return manejarError(res, error, "getNotificaciones");
  }
};

// GET /api/notificaciones/no-leidas/count
export const getContadorNoLeidas = async (req, res) => {
  try {
    const { id_trabajador } = req.user;
    const count = await notificacionService.contarNoLeidas(id_trabajador);
    return res.status(200).json({ count });
  } catch (error) {
    return manejarError(res, error, "getContadorNoLeidas");
  }
};

// PATCH /api/notificaciones/:id_notificacion/leer
export const marcarLeida = async (req, res) => {
  try {
    const { id_notificacion } = req.params;
    const { id_trabajador } = req.user;
    const data = await notificacionService.marcarLeida(id_notificacion, id_trabajador);
    return res.status(200).json({ data });
  } catch (error) {
    return manejarError(res, error, "marcarLeida");
  }
};

// PATCH /api/notificaciones/leer-todas
export const marcarTodasLeidas = async (req, res) => {
  try {
    const { id_trabajador } = req.user;
    await notificacionService.marcarTodasLeidas(id_trabajador);
    return res.status(200).json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    return manejarError(res, error, "marcarTodasLeidas");
  }
};