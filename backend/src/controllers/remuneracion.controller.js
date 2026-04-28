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
      id_trabajador,
    } = req.body;

    if (
      !fecha_pago ||
      sueldo === undefined ||
      bono === undefined ||
      descuento === undefined ||
      !estado_pago ||
      !id_trabajador
    ) {
      return res.status(400).json({ message: "Todos los campos son obligatorios, incluyendo id_trabajador" });
    }

    // Verificar que el trabajador existe
    const trabajador = await trabajadorRepo.findOneBy({ id_trabajador: parseInt(id_trabajador) });

    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // Verificar que el trabajador no tenga ya una remuneracion asignada
    const remuneracionExistente = await remuneracionRepo.findOne({
      where: { trabajador: { id_trabajador: parseInt(id_trabajador) } },
      relations: ["trabajador"],
    });

    if (remuneracionExistente) {
      return res.status(409).json({
        message: "El trabajador ya posee una remuneración asignada",
      });
    }

    const nuevaRemuneracion = remuneracionRepo.create({
      fecha_pago,
      sueldo,
      bono,
      descuento,
      estado_pago,
      trabajador,
    });

    await remuneracionRepo.save(nuevaRemuneracion);

    res.status(201).json(nuevaRemuneracion);
  } catch (error) {
    console.error("Error al crear remuneración:", error);
    res.status(500).json({ message: "Error interno al crear la remuneración" });
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