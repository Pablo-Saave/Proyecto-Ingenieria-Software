// validations/inventario.validation.js

import { AppDataSource } from "../config/configDb.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";
import { InventarioSchema } from "../entities/inventario.entity.js";
import { MaterialLimpiezaSchema } from "../entities/material_limpieza.entity.js";


const proyectoRepo = AppDataSource.getRepository(ProyectoSchema);
const inventarioRepo = AppDataSource.getRepository(InventarioSchema);
const materialRepo = AppDataSource.getRepository(MaterialLimpiezaSchema);


export async function validarCrearInventario(req, res, next) {
  try {
    // ── Validación 2: solo supervisor ─────────────────────────────────────────
    if (req.user?.tipo_usuario !== "supervisor") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un supervisor puede crear inventarios.",
      });
    }

    // ── Validación de campos obligatorios ─────────────────────────────────────
    const { nombre_inventario } = req.body;

    if (!nombre_inventario || nombre_inventario.trim() === "") {
      return res.status(400).json({
        status:  "error",
        message: "El campo nombre_inventario es obligatorio.",
      });
    }

    // ── Validaciones 1 y 3: buscar el proyecto activo del supervisor ──────────

    const proyecto = await proyectoRepo.findOne({
      where: {
        id_supervisor: req.user.id_trabajador,
        estado:        "activo",
      },
    });

    // Validación 1: debe existir un proyecto supervisado por este trabajador
    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: "No se encontró un proyecto activo asociado a tu usuario como supervisor.",
      });
    }

    // Validación 3: el proyecto debe estar activo (implícito en el where,
    // pero se deja explícito por claridad en caso de cambio de lógica)
    if (proyecto.estado !== "activo") {
      return res.status(400).json({
        status:  "error",
        message: `El proyecto "${proyecto.nombre_proyecto}" no está activo (estado actual: "${proyecto.estado}").`,
      });
    }

    // Adjuntar proyecto resuelto para no repetir la query en el controlador
    req.proyectoValidado = proyecto;

    next();
  } catch (error) {
    console.error("[validarCrearInventario]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}


export async function validarEliminarInventario(req, res, next) {
  try {
    // ── Validación 1: solo supervisor ─────────────────────────────────────────
    if (req.user?.tipo_usuario !== "supervisor") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un supervisor puede eliminar inventarios.",
      });
    }

    // ── Campo obligatorio ─────────────────────────────────────────────────────
    const { id_inventario } = req.body;

    if (!id_inventario) {
      return res.status(400).json({
        status:  "error",
        message: "El campo id_inventario es obligatorio.",
      });
    }

    if (isNaN(Number(id_inventario))) {
      return res.status(400).json({
        status:  "error",
        message: "id_inventario debe ser un número entero.",
      });
    }

    // ── Buscar el inventario ──────────────────────────────────────────────────

    const inventario = await inventarioRepo.findOne({
      where: { id_inventario: Number(id_inventario) },
    });

    if (!inventario) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un inventario con id_inventario ${id_inventario}.`,
      });
    }

    // ── Buscar el proyecto del inventario ─────────────────────────────────────

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: inventario.id_proyecto },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: "No se encontró el proyecto asociado a este inventario.",
      });
    }

    // ── Validación 2: el proyecto debe estar activo ───────────────────────────
    if (proyecto.estado !== "activo") {
      return res.status(400).json({
        status:  "error",
        message: `El proyecto "${proyecto.nombre_proyecto}" no está activo (estado actual: "${proyecto.estado}").`,
      });
    }

    // ── Validación 3: el supervisor del proyecto debe ser quien hace la petición
    if (proyecto.id_supervisor !== req.user.id_trabajador) {
      return res.status(403).json({
        status:  "error",
        message: "No tienes permiso para eliminar inventarios de este proyecto.",
      });
    }

    // Adjuntar entidades resueltas para no repetir queries en el controlador
    req.inventarioValidado = inventario;

    next();
  } catch (error) {
    console.error("[validarEliminarInventario]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}


export async function validarGetAllInventarios(req, res, next) {
  try {
    // ── Validación 1: solo supervisor ─────────────────────────────────────────
    if (req.user?.tipo_usuario !== "supervisor") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un supervisor puede consultar los inventarios de su proyecto.",
      });
    }

    // ── Validación 2: buscar proyecto donde id_supervisor = token ─────────────

    const proyecto = await proyectoRepo.findOne({
      where: { id_supervisor: req.user.id_trabajador },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: "No se encontró un proyecto asociado a tu usuario como supervisor.",
      });
    }

    req.proyectoValidado = proyecto;

    next();
  } catch (error) {
    console.error("[validarGetAllInventarios]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}


export async function validarGetAllMateriales(req, res, next) {
  try {
    // ── Validación 1: solo supervisor ─────────────────────────────────────────
    if (req.user?.tipo_usuario !== "supervisor") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un supervisor puede consultar los materiales de un inventario.",
      });
    }

    const { id_inventario } = req.params;

    if (!id_inventario || isNaN(Number(id_inventario))) {
      return res.status(400).json({
        status:  "error",
        message: "id_inventario debe ser un número entero válido.",
      });
    }

    // ── Buscar el inventario ──────────────────────────────────────────────────

    const inventario = await inventarioRepo.findOne({
      where: { id_inventario: Number(id_inventario) },
    });

    if (!inventario) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un inventario con id_inventario ${id_inventario}.`,
      });
    }

    // ── Validación 2: el proyecto del inventario debe ser del supervisor ───────

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: inventario.id_proyecto },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: "No se encontró el proyecto asociado a este inventario.",
      });
    }

    if (proyecto.id_supervisor !== req.user.id_trabajador) {
      return res.status(403).json({
        status:  "error",
        message: "No tienes permiso para consultar los materiales de este inventario.",
      });
    }

    req.inventarioValidado = inventario;

    next();
  } catch (error) {
    console.error("[validarGetAllMateriales]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}



export async function validarActualizarMaterial(req, res, next) {
  try {
    // ── Validación 2: solo supervisor ─────────────────────────────────────────
    if (req.user?.tipo_usuario !== "supervisor") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un supervisor puede actualizar materiales de un inventario.",
      });
    }

    const { id_material } = req.params;

    if (!id_material || isNaN(Number(id_material))) {
      return res.status(400).json({
        status:  "error",
        message: "id_material debe ser un número entero válido.",
      });
    }

    // ── Validación 3: el material debe existir ────────────────────────────────

    const material = await materialRepo.findOne({
      where: { id_material: Number(id_material) },
    });

    if (!material) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un material con id_material ${id_material}.`,
      });
    }

    // ── Buscar inventario → proyecto ──────────────────────────────────────────

    const inventario = await inventarioRepo.findOne({
      where: { id_inventario: material.id_inventario },
    });

    if (!inventario) {
      return res.status(404).json({
        status:  "error",
        message: "No se encontró el inventario asociado a este material.",
      });
    }

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: inventario.id_proyecto },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: "No se encontró el proyecto asociado a este material.",
      });
    }

    // ── Validación 4: el proyecto debe estar activo ───────────────────────────
    if (proyecto.estado !== "activo") {
      return res.status(400).json({
        status:  "error",
        message: `El proyecto "${proyecto.nombre_proyecto}" no está activo (estado actual: "${proyecto.estado}").`,
      });
    }

    // ── Validación 1: el supervisor del proyecto debe ser quien hace la petición
    if (proyecto.id_supervisor !== req.user.id_trabajador) {
      return res.status(403).json({
        status:  "error",
        message: "No tienes permiso para actualizar materiales de este inventario.",
      });
    }

    req.materialValidado = material;

    next();
  } catch (error) {
    console.error("[validarActualizarMaterial]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}


export async function validarCrearMaterial(req, res, next) {
  try {
    // ── Validación 2: solo supervisor ─────────────────────────────────────────
    if (req.user?.tipo_usuario !== "supervisor") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un supervisor puede crear materiales en un inventario.",
      });
    }

    // ── Validación 3: campos obligatorios no vacíos ───────────────────────────
    const { id_inventario, nombre_material, tipo_material, stock_actual, stock_minimo } = req.body;

    const errores = [];

    if (!id_inventario)    errores.push("El campo id_inventario es obligatorio.");
    if (!nombre_material)  errores.push("El campo nombre_material es obligatorio.");
    if (!tipo_material)    errores.push("El campo tipo_material es obligatorio.");
    if (stock_actual === undefined || stock_actual === null || stock_actual === "")
      errores.push("El campo stock_actual es obligatorio.");
    if (stock_minimo === undefined || stock_minimo === null || stock_minimo === "")
      errores.push("El campo stock_minimo es obligatorio.");

    if (errores.length) {
      return res.status(400).json({ status: "error", message: errores.join(" ") });
    }

    if (isNaN(Number(id_inventario))) {
      return res.status(400).json({
        status:  "error",
        message: "id_inventario debe ser un número entero.",
      });
    }

    if (isNaN(Number(stock_actual)) || Number(stock_actual) < 0) {
      return res.status(400).json({
        status:  "error",
        message: "stock_actual debe ser un número entero mayor o igual a 0.",
      });
    }

    if (isNaN(Number(stock_minimo)) || Number(stock_minimo) < 0) {
      return res.status(400).json({
        status:  "error",
        message: "stock_minimo debe ser un número entero mayor o igual a 0.",
      });
    }

    // ── Validación 1: el inventario debe existir ──────────────────────────────

    const inventario = await inventarioRepo.findOne({
      where: { id_inventario: Number(id_inventario) },
    });

    if (!inventario) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un inventario con id_inventario ${id_inventario}.`,
      });
    }

    // ── Validación 4: el supervisor del proyecto debe ser quien hace la petición

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: inventario.id_proyecto },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: "No se encontró el proyecto asociado a este inventario.",
      });
    }

    if (proyecto.id_supervisor !== req.user.id_trabajador) {
      return res.status(403).json({
        status:  "error",
        message: "No tienes permiso para agregar materiales a este inventario.",
      });
    }

    req.inventarioValidado = inventario;

    next();
  } catch (error) {
    console.error("[validarCrearMaterial]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}