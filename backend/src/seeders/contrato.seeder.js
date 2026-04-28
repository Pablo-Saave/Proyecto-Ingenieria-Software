"use strict";
import { AppDataSource } from "../config/configDb.js";

export async function seedContratos() {
  try {
    const contratoRepo = AppDataSource.getRepository("ContratoTrabajador");
    const trabajadorRepo = AppDataSource.getRepository("Trabajador");

    // Verificar si ya existen contratos
    const contratosExistentes = await contratoRepo.count();
    if (contratosExistentes > 0) {
      console.log("Los contratos ya existen en la base de datos. Saltando seed de contratos.");
      return;
    }

    // Obtener trabajadores existentes
    const trabajadores = await trabajadorRepo.find();

    if (trabajadores.length === 0) {
      console.log("No hay trabajadores en la base de datos. Por favor crea trabajadores primero.");
      return;
    }

    // Crear contratos de prueba - uno para cada trabajador
    const contratos = [
      {
        tipo_contrato: "Contrato Indefinido",
        estado_contrato: "Activo",
        fecha_inicio: new Date("2023-01-10"),
        fecha_termino: null,
        observaciones: "Contrato de tiempo completo",
        id_trabajador: trabajadores[0].id_trabajador,
      },
      {
        tipo_contrato: "Contrato a Plazo Fijo",
        estado_contrato: "Activo",
        fecha_inicio: new Date("2023-03-15"),
        fecha_termino: new Date("2024-12-31"),
        observaciones: "Proyecto especial de 11 meses",
        id_trabajador: trabajadores[1].id_trabajador,
      },
      {
        tipo_contrato: "Contrato Indefinido",
        estado_contrato: "Activo",
        fecha_inicio: new Date("2022-06-01"),
        fecha_termino: null,
        observaciones: "Contrato supervisión",
        id_trabajador: trabajadores[2].id_trabajador,
      },
      {
        tipo_contrato: "Contrato a Plazo Fijo",
        estado_contrato: "Activo",
        fecha_inicio: new Date("2024-01-05"),
        fecha_termino: new Date("2025-01-05"),
        observaciones: "Contrato anual",
        id_trabajador: trabajadores[3].id_trabajador,
      },
    ];

    // Insertar contratos
    const contratoGuardados = await contratoRepo.save(contratos);
    console.log(`✓ ${contratoGuardados.length} contratos insertados correctamente`);

    contratoGuardados.forEach((contrato) => {
      console.log(`  - Contrato ID: ${contrato.id_contrato} - ${contrato.tipo_contrato} (${contrato.estado_contrato})`);
    });
  } catch (error) {
    console.error("Error al hacer seed de contratos:", error);
  }
}
