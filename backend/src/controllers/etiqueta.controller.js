"use strict";

import { AppDataSource } from "../config/configDb.js";
import { EtiquetaSchema } from "../entities/etiqueta.entity.js";

const etiquetaRepo = AppDataSource.getRepository(EtiquetaSchema);

// GET /api/etiquetas
// Cualquier usuario autenticado puede ver las etiquetas (para mostrar a qué cuadrilla pertenece alguien)
export const getEtiquetas = async (req, res) => {
  try {
    const etiquetas = await etiquetaRepo.find({
      relations: ["trabajadores"],
    });

    if (etiquetas.length === 0) {
      return res.status(404).json({ message: "No se encontraron etiquetas" });
    }

    res.status(200).json(etiquetas);
  } catch (error) {
    console.error("Error al obtener etiquetas:", error);
    res.status(500).json({ message: "Error interno al obtener etiquetas" });
  }
};

// GET /api/etiquetas/:id
export const getEtiquetaById = async (req, res) => {
  try {
    const { id } = req.params;

    const etiqueta = await etiquetaRepo.findOne({
      where: { id_etiqueta: parseInt(id) },
      relations: ["trabajadores"],
    });

    if (!etiqueta) {
      return res.status(404).json({ message: "Etiqueta no encontrada" });
    }

    res.status(200).json(etiqueta);
  } catch (error) {
    console.error("Error al obtener etiqueta:", error);
    res.status(500).json({ message: "Error interno al obtener la etiqueta" });
  }
};

// POST /api/etiquetas
// Solo administradores. Validar tipo_usuario en middleware de auth, no aquí.
export const crearEtiqueta = async (req, res) => {
  try {
    const { nombre_etiqueta, descripcion } = req.body;

    if (!nombre_etiqueta) {
      return res.status(400).json({ message: "El campo nombre_etiqueta es obligatorio" });
    }

    const nueva = etiquetaRepo.create({ nombre_etiqueta, descripcion });
    await etiquetaRepo.save(nueva);

    res.status(201).json(nueva);
  } catch (error) {
    console.error("Error al crear etiqueta:", error);
    res.status(500).json({ message: "Error interno al crear la etiqueta" });
  }
};

// PUT /api/etiquetas/:id
// Solo administradores.
export const actualizarEtiqueta = async (req, res) => {
  try {
    const { id } = req.params;

    const etiqueta = await etiquetaRepo.findOneBy({ id_etiqueta: parseInt(id) });

    if (!etiqueta) {
      return res.status(404).json({ message: "Etiqueta no encontrada" });
    }

    const { nombre_etiqueta, descripcion } = req.body;

    if (nombre_etiqueta) etiqueta.nombre_etiqueta = nombre_etiqueta;
    if (descripcion !== undefined) etiqueta.descripcion = descripcion;

    await etiquetaRepo.save(etiqueta);

    res.status(200).json(etiqueta);
  } catch (error) {
    console.error("Error al actualizar etiqueta:", error);
    res.status(500).json({ message: "Error interno al actualizar la etiqueta" });
  }
};

// DELETE /api/etiquetas/:id
// Solo administradores. Al eliminar, los trabajadores quedan con id_etiqueta = null.
export const eliminarEtiqueta = async (req, res) => {
  try {
    const { id } = req.params;

    const etiqueta = await etiquetaRepo.findOneBy({ id_etiqueta: parseInt(id) });

    if (!etiqueta) {
      return res.status(404).json({ message: "Etiqueta no encontrada" });
    }

    await etiquetaRepo.remove(etiqueta);

    res.status(200).json({ message: "Etiqueta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar etiqueta:", error);
    res.status(500).json({ message: "Error interno al eliminar la etiqueta" });
  }
};

// PATCH /api/etiquetas/asignar
// Asigna o reasigna una etiqueta a un trabajador. Solo administradores.
// Body: { id_trabajador, id_etiqueta }  (id_etiqueta: null para quitar etiqueta)
export const asignarEtiqueta = async (req, res) => {
  try {
    const { id_trabajador, id_etiqueta } = req.body;

    if (!id_trabajador) {
      return res.status(400).json({ message: "El campo id_trabajador es obligatorio" });
    }

    const trabajadorRepo = AppDataSource.getRepository("Trabajador");
    const trabajador = await trabajadorRepo.findOneBy({ id_trabajador: parseInt(id_trabajador) });

    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }

    // Validar que la etiqueta exista si se envió una
    if (id_etiqueta !== null && id_etiqueta !== undefined) {
      const etiqueta = await etiquetaRepo.findOneBy({ id_etiqueta: parseInt(id_etiqueta) });

      if (!etiqueta) {
        return res.status(404).json({ message: "Etiqueta no encontrada" });
      }

      trabajador.id_etiqueta = parseInt(id_etiqueta);
    } else {
      // Quitar etiqueta
      trabajador.id_etiqueta = null;
    }

    await trabajadorRepo.save(trabajador);

    res.status(200).json({
      message: "Etiqueta asignada correctamente",
      id_trabajador: trabajador.id_trabajador,
      id_etiqueta: trabajador.id_etiqueta,
    });
  } catch (error) {
    console.error("Error al asignar etiqueta:", error);
    res.status(500).json({ message: "Error interno al asignar la etiqueta" });
  }
};