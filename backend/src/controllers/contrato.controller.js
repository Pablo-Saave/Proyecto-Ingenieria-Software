// controllers/contrato.controller.js
"use strict";
import { AppDataSource } from "../config/configDb.js";

function getRepo() {
  return AppDataSource.getRepository("ContratoTrabajador");
}

// GET /api/contratos
export async function getAllContratos(req, res) {
  try {
    const repo = getRepo();
    const contratos = await repo.find({ relations: ["trabajador"] });
    res.json({ status: "success", data: contratos });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// GET /api/contratos/:id
export async function getContratoById(req, res) {
  try {
    const repo = getRepo();
    const contrato = await repo.findOne({
      where: { id_contrato: parseInt(req.params.id) },
      relations: ["trabajador", "anexos"],
    });
    if (!contrato)
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });

    // Igual que en contrato_proyecto: mas reciente primero
    contrato.anexos = (contrato.anexos || []).sort(
      (a, b) => new Date(b.fecha_anexo) - new Date(a.fecha_anexo)
    );

    res.json({ status: "success", data: contrato });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// GET /api/contratos/mis-contratos/:id_trabajador
// Solo devuelve contratos del trabajador autenticado.
// El middleware de ruta ya garantiza que el rol tiene contratos:ver_propios,
// pero además verificamos que el id pedido coincida con el usuario del token.
export async function getContratosByTrabajador(req, res) {
  try {
    const idSolicitado = parseInt(req.params.id_trabajador);

    // Un trabajador solo puede ver sus propios contratos.
    // Supervisor y Administrador pueden ver los de cualquiera.
    const esAdmin = ['administrador', 'supervisor'].includes(req.user.tipo_usuario);
    if (!esAdmin && req.user.id_trabajador !== idSolicitado) {
      return res.status(403).json({
        status: "error",
        message: "Solo puedes consultar tus propios contratos.",
      });
    }

    const repo = getRepo();
    const contratos = await repo.find({
      where: { id_trabajador: idSolicitado },
      relations: ["trabajador"],
      order: { fecha_inicio: "DESC" },
    });

    res.json({ status: "success", data: contratos });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// POST /api/contratos
export async function createContrato(req, res) {
  try {
    const {
      tipo_contrato,
      estado_contrato,
      fecha_inicio,
      fecha_termino,
      observaciones,
      monto,
      id_trabajador,
    } = req.body;

    // Verificar que el trabajador existe
    const trabajadorRepo = AppDataSource.getRepository("Trabajador");
    const trabajador = await trabajadorRepo.findOneBy({
      id_trabajador: parseInt(id_trabajador),
    });
    if (!trabajador) {
      return res.status(404).json({
        status: "error",
        message: "El trabajador especificado no existe.",
      });
    }

    const repo = getRepo();
    const nuevo = repo.create({
      tipo_contrato,
      estado_contrato,
      fecha_inicio,
      // Para contratos Indefinidos el validador ya dejó fecha_termino en null
      fecha_termino: fecha_termino || null,
      observaciones: observaciones || null,
      monto: monto !== undefined && monto !== null ? Number(monto) : null,
      id_trabajador: parseInt(id_trabajador),
    });

    const guardado = await repo.save(nuevo);
    res.status(201).json({ status: "success", data: guardado });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// PUT /api/contratos/:id
export async function updateContrato(req, res) {
  try {
    const repo = getRepo();
    const contrato = await repo.findOne({
      where: { id_contrato: parseInt(req.params.id) },
    });
    if (!contrato)
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });

    repo.merge(contrato, req.body);
    const actualizado = await repo.save(contrato);
    res.json({ status: "success", data: actualizado });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// DELETE /api/contratos/:id
// IMPORTANTE: Este controlador espera que el middleware validarEliminarContrato
// ya haya verificado que req.contrato existe y que su estado permite eliminarlo.
// Para eso el router llama primero a un loader que adjunta req.contrato.
//
// El loader está definido abajo y el router lo usa antes de validarEliminarContrato.
export async function deleteContrato(req, res) {
  try {
    // req.contrato viene del loader cargarContrato
    await getRepo().remove(req.contrato);
    res.json({ status: "success", message: "Contrato eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

/**
 * Middleware loader: carga el contrato de la BD y lo adjunta en req.contrato.
 * Se usa en la ruta DELETE antes de validarEliminarContrato.
 */
export async function cargarContrato(req, res, next) {
  try {
    const repo = getRepo();
    const contrato = await repo.findOne({
      where: { id_contrato: parseInt(req.params.id) },
    });
    if (!contrato) {
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });
    }
    req.contrato = contrato;
    next();
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}