// controllers/accidenteLaboral.controller.js

import { AppDataSource } from "../config/configDb.js";
import { AccidenteLaboralSchema } from "../entities/accidente_laboral.entity.js";
import { handleErrorServer, handleSuccess } from "../handlers/responseHandlers.js";

const repo = AppDataSource.getRepository(AccidenteLaboralSchema);


/**
 * getAllAccidentesLaborales
 *
 * Retorna una lista paginada de todos los accidentes laborales del sistema.
 *
 * Recibe (query):
 *   - page        {number}  [opcional, default: 1]   — número de página
 *   - limit       {number}  [opcional, default: 10]  — registros por página
 *   - id_proyecto {number}  [opcional]               — filtra accidentes cuya cuadrilla pertenezca al proyecto
 *   - rut         {string}  [opcional]               — filtra accidentes del trabajador con ese rut
 *
 * Recibe (headers):
 *   - Authorization: Bearer <token>  (procesado por authMiddleware → req.user)
 *
 * Retorna:
 *   {
 *     status: { total, page, limit, totalPages },
 *     data: [
 *       {
 *         id_accidente, id_trabajador, id_cuadrilla, nombre_cuadrilla,
 *         fecha_accidente, descripcion, gravedad, traslado, observaciones,
 *         proyecto: { id_proyecto, nombre_proyecto, id_supervisor, supervisor: { nombres, apellidos } },
 *         trabajador: { id_trabajador, rut, nombres, apellidos, sexo, telefono, correo, estado_laboral }
 *       },
 *       ...
 *     ]
 *   }
 */
export async function getAllAccidentesLaborales(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const { id_proyecto, rut } = req.query;

    const qb = repo
      .createQueryBuilder("accidente")
      .leftJoinAndSelect("accidente.trabajador", "trabajador")
      .leftJoinAndSelect("accidente.cuadrilla",  "cuadrilla")
      .leftJoinAndSelect("cuadrilla.proyecto",   "proyecto")
      .leftJoin("Trabajador", "supervisor", "supervisor.id_trabajador = proyecto.id_supervisor")
      .addSelect(["supervisor.nombres", "supervisor.apellidos"])
      .orderBy("accidente.fecha_accidente", "DESC");

    if (id_proyecto) {
      qb.andWhere("proyecto.id_proyecto = :id_proyecto", {
        id_proyecto: parseInt(id_proyecto),
      });
    }

    if (rut) {
      qb.andWhere("trabajador.rut = :rut", { rut: rut.trim() });
    }

    const total = await qb.getCount();
    const { raw, entities } = await qb.skip(skip).take(limit).getRawAndEntities();

    const data = entities.map((accidente, i) => ({
      id_accidente:    accidente.id_accidente,
      id_trabajador:   accidente.id_trabajador,
      id_cuadrilla:    accidente.id_cuadrilla,
      nombre_cuadrilla:  accidente.cuadrilla.nombre_cuadrilla,
      fecha_accidente: accidente.fecha_accidente,
      descripcion:     accidente.descripcion,
      gravedad:        accidente.gravedad,
      traslado:        accidente.traslado,
      observaciones:   accidente.observaciones ?? null,
      proyecto: {
        id_proyecto:     accidente.cuadrilla.proyecto.id_proyecto,
        nombre_proyecto: accidente.cuadrilla.proyecto.nombre_proyecto,
        id_supervisor:   accidente.cuadrilla.proyecto.id_supervisor,
        supervisor: {
          nombres:   raw[i].supervisor_nombres   ?? null,
          apellidos: raw[i].supervisor_apellidos ?? null,
        },
      },
      trabajador: {
        id_trabajador:  accidente.trabajador.id_trabajador,
        rut:            accidente.trabajador.rut,
        nombres:        accidente.trabajador.nombres,
        apellidos:      accidente.trabajador.apellidos,
        sexo:           accidente.trabajador.sexo,
        telefono:       accidente.trabajador.telefono,
        correo:         accidente.trabajador.correo,
        estado_laboral: accidente.trabajador.estado_laboral,
      },
    }));

    return handleSuccess(res, 200, "Accidentes laborales obtenidos correctamente.", {
      status: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    });

  } catch (error) {
    return handleErrorServer(res, 500, "Error al obtener los accidentes laborales.", error.message);
  }
}




