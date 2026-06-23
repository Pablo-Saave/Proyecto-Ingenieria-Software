// jobs/contratosCron.js
// Ejecuta cada día a medianoche y marca como "Inactivo" los contratos
// de Plazo Fijo cuya fecha_termino ya pasó y aún están en "Activo" o "Por vencer".

import cron from 'node-cron';
import { AppDataSource } from '../config/configDb.js';

export function iniciarCronContratos() {

  // '0 0 * * *' → todos los días a las 00:00
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Verificando contratos vencidos...');

    try {
      const repo = AppDataSource.getRepository('ContratoTrabajador');
      const hoy  = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

      // Busca contratos Plazo Fijo cuya fecha_termino ya pasó
      // y que aún no estén marcados como Inactivo
      const vencidos = await repo
        .createQueryBuilder('contrato')
        .where('contrato.tipo_contrato = :tipo',       { tipo: 'Plazo Fijo' })
        .andWhere('contrato.fecha_termino < :hoy',     { hoy })
        .andWhere('contrato.estado_contrato != :est',  { est: 'Inactivo' })
        .getMany();

      if (vencidos.length === 0) {
        console.log('[CRON] No hay contratos vencidos por actualizar.');
        return;
      }

      // Actualizar en bloque
      const ids = vencidos.map((c) => c.id_contrato);
      await repo
        .createQueryBuilder()
        .update()
        .set({ estado_contrato: 'Inactivo' })
        .whereInIds(ids)
        .execute();

      console.log(`[CRON] ${vencidos.length} contrato(s) marcados como Inactivo.`);

    } catch (error) {
      console.error('[CRON] Error al actualizar contratos vencidos:', error.message);
    }
  });

  console.log('[CRON] Job de contratos iniciado (corre todos los días a medianoche).');
}