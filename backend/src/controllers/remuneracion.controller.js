"use strict";

import { AppDataSource } from "../config/configDb.js";
import { RemuneracionSchema } from "../entities/remuneracion.entity.js";
import { TrabajadorSchema } from "../entities/trabajador.entity.js";
import { crearNotificacion } from "../services/notificacion.service.js";
import { handleSuccess, handleErrorServer, handleErrorClient } from "../handlers/responseHandlers.js";
import { ContratoTrabajadorSchema } from "../entities/contrato_trabajador.entity.js";

const remuneracionRepo = AppDataSource.getRepository(RemuneracionSchema);
const trabajadorRepo = AppDataSource.getRepository(TrabajadorSchema);

export const getRemuneraciones = async (req, res) => {
  try {
    const remuneraciones = await remuneracionRepo.find({ relations: ["trabajador"] });

    if (remuneraciones.length === 0) {
      return res.status(404).json({ message: "No se encontraron remuneraciones" });
    }

    res.status(200).json(remuneraciones);
  } catch (error) {
    console.error("Error al obtener remuneraciones:", error);
    res.status(500).json({ message: "Error interno al obtener remuneraciones" });
  }
};

/* Obtiene la remuneración del propio usuario autenticado (Supervisor / Trabajador) */
/* No recibe rut ni id por parámetro: usa el id_trabajador del token JWT */
export const getMiRemuneracion = async (req, res) => {
  try {
    const { id_trabajador } = req.user;

    const remuneracion = await remuneracionRepo
      .createQueryBuilder("remuneracion")
      .leftJoinAndSelect("remuneracion.trabajador", "trabajador")
      .where("trabajador.id_trabajador = :id_trabajador", { id_trabajador })
      .getOne();

    if (!remuneracion) {
      return res.status(404).json({
        message: "Aún no tienes una remuneración registrada",
      });
    }

    return res.status(200).json(remuneracion);

  } catch (error) {
    console.error("Error al obtener mi remuneración:", error);

    return res.status(500).json({
      message: "Error interno al obtener tu remuneración",
    });
  }
};




























/**
 * GET /remuneraciones/
 *
 * Retorna lista paginada de trabajadores con sus contratos anidados,
 * y cada contrato con sus remuneraciones y anexos.
 *
 * Recibe (query params, todos opcionales):
 *   page                            {number}   Página (default: 1)
 *   limit                           {number}   Registros por página (default: 10)
 *   filter_contratos_sin_remuneracion {boolean} Si es true, retorna solo trabajadores con al
 *                                              menos un contrato Activo sin remuneraciones.
 *                                              Si está activo, ignora todos los demás filtros.
 *   rut                             {string}   Rut exacto del trabajador
 *   estado_pago                     {string}   'pendiente' | 'pagado' | 'atrasado'
 *                                              Retorna trabajadores con al menos una remuneración
 *                                              con ese estado_pago
 *   tipo_contrato                   {string}   'Indefinido' | 'Plazo Fijo'
 *   estado_contrato                 {string}   'Activo' | 'Inactivo' | 'Por vencer'
 *                                              Si tipo_contrato y estado_contrato se combinan,
 *                                              el trabajador debe tener al menos un contrato
 *                                              que cumpla ambas condiciones simultáneamente.
 *
 * Retorna:
 *   {
 *     data: Trabajador[],  // contratos → { remuneraciones[], anexos[] }
 *     meta: { total, page, limit, totalPages }
 *   }
 */
