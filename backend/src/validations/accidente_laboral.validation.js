// middlewares/accidenteLaboral.validation.js

import { handleErrorClient } from "../handlers/responseHandlers.js";
import { AppDataSource } from "../config/configDb.js";
import { CuadrillaSchema } from "../entities/cuadrilla.entity.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";
import { TrabajadorSchema } from "../entities/trabajador.entity.js";
import { AccidenteLaboralSchema } from "../entities/accidente_laboral.entity.js";


const trabajadorRepo = AppDataSource.getRepository(TrabajadorSchema);
const cuadrillaRepo = AppDataSource.getRepository(CuadrillaSchema);
const proyectoRepo = AppDataSource.getRepository(ProyectoSchema);
const accidenteRepo = AppDataSource.getRepository(AccidenteLaboralSchema);


/**
 * validarGetAllAccidentesLaborales
 * Middleware de validación para GET
 *
 * Recibe (query): page?, limit?, id_proyecto?, rut?
 * Valida:
 *   - req.user.tipo_usuario === "administrador"
 *   - page y limit: enteros positivos (opcionales)
 *   - id_proyecto: entero positivo (opcional)
 *   - rut: string no vacío (opcional)
 */
export function validarGetAllAccidentesLaborales(req, res, next) {
  const { tipo_usuario } = req.user;

  if (tipo_usuario !== "administrador") {
    return handleErrorClient(res, 403, "Acceso denegado. Se requiere rol de administrador.");
  }

  const { page, limit, id_proyecto, rut } = req.query;

  if (page !== undefined) {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return handleErrorClient(res, 400, "El parámetro 'page' debe ser un entero positivo.");
    }
  }

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      return handleErrorClient(res, 400, "El parámetro 'limit' debe ser un entero positivo.");
    }
  }

  if (id_proyecto !== undefined) {
    const parsedProyecto = Number(id_proyecto);
    if (!Number.isInteger(parsedProyecto) || parsedProyecto < 1) {
      return handleErrorClient(res, 400, "El parámetro 'id_proyecto' debe ser un entero positivo.");
    }
  }

  if (rut !== undefined && (typeof rut !== "string" || rut.trim() === "")) {
    return handleErrorClient(res, 400, "El parámetro 'rut' no puede estar vacío.");
  }

  next();
}








/**
 * validarGetAccidentesFromMyProyecto
 * Middleware de validación para GET /supervisor/accidentes-laborales
 *
 * Recibe (query): page?, limit?, id_cuadrilla?, rut?
 * Valida:
 *   - req.user.tipo_usuario === "supervisor"
 *   - page y limit: enteros positivos (opcionales)
 *   - id_cuadrilla: entero positivo (opcional)
 *   - rut: string no vacío (opcional)
 *
 *  pd: la restriccion de que las cudrillas pertenescan al proyecto del supervisor, se aplica directamente en el controlador via WHERE, donde proyecto.id_supervisor = req.user.id_trabajador
 */
export function validarGetAccidentesFromMyProyecto(req, res, next) {
  const { tipo_usuario } = req.user;

  if (tipo_usuario !== "supervisor") {
    return handleErrorClient(res, 403, "Acceso denegado. Se requiere rol de supervisor.");
  }

  const { page, limit, id_cuadrilla, rut } = req.query;

  if (page !== undefined) {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return handleErrorClient(res, 400, "El parámetro 'page' debe ser un entero positivo.");
    }
  }

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      return handleErrorClient(res, 400, "El parámetro 'limit' debe ser un entero positivo.");
    }
  }

  if (id_cuadrilla !== undefined) {
    const parsedCuadrilla = Number(id_cuadrilla);
    if (!Number.isInteger(parsedCuadrilla) || parsedCuadrilla < 1) {
      return handleErrorClient(res, 400, "El parámetro 'id_cuadrilla' debe ser un entero positivo.");
    }
  }

  if (rut !== undefined && (typeof rut !== "string" || rut.trim() === "")) {
    return handleErrorClient(res, 400, "El parámetro 'rut' no puede estar vacío.");
  }

  next();
}


