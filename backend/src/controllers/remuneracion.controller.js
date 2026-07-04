"use strict";

import { AppDataSource } from "../config/configDb.js";
import { RemuneracionSchema } from "../entities/remuneracion.entity.js";
import { TrabajadorSchema } from "../entities/trabajador.entity.js";

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

export const crearRemuneracion = async (req, res) => {
  try {
    const {
      fecha_pago,
      sueldo,
      bono,
      descuento,
      estado_pago,
      rut,
    } = req.body;

    // Validación de campos obligatorios
    if (
      !fecha_pago ||
      sueldo === undefined ||
      bono === undefined ||
      descuento === undefined ||
      !estado_pago ||
      !rut
    ) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios, incluyendo rut",
      });
    }

    // Verificar que el trabajador existe mediante rut
    const trabajador = await trabajadorRepo.findOneBy({ rut });

    if (!trabajador) {
      return res.status(404).json({
        message: "Trabajador no encontrado",
      });
    }

    // Verificar que no tenga remuneración ya asignada
    const remuneracionExistente = await remuneracionRepo.findOne({
      where: {
        trabajador: {
          id_trabajador: trabajador.id_trabajador,
        },
      },
      relations: ["trabajador"],
    });

    if (remuneracionExistente) {
      return res.status(409).json({
        message: "El trabajador ya posee una remuneración asignada",
      });
    }

    // Crear remuneración
    const nuevaRemuneracion = remuneracionRepo.create({
      fecha_pago,
      sueldo,
      bono,
      descuento,
      estado_pago,
      trabajador,
    });

    await remuneracionRepo.save(nuevaRemuneracion);

    return res.status(201).json(nuevaRemuneracion);

  } catch (error) {
    console.error("Error al crear remuneración:", error);

    return res.status(500).json({
      message: "Error interno al crear la remuneración",
    });
  }
};

export const actualizarRemuneracion = async (req, res) => {
  try {
    const { id } = req.params;

    const remuneracion = await remuneracionRepo.findOne({
      where: { id_remuneracion: parseInt(id) },
      relations: ["trabajador"],
    });

    if (!remuneracion) {
      return res.status(404).json({ message: "Remuneración no encontrada" });
    }

    const {
      fecha_pago,
      sueldo,
      bono,
      descuento,
      estado_pago,
    } = req.body;

    // Solo actualiza los campos que vienen en el body
    if (fecha_pago) remuneracion.fecha_pago = fecha_pago;
    if (sueldo !== undefined) remuneracion.sueldo = sueldo;
    if (bono !== undefined) remuneracion.bono = bono;
    if (descuento !== undefined) remuneracion.descuento = descuento;
    if (estado_pago) remuneracion.estado_pago = estado_pago;

    await remuneracionRepo.save(remuneracion);

    res.status(200).json(remuneracion);
  } catch (error) {
    console.error("Error al actualizar remuneración:", error);
    res.status(500).json({ message: "Error interno al actualizar la remuneración" });
  }
};

export const eliminarRemuneracion = async (req, res) => {
  try {
    const { id } = req.params;

    const remuneracion = await remuneracionRepo.findOneBy({ id_remuneracion: parseInt(id) });

    if (!remuneracion) {
      return res.status(404).json({ message: "Remuneración no encontrada" });
    }

    await remuneracionRepo.remove(remuneracion);

    res.status(200).json({ message: "Remuneración eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar remuneración:", error);
    res.status(500).json({ message: "Error interno al eliminar la remuneración" });
  }
};

/* Obtiene remuneraciones de los trabajadores de forma paginada */
export const getRemuneracionesPaginadas = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Validaciones
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    // Calcular offset automáticamente
    const offset = (page - 1) * limit;

    const [remuneraciones, total] = await remuneracionRepo
      .createQueryBuilder("remuneracion")
      .leftJoinAndSelect("remuneracion.trabajador", "trabajador")
      .orderBy("trabajador.apellidos", "ASC")
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return res.status(200).json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: remuneraciones,
    });

  } catch (error) {
    console.error("Error al obtener remuneraciones paginadas:", error);

    return res.status(500).json({
      message: "Error interno al obtener remuneraciones",
    });
  }
};

/* Obtiene la remuneracion de un trabajador */
/* Recibe JSON Body, solo rut */
export const getRemuneracion = async (req, res) => {
  try {
    const { rut } = req.body;

    if (!rut) {
      return res.status(400).json({
        message: "El rut es obligatorio",
      });
    }

    const remuneracion = await remuneracionRepo
      .createQueryBuilder("remuneracion")
      .leftJoinAndSelect("remuneracion.trabajador", "trabajador")
      .where("trabajador.rut = :rut", { rut })
      .getOne();

    if (!remuneracion) {
      return res.status(404).json({
        message: "No se encontró una remuneración para el trabajador",
      });
    }

    return res.status(200).json(remuneracion);

  } catch (error) {
    console.error("Error al obtener remuneración:", error);

    return res.status(500).json({
      message: "Error interno al obtener la remuneración",
    });
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