export async function getRemuneracionesAndContratos(req, res) {
  try {
    const {
      page:            pageParam  = "1",
      limit:           limitParam = "10",
      rut,
      estado_pago,
      tipo_contrato,
      estado_contrato,
    } = req.query;

    // Si el filtro trabajadores con contratos sin remuneracion esta activo
    const sinRemuneracion = req.query.filter_contratos_sin_remuneracion === "true";

    const page  = Number(pageParam);
    const limit = Number(limitParam);

    const repo = AppDataSource.getRepository(TrabajadorSchema);

    // ─── Query 1: filtrado, conteo y paginación sobre trabajadores ───────────
    // Se usan EXISTS independientes para que cada filtro opere sobre
    // "al menos un" registro que lo cumpla, sin cruzar condiciones entre sí.

    const qb = repo.createQueryBuilder("t");




    if (sinRemuneracion) {
      // Ignora todos los demás filtros.
      // Trabajadores con al menos un contrato Activo que no tenga ninguna remuneracion.
      qb.andWhere(sq =>
        "EXISTS " +
        sq.subQuery()
          .select("1")
          .from("contratos_trabajadores", "ct")
          .where("ct.id_trabajador = t.id_trabajador")
          .andWhere("ct.estado_contrato IN ('Activo', 'Por vencer')")
          .andWhere(sq2 =>
            "NOT EXISTS " +
            sq2.subQuery()
              .select("1")
              .from("remuneracion", "r")
              .where("r.id_contrato = ct.id_contrato")
              .getQuery()
          )
          .getQuery()
      );
    } else {
      if (rut) {
        qb.andWhere("t.rut = :rut", { rut });
      }

      if (estado_pago) {
        qb.andWhere(sq =>
          "EXISTS " +
          sq.subQuery()
            .select("1")
            .from("remuneracion", "r")
            .where("r.id_trabajador = t.id_trabajador")
            .andWhere("r.estado_pago = :ep")
            .getQuery()
        ).setParameter("ep", estado_pago);
      }

      if (tipo_contrato || estado_contrato) {
        qb.andWhere(sq => {
          const sub = sq.subQuery()
            .select("1")
            .from("contratos_trabajadores", "ct")
            .where("ct.id_trabajador = t.id_trabajador");

          if (tipo_contrato) {
            sub.andWhere("ct.tipo_contrato = :tc");
          }
          if (estado_contrato) {
            sub.andWhere("ct.estado_contrato = :ec");
          }

          return "EXISTS " + sub.getQuery();
        });

        if (tipo_contrato)   qb.setParameter("tc", tipo_contrato);
        if (estado_contrato) qb.setParameter("ec", estado_contrato);
      }
    }






    // getCount() antes de mutar el QB con select/skip/take
    const total      = await qb.getCount();
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return handleSuccess(res, 200, "Lista de remuneraciones obtenida.", {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      });
    }

    const trabajadoresFiltrados = await qb
      .select("t.id_trabajador")
      .orderBy("t.id_trabajador", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const ids = trabajadoresFiltrados.map(t => t.id_trabajador);

    // ─── Query 2: carga completa con relaciones para los IDs paginados ───────
    // hashed_pass se excluye explícitamente del select de trabajador.
    const trabajadores = await repo
      .createQueryBuilder("t")
      .select([
        "t.id_trabajador",
        "t.tipo_usuario",
        "t.rut",
        "t.nombres",
        "t.apellidos",
        "t.sexo",
        "t.telefono",
        "t.correo",
        "t.direccion",
        "t.fecha_nacimiento",
        "t.fecha_ingreso",
        "t.estado_laboral",
        "t.experiencia_previa",
      ])
      .leftJoinAndSelect("t.contratos", "c")
      .leftJoinAndSelect("c.remuneraciones", "r")
      .leftJoinAndSelect("c.anexos", "a")
      .where("t.id_trabajador IN (:...ids)", { ids })
      .orderBy("t.id_trabajador", "ASC")
      .getMany();

    return handleSuccess(res, 200, "Lista de remuneraciones obtenida.", {
      data: trabajadores,
      meta: { total, page, limit, totalPages },
    });
  } catch (error) {
    return handleErrorServer(res, 500, "Error al obtener las remuneraciones.", error.message);
  }
}


/**
 *
 * Crea una nueva remuneracion para un trabajador.
 * bono y descuento se inicializan en 0, estado_pago en "pendiente" (defaults de entidad).
 *
 * Recibe (body):
 *   id_trabajador {number}  ID del trabajador
 *   id_contrato   {number}  ID del contrato asociado
 *   fecha_pago    {string}  Fecha en formato YYYY-MM-DD, no anterior a hoy
 *   sueldo        {number}  Debe coincidir exactamente con el monto del contrato
 *
 * Retorna:
 *   { data: Remuneracion }
 */