/**
 * getAccidentesFromMyProyecto
 *
 * Retorna una lista paginada de los accidentes laborales del proyecto
 * al cual pertenece el supervisor autenticado.
 * La restricción de pertenencia se aplica vía:
 *   accidente → cuadrilla → proyecto WHERE proyecto.id_supervisor = req.user.id_trabajador
 *
 * Recibe (query):
 *   - page         {number}  [opcional, default: 1]
 *   - limit        {number}  [opcional, default: 10]
 *   - id_cuadrilla {number}  [opcional] — filtra por cuadrilla específica del proyecto
 *   - rut          {string}  [opcional] — filtra accidentes del trabajador con ese rut
 *
 * Recibe (headers):
 *   - Authorization: Bearer <token>  (procesado por authMiddleware → req.user)
 *
 * Retorna:
 *   {
 *     status: { total, page, limit, totalPages },
 *     data: [
 *       {
 *         id_accidente, id_trabajador, id_cuadrilla, id_cuadrilla,
 *         fecha_accidente, descripcion, gravedad, traslado, observaciones,
 *         proyecto: { id_proyecto, nombre_proyecto, id_supervisor, supervisor: { nombres, apellidos } },
 *         trabajador: { id_trabajador, rut, nombres, apellidos, sexo, telefono, correo, estado_laboral }
 *       },
 *       ...
 *     ]
 *   }
 */
export async function getAccidentesFromMyProyecto(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const { id_cuadrilla, rut } = req.query;
    const { id_trabajador: id_supervisor } = req.user;

    const qb = repo
      .createQueryBuilder("accidente")
      .leftJoinAndSelect("accidente.trabajador", "trabajador")
      .leftJoinAndSelect("accidente.cuadrilla",  "cuadrilla")
      .leftJoinAndSelect("cuadrilla.proyecto",   "proyecto")
      .leftJoin("Trabajador", "supervisor", "supervisor.id_trabajador = proyecto.id_supervisor")
      .addSelect(["supervisor.nombres", "supervisor.apellidos"])
      .where("proyecto.id_supervisor = :id_supervisor", { id_supervisor })
      .orderBy("accidente.fecha_accidente", "DESC");

    if (id_cuadrilla) {
      qb.andWhere("cuadrilla.id_cuadrilla = :id_cuadrilla", {
        id_cuadrilla: parseInt(id_cuadrilla),
      });
    }

    if (rut) {
      qb.andWhere("trabajador.rut = :rut", { rut: rut.trim() });
    }

    const total = await qb.getCount();
    const { raw, entities } = await qb.skip(skip).take(limit).getRawAndEntities();

    const data = entities.map((accidente, i) => ({
      id_accidente:    accidente.id_accidente,
      id_trabajador:   accidente.id_trabajador,
      id_cuadrilla:    accidente.id_cuadrilla,
      nombre_cuadrilla:  accidente.cuadrilla.nombre_cuadrilla,
      fecha_accidente: accidente.fecha_accidente,
      descripcion:     accidente.descripcion,
      gravedad:        accidente.gravedad,
      traslado:        accidente.traslado,
      observaciones:   accidente.observaciones ?? null,
      proyecto: {
        id_proyecto:     accidente.cuadrilla.proyecto.id_proyecto,
        nombre_proyecto: accidente.cuadrilla.proyecto.nombre_proyecto,
        id_supervisor:   accidente.cuadrilla.proyecto.id_supervisor,
        supervisor: {
          nombres:   raw[i].supervisor_nombres   ?? null,
          apellidos: raw[i].supervisor_apellidos ?? null,
        },
      },
      trabajador: {
        id_trabajador:  accidente.trabajador.id_trabajador,
        rut:            accidente.trabajador.rut,
        nombres:        accidente.trabajador.nombres,
        apellidos:      accidente.trabajador.apellidos,
        sexo:           accidente.trabajador.sexo,
        telefono:       accidente.trabajador.telefono,
        correo:         accidente.trabajador.correo,
        estado_laboral: accidente.trabajador.estado_laboral,
      },
    }));

    return handleSuccess(res, 200, "Accidentes laborales obtenidos correctamente.", {
      status: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    });

  } catch (error) {
    return handleErrorServer(res, 500, "Error al obtener los accidentes laborales.", error.message);
  }
}




