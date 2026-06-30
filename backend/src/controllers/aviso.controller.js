// controllers/aviso.controller.js
import * as avisoService from "../services/aviso.service.js";
import {
  validarCamposCrear,
  validarCamposEditar,
  validarAccesoCrear,
  validarAccesoEliminar,
  validarIdCuadrilla,
  validarIdAviso,
  normalizarPaginacion,
} from "../validations/aviso.validation.js";

// ─── Helpers HTTP ──────────────────────────────────────────────────────────────

const ok      = (res, data, meta)    => res.status(200).json({ data, ...(meta && { meta }) });
const created = (res, message, data) => res.status(201).json({ message, data });
const badReq  = (res, message)       => res.status(400).json({ message });
const forbid  = (res, message)       => res.status(403).json({ message });

const manejarError = (res, error, contexto) => {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(`Error en ${contexto}:`, error);
  return res.status(500).json({ message: "Error interno del servidor", error: error.message });
};

// ─── GET /avisos/cuadrillas  (solo Admin) ─────────────────────────────────────

export const getCuadrillas = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== "administrador")
      return forbid(res, "No tiene permisos para ver las cuadrillas");

    const data = await avisoService.listarCuadrillas();
    return ok(res, data);
  } catch (error) { return manejarError(res, error, "getCuadrillas"); }
};

// ─── GET /avisos/todas  (solo Admin) ─────────────────────────────────────────

export const getTodosLosAvisos = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== "administrador")
      return forbid(res, "No tiene permisos para ver todos los avisos");

    const data = await avisoService.listarTodosLosAvisos();
    return ok(res, data);
  } catch (error) { return manejarError(res, error, "getTodosLosAvisos"); }
};

// ─── GET /avisos/mi-unidad  (Admin / Supervisor / Trabajador) ────────────────

export const getAvisosMiUnidad = async (req, res) => {
  try {
    const { unidad, avisos } = await avisoService.listarAvisosMiUnidad(req.user.id_trabajador);
    return res.status(200).json({ unidad, data: avisos });
  } catch (error) { return manejarError(res, error, "getAvisosMiUnidad"); }
};

// ─── GET /avisos/cuadrilla/:id_cuadrilla  (Admin / Supervisor / Trabajador) ──

export const verAvisos = async (req, res) => {
  try {
    const { id_cuadrilla } = req.params;
    const { id_trabajador, tipo_usuario } = req.user;

    const errId = validarIdCuadrilla(id_cuadrilla);
    if (errId) return badReq(res, errId);

    const { page, limit } = normalizarPaginacion(req.query);

    const { avisos, ...meta } = await avisoService.listarAvisosDeCuadrilla({
      id_cuadrilla, id_trabajador, tipo_usuario, page, limit,
    });

    return ok(res, avisos, meta);
  } catch (error) { return manejarError(res, error, "verAvisos"); }
};

// ─── POST /avisos  o  POST /avisos/cuadrilla/:id_cuadrilla  (Admin / Supervisor) ──

export const crearAviso = async (req, res) => {
  try {
    const { titulo, contenido, prioridad } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario } = req.user;

    const errRol = validarAccesoCrear(tipo_usuario);
    if (errRol) return forbid(res, errRol);

    const errCampos = validarCamposCrear({ titulo, contenido, prioridad });
    if (errCampos) return badReq(res, errCampos);

    const id_cuadrilla = req.params.id_cuadrilla ?? req.body.id_cuadrilla;

    const data = await avisoService.crearAviso({
      id_cuadrilla, titulo: titulo.trim(), contenido: contenido.trim(),
      prioridad, id_solicitante, tipo_usuario,
    });

    return created(res, "Aviso creado correctamente", data);
  } catch (error) { return manejarError(res, error, "crearAviso"); }
};

// ─── PATCH /avisos/:id_aviso  (solo el autor) ────────────────────────────────

export const editarAviso = async (req, res) => {
  try {
    const { id_aviso } = req.params;
    const { titulo, contenido, prioridad } = req.body;
    const { id_trabajador: id_solicitante } = req.user;

    const errId = validarIdAviso(id_aviso);
    if (errId) return badReq(res, errId);

    const errCampos = validarCamposEditar({ titulo, contenido, prioridad });
    if (errCampos) return badReq(res, errCampos);

    const data = await avisoService.editarAviso({
      id_aviso,
      titulo:    titulo?.trim(),
      contenido: contenido?.trim(),
      prioridad,
      id_solicitante,
    });

    return ok(res, data);
  } catch (error) { return manejarError(res, error, "editarAviso"); }
};

// ─── DELETE /avisos/:id_aviso  (Admin libre / Supervisor solo los suyos) ─────

export const eliminarAviso = async (req, res) => {
  try {
    const { id_aviso } = req.params;
    const { id_trabajador: id_solicitante, tipo_usuario } = req.user;

    const errId = validarIdAviso(id_aviso);
    if (errId) return badReq(res, errId);

    const errRol = validarAccesoEliminar(tipo_usuario);
    if (errRol) return forbid(res, errRol);

    await avisoService.eliminarAviso({ id_aviso, id_solicitante, tipo_usuario });

    return res.status(200).json({ message: "Aviso eliminado correctamente" });
  } catch (error) { return manejarError(res, error, "eliminarAviso"); }
};