/**
 * validarRegistrarAccidenteLaboral
 * Middleware de validación para POST /supervisor/accidentes-laborales
 *
 * Recibe (body): { id_trabajador, id_cuadrilla, fecha_accidente, descripcion, gravedad, traslado, observaciones? }
 * Valida:
 *   1. req.user.tipo_usuario === "supervisor"
 *   2. Presencia y formato de campos obligatorios del body
 *   3. Existencia del trabajador accidentado (id_trabajador)
 *   4. Existencia de la cuadrilla (id_cuadrilla) y su proyecto asociado
 *   5. cuadrilla.estado === "activa"
 *   6. proyecto.estado === "activo"
 *   7. proyecto.id_supervisor === req.user.id_trabajador
 *
 * Adjunta al request:
 *   - req.cuadrilla  → entidad Cuadrilla resuelta
 *   - req.proyecto   → entidad Proyecto resuelta
 */
export async function validarRegistrarAccidenteLaboral(req, res, next) {
  try {
    // Validación 1: rol
    if (req.user.tipo_usuario !== "supervisor") {
      return handleErrorClient(res, 403, "Acceso denegado. Se requiere rol de supervisor.");
    }

    const { id_trabajador, id_cuadrilla, fecha_accidente, descripcion, gravedad, traslado, observaciones } = req.body;

    // Validación de presencia y formato de campos obligatorios
    if (!id_trabajador || !Number.isInteger(Number(id_trabajador)) || Number(id_trabajador) < 1) {
      return handleErrorClient(res, 400, "El campo 'id_trabajador' es obligatorio y debe ser un entero positivo.");
    }

    if (!id_cuadrilla || !Number.isInteger(Number(id_cuadrilla)) || Number(id_cuadrilla) < 1) {
      return handleErrorClient(res, 400, "El campo 'id_cuadrilla' es obligatorio y debe ser un entero positivo.");
    }

    if (!fecha_accidente || isNaN(Date.parse(fecha_accidente))) {
      return handleErrorClient(res, 400, "El campo 'fecha_accidente' es obligatorio y debe ser una fecha válida.");
    }

    if (!descripcion || typeof descripcion !== "string" || descripcion.trim() === "") {
      return handleErrorClient(res, 400, "El campo 'descripcion' es obligatorio y no puede estar vacío.");
    }

    if (!gravedad || typeof gravedad !== "string" || gravedad.trim() === "") {
      return handleErrorClient(res, 400, "El campo 'gravedad' es obligatorio y no puede estar vacío.");
    }

    if (!traslado || typeof traslado !== "string" || traslado.trim() === "") {
      return handleErrorClient(res, 400, "El campo 'traslado' es obligatorio y no puede estar vacío.");
    }

    if (observaciones !== undefined && (typeof observaciones !== "string" || observaciones.trim() === "")) {
      return handleErrorClient(res, 400, "El campo 'observaciones' debe ser un string no vacío si se proporciona.");
    }

    // Verificar existencia del trabajador accidentado
    const trabajador = await trabajadorRepo.findOne({
      where: { id_trabajador: Number(id_trabajador) },
    });

    if (!trabajador) {
      return handleErrorClient(res, 404, "No se encontró el trabajador con el id proporcionado.");
    }

    // Verificar existencia de la cuadrilla y cargar su proyecto
    const cuadrilla = await cuadrillaRepo.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
    });

    if (!cuadrilla) {
      return handleErrorClient(res, 404, "No se encontró la cuadrilla con el id proporcionado.");
    }

    // Validación 3: cuadrilla activa
    if (cuadrilla.estado !== "activa") {
      return handleErrorClient(res, 400, "La cuadrilla especificada no se encuentra activa.");
    }

    // Cargar el proyecto de la cuadrilla
    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: cuadrilla.id_proyecto },
    });

    if (!proyecto) {
      return handleErrorClient(res, 404, "No se encontró el proyecto asociado a la cuadrilla.");
    }

    // Validación 4: proyecto activo
    if (proyecto.estado !== "activo") {
      return handleErrorClient(res, 400, "El proyecto asociado a la cuadrilla no se encuentra activo.");
    }

    // Validación 2: el supervisor que consulta debe ser el supervisor del proyecto
    if (proyecto.id_supervisor !== req.user.id_trabajador) {
      return handleErrorClient(res, 403, "No tienes permisos para registrar accidentes en este proyecto.");
    }

    // Adjuntar entidades resueltas para el controlador
    req.cuadrilla = cuadrilla;
    req.proyecto  = proyecto;

    next();
  } catch (error) {
    return handleErrorServer(res, 500, "Error en la validación del accidente laboral.", error.message);
  }
}


