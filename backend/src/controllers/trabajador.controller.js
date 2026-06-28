"use strict";
import { AppDataSource } from "../config/configDb.js";

// Valores válidos para tipo_usuario. Definir aquí para validación consistente.
const TIPOS_USUARIO_VALIDOS = ["trabajador", "supervisor", "administrador"];

function getRepo() {
  return AppDataSource.getRepository("Trabajador");
}

// GET /api/trabajadores
export async function getAllTrabajadores(req, res) {
  try {
    const repo = getRepo();
    const trabajadores = await repo.find({
      relations: ["contratos"],
    });
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
      relations: ["contratos"],
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
    const {
      tipo_usuario,
      rut,
      nombres,
      apellidos,
      sexo,
      telefono,
      correo,
      direccion,
      fecha_nacimiento,
      fecha_ingreso,
      estado_laboral,
      experiencia_previa,
    } = req.body;

    // Validar campos obligatorios
    if (!tipo_usuario || !rut || !nombres || !apellidos || !correo) {
      return res.status(400).json({
        status: "error",
        message: "Faltan campos obligatorios: tipo_usuario, rut, nombres, apellidos, correo",
      });
    }

    // Validar que tipo_usuario sea un valor permitido
    if (!TIPOS_USUARIO_VALIDOS.includes(tipo_usuario)) {
      return res.status(400).json({
        status: "error",
        message: `tipo_usuario inválido. Valores permitidos: ${TIPOS_USUARIO_VALIDOS.join(", ")}`,
      });
    }

    const repo = getRepo();
    const nuevo = repo.create({
      tipo_usuario,
      rut,
      nombres,
      apellidos,
      sexo,
      telefono,
      correo,
      direccion,
      fecha_nacimiento,
      fecha_ingreso,
      estado_laboral,
      experiencia_previa,
    });

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
    const trabajador = await repo.findOne({
      where: { id_trabajador: parseInt(req.params.id) },
    });

    if (!trabajador)
      return res.status(404).json({ status: "error", message: "Trabajador no encontrado" });

    // Validar tipo_usuario si viene en el body
    if (req.body.tipo_usuario && !TIPOS_USUARIO_VALIDOS.includes(req.body.tipo_usuario)) {
      return res.status(400).json({
        status: "error",
        message: `tipo_usuario inválido. Valores permitidos: ${TIPOS_USUARIO_VALIDOS.join(", ")}`,
      });
    }

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
    const trabajador = await repo.findOne({
      where: { id_trabajador: parseInt(req.params.id) },
    });

    if (!trabajador)
      return res.status(404).json({ status: "error", message: "Trabajador no encontrado" });

    await repo.remove(trabajador);
    res.json({ status: "success", message: "Trabajador eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}