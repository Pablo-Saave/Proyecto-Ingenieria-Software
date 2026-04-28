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
      relations: ["trabajador"],
    });
    if (!contrato)
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });
    res.json({ status: "success", data: contrato });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// POST /api/contratos
export async function createContrato(req, res) {
  try {
    const { tipo_contrato, estado_contrato, fecha_inicio, fecha_termino, observaciones, id_trabajador } = req.body;

    if (!tipo_contrato || !estado_contrato || !fecha_inicio || !id_trabajador) {
      return res.status(400).json({
        status: "error",
        message: "Faltan campos obligatorios: tipo_contrato, estado_contrato, fecha_inicio, id_trabajador",
      });
    }

    const repo = getRepo();
    const nuevo = repo.create({ tipo_contrato, estado_contrato, fecha_inicio, fecha_termino, observaciones, id_trabajador });
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
    const contrato = await repo.findOne({ where: { id_contrato: parseInt(req.params.id) } });
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
export async function deleteContrato(req, res) {
  try {
    const repo = getRepo();
    const contrato = await repo.findOne({ where: { id_contrato: parseInt(req.params.id) } });
    if (!contrato)
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });

    await repo.remove(contrato);
    res.json({ status: "success", message: "Contrato eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}