export async function crearRemuneracion(req, res) {
  try {
    const { id_trabajador, id_contrato, fecha_pago, sueldo } = req.body;

    const contratoRepo     = AppDataSource.getRepository(ContratoTrabajadorSchema);
    const remuneracionRepo = AppDataSource.getRepository(RemuneracionSchema);

    // 1. Verificar que el contrato existe y pertenece al trabajador
    const contrato = await contratoRepo.findOne({
      where: {
        id_contrato:   Number(id_contrato),
        id_trabajador: Number(id_trabajador),
      },
    });

    if (!contrato) {
      return handleErrorClient(res, 404, "No se encontró un contrato con ese id asociado al trabajador.");
    }

    // 2. El contrato debe estar Activo o Por vencer
    if (contrato.estado_contrato !== "Activo" && contrato.estado_contrato !== "Por vencer") {
      return handleErrorClient(res, 400, "El contrato no está activo. Solo se pueden crear remuneraciones para contratos activos o por vencer.");
    }

    // 3. El sueldo debe coincidir con el monto del contrato
    if (Number(sueldo) !== contrato.monto) {
      return handleErrorClient(
        res, 400,
        `El sueldo ingresado (${sueldo}) no coincide con el monto del contrato (${contrato.monto}).`
      );
    }

    // 4. Crear la remuneracion (bono, descuento y estado_pago usan defaults de la entidad)
    const nuevaRemuneracion = remuneracionRepo.create({
      id_trabajador: Number(id_trabajador),
      id_contrato:   Number(id_contrato),
      fecha_pago,
      sueldo:        Number(sueldo),
    });

    const remuneracionGuardada = await remuneracionRepo.save(nuevaRemuneracion);

    return handleSuccess(res, 201, "Remuneración creada exitosamente.", { data: remuneracionGuardada });
  } catch (error) {
    return handleErrorServer(res, 500, "Error al crear la remuneración.", error.message);
  }
}





















// controllers/remuneracion.controller.js (agregar)

/**
 * PATCH /remuneraciones/:id_remuneracion
 *
 * Actualiza parcialmente una remuneración existente.
 * Los campos bono, descuento y estado_pago son independientes entre sí:
 * se actualiza solo lo que se envíe en el body.
 *
 * Recibe:
 *   params: id_remuneracion {number}
 *   body (al menos uno):
 *     bono        {number}  Entero no negativo
 *     descuento   {number}  Entero no negativo
 *     estado_pago {string}  'pendiente' | 'pagado' | 'atrasado'
 *
 * Retorna:
 *   { data: Remuneracion }  Registro actualizado
 */
export async function actualizarRemuneracion(req, res) {
  try {
    const { id_remuneracion } = req.params;
    const { bono, descuento, estado_pago } = req.body;

    const repo = AppDataSource.getRepository(RemuneracionSchema);

    const remuneracion = await repo.findOne({
      where: { id_remuneracion: Number(id_remuneracion) },
    });

    if (!remuneracion) {
      return handleErrorClient(res, 404, "No se encontró la remuneración indicada.");
    }

    // Aplicar solo los campos enviados
    if (bono !== undefined)       remuneracion.bono        = Number(bono);
    if (descuento !== undefined)  remuneracion.descuento   = Number(descuento);
    if (estado_pago !== undefined) remuneracion.estado_pago = estado_pago;

    const remuneracionActualizada = await repo.save(remuneracion);

    return handleSuccess(res, 200, "Remuneración actualizada exitosamente.", { data: remuneracionActualizada });
  } catch (error) {
    return handleErrorServer(res, 500, "Error al actualizar la remuneración.", error.message);
  }
}















// controllers/remuneracion.controller.js

/**
 * DELETE /remuneraciones/:id_remuneracion
 *
 * Elimina físicamente una remuneración existente.
 *
 * Recibe:
 *   params: id_remuneracion {number}
 *
 * Retorna:
 *   { message: string }
 */
export async function eliminarRemuneracion(req, res) {
  try {
    const { id_remuneracion } = req.params;

    const repo = AppDataSource.getRepository(RemuneracionSchema);

    const remuneracion = await repo.findOne({
      where: { id_remuneracion: Number(id_remuneracion) },
    });

    if (!remuneracion) {
      return handleErrorClient(res, 404, "No se encontró la remuneración indicada.");
    }

    await repo.remove(remuneracion);

    return handleSuccess(res, 200, "Remuneración eliminada exitosamente.");
  } catch (error) {
    return handleErrorServer(res, 500, "Error al eliminar la remuneración.", error.message);
  }
}