// jobs/remuneracion.job.js

import cron from "node-cron";
import { AppDataSource } from '../config/configDb.js';
import { RemuneracionSchema } from "../entities/remuneracion.entity.js";

export function iniciarJobRemuneraciones() {
  // Se ejecuta todos los días a las 00:05
  cron.schedule("5 0 * * *", async () => {
    console.log("[RemuneracionJob] Verificando remuneraciones atrasadas...");

    const repo = AppDataSource.getRepository(RemuneracionSchema);
    const hoy = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    try {
      const resultado = await repo
        .createQueryBuilder()
        .update()
        .set({ estado_pago: "atrasado" })
        .where("estado_pago = :estado", { estado: "pendiente" })
        .andWhere("fecha_pago < :hoy", { hoy })
        .execute();

      console.log(`[RemuneracionJob] ${resultado.affected} remuneracion(es) marcadas como atrasadas.`);
    } catch (error) {
      console.error("[RemuneracionJob] Error al actualizar remuneraciones:", error);
    }
  });

  console.log("[RemuneracionJob] Job de remuneraciones iniciado.");
}