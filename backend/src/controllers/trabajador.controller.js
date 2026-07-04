"use strict";
import { AppDataSource } from "../config/configDb.js";

import { In, Not } from "typeorm";
import { TrabajadorSchema } from "../entities/trabajador.entity.js";
import { AsignadoSchema }   from "../entities/asignado.entity.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";

const trabajadorRepo = AppDataSource.getRepository(TrabajadorSchema);
const asignadoRepo   = AppDataSource.getRepository(AsignadoSchema);
const proyectoRepo   = AppDataSource.getRepository(ProyectoSchema);


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



















/*
 * GET /sinCuadrilla/
 *
 * Recibe:
 *   - req.user.tipo_usuario (desde el token JWT via authMiddleware)
 *
 * Retorna 200:
 *   {
 *     status: "success",
 *     data: [
 *       {
 *         id_trabajador,
 *         tipo_usuario,
 *         rut,
 *         nombres,
 *         apellidos,
 *         sexo,
 *         telefono,
 *         correo,
 *         direccion,
 *         fecha_nacimiento,
 *         fecha_ingreso,
 *         estado_laboral,
 *         experiencia_previa,
 *         contratos: [{ ...ContratoTrabajador }]
 *       }
 *     ]
 *   }
 */
export async function getAllTrabajadoresSinCuadrilla(req, res) {
  try {
    // ── Validación 1: solo administrador ──────────────────────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un administrador puede consultar esta información.",
      });
    }

    // ── Paso 1: obtener todos los id_trabajador que ya están en una cuadrilla ─
    const asignados = await asignadoRepo.find({
      select: ["id_trabajador"],
    });

    const idsAsignados = asignados.map((a) => a.id_trabajador);

    // ── Paso 2: trabajadores cuyo id no esté en esa lista ────────────────────
    const where = idsAsignados.length
      ? { id_trabajador: Not(In(idsAsignados)) }
      : {};

    const trabajadores = await trabajadorRepo.find({
      where,
      relations: ["contratos"],
    });

    // ── Paso 3: excluir hashed_pass de la respuesta ───────────────────────────
    const data = trabajadores.map(({ hashed_pass, ...resto }) => resto);

    return res.status(200).json({ status: "success", data });

  } catch (error) {
    console.error("[getAllTrabajadoresSinCuadrilla]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}









/*
 * Retorna todos los supervisores que no están asignados a ningún proyecto.
 *
 * Recibe:
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status: "success",
 *     data: [{ id_trabajador, nombres, apellidos, rut }]
 *   }
 */
export async function getAllSupervisoresSinProyecto(req, res) {
  try {
    // ── Validación 1: solo administrador ──────────────────────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un administrador puede consultar esta información.",
      });
    }

    // ── Validaciones 2 y 3: supervisores cuyo id no aparece en ningún proyecto ─
    const proyectos = await proyectoRepo.find({
      select: ["id_supervisor"],
    });

    const idsSupervisoresOcupados = proyectos
      .map((p) => p.id_supervisor)
      .filter((id) => id !== null);

    const where = idsSupervisoresOcupados.length
      ? { tipo_usuario: "supervisor", id_trabajador: Not(In(idsSupervisoresOcupados)) }
      : { tipo_usuario: "supervisor" };

    const supervisores = await trabajadorRepo.find({
      where,
      select: ["id_trabajador", "nombres", "apellidos", "rut"],
    });

    return res.status(200).json({
      status: "success",
      data:   supervisores,
    });

  } catch (error) {
    console.error("[getAllSupervisoresSinProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}