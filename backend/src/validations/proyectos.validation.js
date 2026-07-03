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


const CAMPOS_ACTUALIZABLES = [
  "nombre_proyecto",
  "tipo_instalacion",
  "direccion",
  "nivel_exigencia",
  "cantidad_personal_requerido",
];


const clienteRepo    = AppDataSource.getRepository(ClienteSchema);
const trabajadorRepo = AppDataSource.getRepository(TrabajadorSchema);
const proyectoRepo   = AppDataSource.getRepository(ProyectoSchema);


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




export async function validarInactivarProyecto(req, res, next) {
  try {
    // ── Validación 3: solo administrador ──────────────────────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un administrador puede inactivar proyectos.",
      });
    }

    const { id_proyecto } = req.params;

    if (!id_proyecto || isNaN(Number(id_proyecto))) {
      return res.status(400).json({
        status:  "error",
        message: "id_proyecto debe ser un número entero válido.",
      });
    }

    // ── Validación 1: el proyecto debe existir ────────────────────────────────

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un proyecto con id_proyecto ${id_proyecto}.`,
      });
    }

    // ── Validación 2: el proyecto debe estar activo ───────────────────────────
    if (proyecto.estado !== "activo") {
      return res.status(400).json({
        status:  "error",
        message: `El proyecto "${proyecto.nombre_proyecto}" ya se encuentra inactivo.`,
      });
    }

    req.proyectoValidado = proyecto;

    next();
  } catch (error) {
    console.error("[validarInactivarProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}




export async function validarReactivarProyecto(req, res, next) {
  try {
    // ── Validación 3: solo administrador ──────────────────────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un administrador puede reactivar proyectos.",
      });
    }

    const { id_proyecto } = req.params;

    if (!id_proyecto || isNaN(Number(id_proyecto))) {
      return res.status(400).json({
        status:  "error",
        message: "id_proyecto debe ser un número entero válido.",
      });
    }

    // ── Validación 1: el proyecto debe existir ────────────────────────────────

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un proyecto con id_proyecto ${id_proyecto}.`,
      });
    }

    // ── Validación 2: el proyecto debe estar inactivo ─────────────────────────
    if (proyecto.estado !== "inactivo") {
      return res.status(400).json({
        status:  "error",
        message: `El proyecto "${proyecto.nombre_proyecto}" ya se encuentra activo.`,
      });
    }

    // ── Validación: el proyecto debe tener un supervisor asignado ─────────────
    if (!proyecto.id_supervisor) {
      return res.status(400).json({
        status:  "error",
        message: `El proyecto "${proyecto.nombre_proyecto}" no puede reactivarse porque no tiene un supervisor asignado.`,
      });
    }

    req.proyectoValidado = proyecto;

    next();
  } catch (error) {
    console.error("[validarReactivarProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}





export async function validarCambiarSupervisorProyecto(req, res, next) {
  try {
    // ── Validación 5: solo administrador ──────────────────────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un administrador puede cambiar el supervisor de un proyecto.",
      });
    }

    const { id_proyecto, id_trabajador } = req.body;

    if (!id_proyecto || !id_trabajador) {
      return res.status(400).json({
        status:  "error",
        message: "Los campos id_proyecto e id_trabajador son obligatorios.",
      });
    }

    if (isNaN(Number(id_proyecto)) || isNaN(Number(id_trabajador))) {
      return res.status(400).json({
        status:  "error",
        message: "id_proyecto e id_trabajador deben ser números enteros.",
      });
    }

    // ── Validación 1: el proyecto debe existir ────────────────────────────────
    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un proyecto con id_proyecto ${id_proyecto}.`,
      });
    }

    // ── Validación 2: el trabajador debe existir ──────────────────────────────
    const trabajador = await trabajadorRepo.findOne({
      where: { id_trabajador: Number(id_trabajador) },
    });

    if (!trabajador) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un trabajador con id_trabajador ${id_trabajador}.`,
      });
    }

    // ── Validación 3: el trabajador debe ser supervisor ───────────────────────
    if (trabajador.tipo_usuario !== "supervisor") {
      return res.status(400).json({
        status:  "error",
        message: `El trabajador con id_trabajador ${id_trabajador} no tiene el rol de supervisor (rol actual: "${trabajador.tipo_usuario}").`,
      });
    }

    // ── Validación 4: el supervisor no debe estar en otro proyecto activo ─────
    const proyectoExistente = await proyectoRepo.findOne({
      where: { id_supervisor: Number(id_trabajador), estado: "activo" },
    });

    if (proyectoExistente) {
      return res.status(400).json({
        status:  "error",
        message: `El supervisor con id_trabajador ${id_trabajador} ya se encuentra asignado al proyecto "${proyectoExistente.nombre_proyecto}" (id: ${proyectoExistente.id_proyecto}).`,
      });
    }

    req.proyectoValidado   = proyecto;
    req.supervisorValidado = trabajador;

    next();
  } catch (error) {
    console.error("[validarCambiarSupervisorProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}




export async function validarActualizarProyecto(req, res, next) {
  try {
    // ── Validación 4: solo administrador ──────────────────────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un administrador puede actualizar proyectos.",
      });
    }

    const { id_proyecto } = req.params;

    if (!id_proyecto || isNaN(Number(id_proyecto))) {
      return res.status(400).json({
        status:  "error",
        message: "id_proyecto debe ser un número entero válido.",
      });
    }

    // ── Validación 3: al menos un campo actualizable presente ─────────────────
    const campos = {};
    for (const campo of CAMPOS_ACTUALIZABLES) {
      if (req.body[campo] !== undefined) campos[campo] = req.body[campo];
    }

    if (!Object.keys(campos).length) {
      return res.status(400).json({
        status:  "error",
        message: `Debes enviar al menos uno de los siguientes campos: ${CAMPOS_ACTUALIZABLES.join(", ")}.`,
      });
    }

    if (
      campos.cantidad_personal_requerido !== undefined &&
      (isNaN(Number(campos.cantidad_personal_requerido)) || Number(campos.cantidad_personal_requerido) < 1)
    ) {
      return res.status(400).json({
        status:  "error",
        message: "cantidad_personal_requerido debe ser un número entero mayor a 0.",
      });
    }

    // ── Validación 1: el proyecto debe existir ────────────────────────────────

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un proyecto con id_proyecto ${id_proyecto}.`,
      });
    }

    // ── Validación 2: el proyecto debe estar activo ───────────────────────────
    if (proyecto.estado !== "activo") {
      return res.status(400).json({
        status:  "error",
        message: `El proyecto "${proyecto.nombre_proyecto}" no está activo (estado actual: "${proyecto.estado}").`,
      });
    }

    req.proyectoValidado  = proyecto;
    req.camposActualizados = campos;

    next();
  } catch (error) {
    console.error("[validarActualizarProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}








export async function validarRemoverSupervisorDeProyecto(req, res, next) {
  try {
    // ── Validación 1: solo administrador ──────────────────────────────────────
    if (req.user?.tipo_usuario !== "administrador") {
      return res.status(403).json({
        status:  "error",
        message: "Solo un administrador puede remover el supervisor de un proyecto.",
      });
    }

    // ── Validación 4: campo no vacío ──────────────────────────────────────────
    const { id_proyecto } = req.params;

    if (!id_proyecto || isNaN(Number(id_proyecto))) {
      return res.status(400).json({
        status:  "error",
        message: "id_proyecto debe ser un número entero válido.",
      });
    }

    // ── Validación 2: el proyecto debe existir ────────────────────────────────

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: Number(id_proyecto) },
    });

    if (!proyecto) {
      return res.status(404).json({
        status:  "error",
        message: `No existe un proyecto con id_proyecto ${id_proyecto}.`,
      });
    }

    // ── Validación 3: el proyecto debe estar inactivo ─────────────────────────
    if (proyecto.estado !== "inactivo") {
      return res.status(400).json({
        status:  "error",
        message: `Solo se puede remover el supervisor de un proyecto inactivo (estado actual: "${proyecto.estado}").`,
      });
    }

    // ── Validación 5: el proyecto debe tener un supervisor asignado ───────────
    if (!proyecto.id_supervisor) {
      return res.status(400).json({
        status:  "error",
        message: `El proyecto "${proyecto.nombre_proyecto}" no tiene un supervisor asignado.`,
      });
    }

    req.proyectoValidado = proyecto;

    next();
  } catch (error) {
    console.error("[validarRemoverSupervisorDeProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}