/**
 * validarEditarAccidenteLaboral
 * Middleware de validación para PATCH /supervisor/:id_accidente_laboral
 *
 * Recibe (params): id_accidente_laboral
 * Recibe (body):   { descripcion?, gravedad?, traslado?, observaciones? }
 *                  Al menos uno de los campos editables debe estar presente.
 * Valida:
 *   1. req.user.tipo_usuario === "supervisor"
 *   2. id_accidente_laboral: entero positivo
 *   3. Al menos un campo editable presente y con formato válido
 *   4. Existencia del accidente laboral
 *   5. Existencia de la cuadrilla asociada al accidente
 *   6. cuadrilla.estado === "activa"
 *   7. Existencia del proyecto asociado a la cuadrilla
 *   8. proyecto.estado === "activo"
 *   9. proyecto.id_supervisor === req.user.id_trabajador
 *
 * Adjunta al request:
 *   - req.accidente  → entidad AccidenteLaboral resuelta
 *   - req.cuadrilla  → entidad Cuadrilla resuelta
 *   - req.proyecto   → entidad Proyecto resuelta
 */
export async function validarEditarAccidenteLaboral(req, res, next) {
  try {
    // Validación 1: rol
    if (req.user.tipo_usuario !== "supervisor") {
      return handleErrorClient(res, 403, "Acceso denegado. Se requiere rol de supervisor.");
    }

    // Validación de param
    const id_accidente_laboral = Number(req.params.id_accidente_laboral);
    if (!Number.isInteger(id_accidente_laboral) || id_accidente_laboral < 1) {
      return handleErrorClient(res, 400, "El parámetro 'id_accidente_laboral' debe ser un entero positivo.");
    }

    const { descripcion, gravedad, traslado, observaciones } = req.body;

    // Al menos un campo editable debe venir en el body
    if (descripcion === undefined && gravedad === undefined && traslado === undefined && observaciones === undefined) {
      return handleErrorClient(res, 400, "Debe proporcionar al menos un campo para actualizar: descripcion, gravedad, traslado u observaciones.");
    }

    // Validación de formato de campos presentes
    if (descripcion !== undefined && (typeof descripcion !== "string" || descripcion.trim() === "")) {
      return handleErrorClient(res, 400, "El campo 'descripcion' no puede estar vacío.");
    }

    if (gravedad !== undefined && (typeof gravedad !== "string" || gravedad.trim() === "")) {
      return handleErrorClient(res, 400, "El campo 'gravedad' no puede estar vacío.");
    }

    if (traslado !== undefined && (typeof traslado !== "string" || traslado.trim() === "")) {
      return handleErrorClient(res, 400, "El campo 'traslado' no puede estar vacío.");
    }

    if (observaciones !== undefined && (typeof observaciones !== "string" || observaciones.trim() === "")) {
      return handleErrorClient(res, 400, "El campo 'observaciones' no puede estar vacío si se proporciona.");
    }

    // Verificar existencia del accidente
    const accidente = await accidenteRepo.findOne({
      where: { id_accidente: id_accidente_laboral },
    });

    if (!accidente) {
      return handleErrorClient(res, 404, "No se encontró el accidente laboral con el id proporcionado.");
    }

    // Verificar existencia de la cuadrilla
    const cuadrilla = await cuadrillaRepo.findOne({
      where: { id_cuadrilla: accidente.id_cuadrilla },
    });

    if (!cuadrilla) {
      return handleErrorClient(res, 404, "No se encontró la cuadrilla asociada al accidente.");
    }

    // Validación 3: cuadrilla activa
    if (cuadrilla.estado !== "activa") {
      return handleErrorClient(res, 400, "La cuadrilla asociada al accidente no se encuentra activa.");
    }

    // Verificar existencia del proyecto
    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: cuadrilla.id_proyecto },
    });

    if (!proyecto) {
      return handleErrorClient(res, 404, "No se encontró el proyecto asociado a la cuadrilla del accidente.");
    }

    // Validación 4: proyecto activo
    if (proyecto.estado !== "activo") {
      return handleErrorClient(res, 400, "El proyecto asociado al accidente no se encuentra activo.");
    }

    // Validación 2: supervisor del proyecto
    if (proyecto.id_supervisor !== req.user.id_trabajador) {
      return handleErrorClient(res, 403, "No tienes permisos para editar accidentes de este proyecto.");
    }

    // Adjuntar entidades resueltas
    req.accidente = accidente;
    req.cuadrilla = cuadrilla;
    req.proyecto  = proyecto;

    next();
  } catch (error) {
    return handleErrorServer(res, 500, "Error en la validación de edición del accidente laboral.", error.message);
  }
}