/**
 * registrarAccidenteLaboral
 *
 * Registra un nuevo accidente laboral en el sistema.
 * Las validaciones de existencia y permisos ya fueron resueltas en el middleware,
 * que adjunta req.cuadrilla y req.proyecto al request.
 *
 * Recibe (body):
 *   {
 *     id_trabajador   {number}  — trabajador accidentado
 *     id_cuadrilla    {number}  — cuadrilla donde ocurrió el accidente
 *     fecha_accidente {string}  — fecha del accidente (formato fecha válido)
 *     descripcion     {string}  — descripción del accidente
 *     gravedad        {string}  — nivel de gravedad
 *     traslado        {string}  — tipo de traslado realizado
 *     observaciones   {string}  [opcional]
 *   }
 *
 * Recibe (headers):
 *   - Authorization: Bearer <token>  (procesado por authMiddleware → req.user)
 *
 * Retorna:
 *   {
 *     status: "Success",
 *     data: {
 *       id_accidente, id_trabajador, id_cuadrilla,
 *       fecha_accidente, descripcion, gravedad, traslado, observaciones
 *     }
 *   }
 */
export async function registrarAccidenteLaboral(req, res) {
  try {
    const {
      id_trabajador,
      id_cuadrilla,
      fecha_accidente,
      descripcion,
      gravedad,
      traslado,
      observaciones,
    } = req.body;


    const nuevoAccidente = repo.create({
      id_trabajador:   Number(id_trabajador),
      id_cuadrilla:    Number(id_cuadrilla),
      fecha_accidente,
      descripcion:     descripcion.trim(),
      gravedad:        gravedad.trim(),
      traslado:        traslado.trim(),
      observaciones:   observaciones ? observaciones.trim() : null,
    });

    const accidenteGuardado = await repo.save(nuevoAccidente);

    return handleSuccess(res, 201, "Accidente laboral registrado correctamente.", {
      data: {
        id_accidente:    accidenteGuardado.id_accidente,
        id_trabajador:   accidenteGuardado.id_trabajador,
        id_cuadrilla:    accidenteGuardado.id_cuadrilla,
        fecha_accidente: accidenteGuardado.fecha_accidente,
        descripcion:     accidenteGuardado.descripcion,
        gravedad:        accidenteGuardado.gravedad,
        traslado:        accidenteGuardado.traslado,
        observaciones:   accidenteGuardado.observaciones ?? null,
      },
    });

  } catch (error) {
    return handleErrorServer(res, 500, "Error al registrar el accidente laboral.", error.message);
  }
}




/**
 * editarAccidenteLaboral
 *
 * Actualiza parcialmente los datos de un accidente laboral existente.
 * Solo se actualizan los campos presentes en el body (PATCH semántico).
 * El accidente, cuadrilla y proyecto ya fueron resueltos y validados
 * en el middleware → disponibles en req.accidente, req.cuadrilla, req.proyecto.
 *
 * Recibe (params):
 *   - id_accidente_laboral {number} — id del accidente a editar
 *
 * Recibe (body):
 *   {
 *     descripcion   {string}  [opcional]
 *     gravedad      {string}  [opcional]
 *     traslado      {string}  [opcional]
 *     observaciones {string}  [opcional]
 *   }
 *
 * Recibe (headers):
 *   - Authorization: Bearer <token>  (procesado por authMiddleware → req.user)
 *
 * Retorna:
 *   {
 *     data: {
 *       id_accidente, id_trabajador, id_cuadrilla,
 *       fecha_accidente, descripcion, gravedad, traslado, observaciones
 *     }
 *   }
 */
