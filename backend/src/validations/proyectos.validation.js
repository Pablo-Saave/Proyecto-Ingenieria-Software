// validations/proyectos.validation.js

import { AppDataSource } from "../config/configDb.js";
import { ClienteSchema } from "../entities/cliente.entity.js";
import { TrabajadorSchema } from "../entities/trabajador.entity.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";

const CAMPOS_REQUERIDOS = [
  "id_cliente",
  "id_supervisor",
  "nombre_proyecto",
  "tipo_instalacion",
  "direccion",
  "nivel_exigencia",
  "cantidad_personal_requerido",
];

export async function validarCrearProyecto(req, res, next) {
  try {
    // ── Validación 1: quien crea debe ser administrador ──────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status: "error",
        message: "Solo un administrador puede crear proyectos.",
      });
    }

    // ── Validación 5: campos obligatorios no vacíos ──────────────────────────
    const errores = [];

    for (const campo of CAMPOS_REQUERIDOS) {
      const valor = req.body[campo];
      if (valor === undefined || valor === null || valor === "") {
        errores.push(`El campo ${campo} es obligatorio.`);
      }
    }

    if (errores.length) {
      return res.status(400).json({ status: "error", message: errores.join(" ") });
    }

    const { id_cliente, id_supervisor, cantidad_personal_requerido } = req.body;

    // ── Validación numérica básica ────────────────────────────────────────────
    if (isNaN(Number(id_cliente)) || isNaN(Number(id_supervisor))) {
      return res.status(400).json({
        status: "error",
        message: "id_cliente e id_supervisor deben ser números enteros.",
      });
    }

    if (isNaN(Number(cantidad_personal_requerido)) || Number(cantidad_personal_requerido) < 1) {
      return res.status(400).json({
        status: "error",
        message: "cantidad_personal_requerido debe ser un número entero mayor a 0.",
      });
    }

    const clienteRepo    = AppDataSource.getRepository(ClienteSchema);
    const trabajadorRepo = AppDataSource.getRepository(TrabajadorSchema);
    const proyectoRepo   = AppDataSource.getRepository(ProyectoSchema);

    // ── Validación 2: el cliente debe existir ─────────────────────────────────
    const cliente = await clienteRepo.findOne({
      where: { id_cliente: Number(id_cliente) },
    });

    if (!cliente) {
      return res.status(404).json({
        status: "error",
        message: `No existe un cliente con id_cliente ${id_cliente}.`,
      });
    }

    // ── Validación 3: el trabajador (supervisor) debe existir ─────────────────
    const supervisor = await trabajadorRepo.findOne({
      where: { id_trabajador: Number(id_supervisor) },
    });

    if (!supervisor) {
      return res.status(404).json({
        status: "error",
        message: `No existe un trabajador con id_trabajador ${id_supervisor}.`,
      });
    }

    // ── Validación 4a: el trabajador debe ser supervisor ──────────────────────
    if (supervisor.tipo_usuario !== "supervisor") {
      return res.status(400).json({
        status: "error",
        message: `El trabajador con id_trabajador ${id_supervisor} no tiene el rol de supervisor (rol actual: "${supervisor.tipo_usuario}").`,
      });
    }

    // ── Validación 4b: el supervisor no debe estar en otro proyecto activo ────
    const proyectoExistente = await proyectoRepo.findOne({
      where: { id_supervisor: Number(id_supervisor), estado: "activo" },
    });

    if (proyectoExistente) {
      return res.status(400).json({
        status: "error",
        message: `El supervisor con id_trabajador ${id_supervisor} ya se encuentra asignado al proyecto "${proyectoExistente.nombre_proyecto}" (id: ${proyectoExistente.id_proyecto}).`,
      });
    }

    // Adjuntar entidades resueltas para no volver a consultarlas en el controlador
    req.clienteValidado    = cliente;
    req.supervisorValidado = supervisor;

    next();
  } catch (error) {
    console.error("[validarCrearProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}