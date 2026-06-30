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

// Maneja errores inesperados o errores con status propio (ej: error.status = 404)
const manejarError = (res, error, contexto) => {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(`Error en ${contexto}:`, error);
  return res.status(500).json({ message: "Error interno del servidor", error: error.message });
};

// GET /avisos/cuadrillas  (solo Admin) 

export const getCuadrillas = async (req, res) => {
  try {
    // Solo el administrador puede ver el listado de cuadrillas
    if (req.user.tipo_usuario !== "administrador") {
      return res.status(403).json({ message: "No tiene permisos para ver las cuadrillas" });
    }

    const data = await avisoService.listarCuadrillas();
    return res.status(200).json({ data });
  } catch (error) {
    return manejarError(res, error, "getCuadrillas");
  }
};

// GET /avisos/todas  (solo Admin)

export const getTodosLosAvisos = async (req, res) => {
  try {
    // Solo el administrador puede ver todos los avisos de todas las cuadrillas
    if (req.user.tipo_usuario !== "administrador") {
      return res.status(403).json({ message: "No tiene permisos para ver todos los avisos" });
    }

    const data = await avisoService.listarTodosLosAvisos();
    return res.status(200).json({ data });
  } catch (error) {
    return manejarError(res, error, "getTodosLosAvisos");
  }
};

// GET /avisos/mi-unidad  (Admin / Supervisor / Trabajador)

export const getAvisosMiUnidad = async (req, res) => {
  try {
    // Trae los avisos de la cuadrilla/unidad a la que pertenece el usuario logueado
    const { unidad, avisos } = await avisoService.listarAvisosMiUnidad(req.user.id_trabajador);
    return res.status(200).json({ unidad, data: avisos });
  } catch (error) {
    return manejarError(res, error, "getAvisosMiUnidad");
  }
};

// GET /avisos/cuadrilla/:id_cuadrilla  (Admin / Supervisor / Trabajador)

export const verAvisos = async (req, res) => {
  try {
    const { id_cuadrilla } = req.params;
    const { id_trabajador, tipo_usuario } = req.user;

    // Valida que el id de cuadrilla venga bien formado
    const errId = validarIdCuadrilla(id_cuadrilla);
    if (errId) return res.status(400).json({ message: errId });

    // Normaliza page/limit que llegan por query string
    const { page, limit } = normalizarPaginacion(req.query);

    // El service revisa permisos según el rol y devuelve los avisos + datos de paginación
    const { avisos, ...meta } = await avisoService.listarAvisosDeCuadrilla({
      id_cuadrilla, id_trabajador, tipo_usuario, page, limit,
    });

    return res.status(200).json({ data: avisos, meta });
  } catch (error) {
    return manejarError(res, error, "verAvisos");
  }
};

//POST /avisos  o  POST /avisos/cuadrilla/:id_cuadrilla  (Admin / Supervisor) 

export const crearAviso = async (req, res) => {
  try {
    const { titulo, contenido, prioridad } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario } = req.user;

    // Solo admin/supervisor pueden crear avisos
    const errRol = validarAccesoCrear(tipo_usuario);
    if (errRol) return res.status(403).json({ message: errRol });

    // Valida que titulo, contenido y prioridad vengan correctos
    const errCampos = validarCamposCrear({ titulo, contenido, prioridad });
    if (errCampos) return res.status(400).json({ message: errCampos });

    // El id_cuadrilla puede venir por la URL o por el body, según la ruta usada
    const id_cuadrilla = req.params.id_cuadrilla ?? req.body.id_cuadrilla;

    const data = await avisoService.crearAviso({
      id_cuadrilla, titulo: titulo.trim(), contenido: contenido.trim(),
      prioridad, id_solicitante, tipo_usuario,
    });

    return res.status(201).json({ message: "Aviso creado correctamente", data });
  } catch (error) {
    return manejarError(res, error, "crearAviso");
  }
};

// PATCH /avisos/:id_aviso  (solo el autor) 

export const editarAviso = async (req, res) => {
  try {
    const { id_aviso } = req.params;
    const { titulo, contenido, prioridad } = req.body;
    const { id_trabajador: id_solicitante } = req.user;

    // Valida que el id de aviso venga bien formado
    const errId = validarIdAviso(id_aviso);
    if (errId) return res.status(400).json({ message: errId });

    // Valida los campos a editar (acepta que vengan parciales)
    const errCampos = validarCamposEditar({ titulo, contenido, prioridad });
    if (errCampos) return res.status(400).json({ message: errCampos });

    // El service verifica que quien edita sea el autor del aviso
    const data = await avisoService.editarAviso({
      id_aviso,
      titulo:    titulo?.trim(),
      contenido: contenido?.trim(),
      prioridad,
      id_solicitante,
    });

    return res.status(200).json({ data });
  } catch (error) {
    return manejarError(res, error, "editarAviso");
  }
};

// DELETE /avisos/:id_aviso  (Admin libre / Supervisor solo los suyos) 

export const eliminarAviso = async (req, res) => {
  try {
    const { id_aviso } = req.params;
    const { id_trabajador: id_solicitante, tipo_usuario } = req.user;

    // Valida que el id de aviso venga bien formado
    const errId = validarIdAviso(id_aviso);
    if (errId) return res.status(400).json({ message: errId });

    // Admin puede eliminar cualquier aviso; supervisor solo los propios
    const errRol = validarAccesoEliminar(tipo_usuario);
    if (errRol) return res.status(403).json({ message: errRol });

    await avisoService.eliminarAviso({ id_aviso, id_solicitante, tipo_usuario });

    return res.status(200).json({ message: "Aviso eliminado correctamente" });
  } catch (error) {
    return manejarError(res, error, "eliminarAviso");
  }
};