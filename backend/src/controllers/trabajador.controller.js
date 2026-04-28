"use strict";
import { AppDataSource } from "../config/configDb.js";

function getRepo() {
  return AppDataSource.getRepository("Trabajador");
}

// GET /api/trabajadores
export async function getAllTrabajadores(req, res) {
  try {
    const repo = getRepo();
    const trabajadores = await repo.find({ relations: ["rol", "contratos"] });
    res.json({ status: "success", data: trabajadores });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// GET /api/trabajadores/:id
export async function getTrabajadorById(req, res) {
  try {
    const repo = getRepo();
    const trabajador = await repo.findOne({
      where: { id_trabajador: parseInt(req.params.id) },
      relations: ["rol", "contratos"],
    });
    if (!trabajador)
      return res.status(404).json({ status: "error", message: "Trabajador no encontrado" });
    res.json({ status: "success", data: trabajador });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// POST /api/trabajadores
export async function createTrabajador(req, res) {
  try {
    const { id_rol, rut, nombres, apellidos, sexo, telefono, correo, direccion, fecha_nacimiento, fecha_ingreso, estado_laboral, experiencia_previa } = req.body;

    if (!id_rol || !rut || !nombres || !apellidos || !correo) {
      return res.status(400).json({
        status: "error",
        message: "Faltan campos obligatorios: id_rol, rut, nombres, apellidos, correo",
      });
    }

    const repo = getRepo();
    const nuevo = repo.create({ id_rol, rut, nombres, apellidos, sexo, telefono, correo, direccion, fecha_nacimiento, fecha_ingreso, estado_laboral, experiencia_previa });
    const guardado = await repo.save(nuevo);
    res.status(201).json({ status: "success", data: guardado });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// PUT /api/trabajadores/:id
export async function updateTrabajador(req, res) {
  try {
    const repo = getRepo();
    const trabajador = await repo.findOne({ where: { id_trabajador: parseInt(req.params.id) } });
    if (!trabajador)
      return res.status(404).json({ status: "error", message: "Trabajador no encontrado" });

    repo.merge(trabajador, req.body);
    const actualizado = await repo.save(trabajador);
    res.json({ status: "success", data: actualizado });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// DELETE /api/trabajadores/:id
export async function deleteTrabajador(req, res) {
  try {
    const repo = getRepo();
    const trabajador = await repo.findOne({ where: { id_trabajador: parseInt(req.params.id) } });
    if (!trabajador)
      return res.status(404).json({ status: "error", message: "Trabajador no encontrado" });

    await repo.remove(trabajador);
    res.json({ status: "success", message: "Trabajador eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}