export async function editarAccidenteLaboral(req, res) {
  try {
    const { descripcion, gravedad, traslado, observaciones } = req.body;
    const accidente = req.accidente;

    // Aplicar solo los campos presentes
    if (descripcion !== undefined) accidente.descripcion = descripcion.trim();
    if (gravedad    !== undefined) accidente.gravedad    = gravedad.trim();
    if (traslado    !== undefined) accidente.traslado    = traslado.trim();
    if (observaciones !== undefined) accidente.observaciones = observaciones.trim();

    const accidenteActualizado = await repo.save(accidente);

    return handleSuccess(res, 200, "Accidente laboral actualizado correctamente.", {
      data: {
        id_accidente:    accidenteActualizado.id_accidente,
        id_trabajador:   accidenteActualizado.id_trabajador,
        id_cuadrilla:    accidenteActualizado.id_cuadrilla,
        fecha_accidente: accidenteActualizado.fecha_accidente,
        descripcion:     accidenteActualizado.descripcion,
        gravedad:        accidenteActualizado.gravedad,
        traslado:        accidenteActualizado.traslado,
        observaciones:   accidenteActualizado.observaciones ?? null,
      },
    });

  } catch (error) {
    return handleErrorServer(res, 500, "Error al actualizar el accidente laboral.", error.message);
  }
}




/**
 * getMisAccidentes
 *
 * Retorna una lista paginada de los accidentes laborales del trabajador autenticado.
 * El filtro de identidad se aplica directamente desde el token:
 *   WHERE accidente.id_trabajador = req.user.id_trabajador
 *
 * Recibe (query):
 *   - page  {number}  [opcional, default: 1]
 *   - limit {number}  [opcional, default: 10]
 *
 * Recibe (headers):
 *   - Authorization: Bearer <token>  (procesado por authMiddleware → req.user)
 *
 * Retorna:
 *   {
 *     status: { total, page, limit, totalPages },
 *     data: [
 *       {
 *         id_accidente, id_trabajador, id_cuadrilla, nombre_cuadrilla,
 *         fecha_accidente, descripcion, gravedad, traslado, observaciones,
 *         proyecto: { id_proyecto, nombre_proyecto, id_supervisor, supervisor: { nombres, apellidos } },
 *         trabajador: { id_trabajador, rut, nombres, apellidos, sexo, telefono, correo, estado_laboral }
 *       },
 *       ...
 *     ]
 *   }
 */
export async function getMisAccidentes(req, res) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const { id_trabajador } = req.user;

    const qb = repo
      .createQueryBuilder("accidente")
      .leftJoinAndSelect("accidente.trabajador", "trabajador")
      .leftJoinAndSelect("accidente.cuadrilla",  "cuadrilla")
      .leftJoinAndSelect("cuadrilla.proyecto",   "proyecto")
      .leftJoin("Trabajador", "supervisor", "supervisor.id_trabajador = proyecto.id_supervisor")
      .addSelect(["supervisor.nombres", "supervisor.apellidos"])
      .where("accidente.id_trabajador = :id_trabajador", { id_trabajador })
      .orderBy("accidente.fecha_accidente", "DESC");

    const total = await qb.getCount();
    const { raw, entities } = await qb.skip(skip).take(limit).getRawAndEntities();

    const data = entities.map((accidente, i) => ({
      id_accidente:    accidente.id_accidente,
      id_trabajador:   accidente.id_trabajador,
      id_cuadrilla:    accidente.id_cuadrilla,
      nombre_cuadrilla:  accidente.cuadrilla.nombre_cuadrilla,
      fecha_accidente: accidente.fecha_accidente,
      descripcion:     accidente.descripcion,
      gravedad:        accidente.gravedad,
      traslado:        accidente.traslado,
      observaciones:   accidente.observaciones ?? null,
      proyecto: {
        id_proyecto:     accidente.cuadrilla.proyecto.id_proyecto,
        nombre_proyecto: accidente.cuadrilla.proyecto.nombre_proyecto,
        id_supervisor:   accidente.cuadrilla.proyecto.id_supervisor,
        supervisor: {
          nombres:   raw[i].supervisor_nombres   ?? null,
          apellidos: raw[i].supervisor_apellidos ?? null,
        },
      },
      trabajador: {
        id_trabajador:  accidente.trabajador.id_trabajador,
        rut:            accidente.trabajador.rut,
        nombres:        accidente.trabajador.nombres,
        apellidos:      accidente.trabajador.apellidos,
        sexo:           accidente.trabajador.sexo,
        telefono:       accidente.trabajador.telefono,
        correo:         accidente.trabajador.correo,
        estado_laboral: accidente.trabajador.estado_laboral,
      },
    }));

    return handleSuccess(res, 200, "Accidentes laborales obtenidos correctamente.", {
      status: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    });

  } catch (error) {
    return handleErrorServer(res, 500, "Error al obtener los accidentes laborales.", error.message);
  }
}