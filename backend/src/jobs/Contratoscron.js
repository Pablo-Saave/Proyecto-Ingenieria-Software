// jobs/contratosCron.js
// Ejecuta cada día a medianoche:
//  1) Marca como "Inactivo" los contratos de Plazo Fijo cuya fecha_termino ya pasó.
//  2) Detecta contratos de Plazo Fijo que vencen dentro de 30 días y notifica
//     al trabajador y a los administradores. Para evitar notificar el mismo
//     contrato todos los días, al detectarlo se cambia su estado a
//     "Por vencer" (así deja de matchear el filtro estado_contrato = 'Activo').

import cron from 'node-cron';
import { AppDataSource } from '../config/configDb.js';
import { crearNotificacion, crearNotificacionMasiva } from '../services/notificacion.service.js';

export function iniciarCronContratos() {

  // '0 0 * * *' → todos los días a las 00:00
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Verificando contratos...');

    try {
      const repo = AppDataSource.getRepository('ContratoTrabajador');
      const hoy  = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

      // ── 1. Marcar como Inactivo los contratos ya vencidos ───────────────
      const vencidos = await repo
        .createQueryBuilder('contrato')
        .where('contrato.tipo_contrato = :tipo',       { tipo: 'Plazo Fijo' })
        .andWhere('contrato.fecha_termino < :hoy',     { hoy })
        .andWhere('contrato.estado_contrato != :est',  { est: 'Inactivo' })
        .getMany();

      if (vencidos.length > 0) {
        const ids = vencidos.map((c) => c.id_contrato);
        await repo
          .createQueryBuilder()
          .update()
          .set({ estado_contrato: 'Inactivo' })
          .whereInIds(ids)
          .execute();

        console.log(`[CRON] ${vencidos.length} contrato(s) marcados como Inactivo.`);
      } else {
        console.log('[CRON] No hay contratos vencidos por actualizar.');
      }

      // ── 2. Detectar y notificar contratos "por vencer" (próximos 30 días) ──
      const en30dias = new Date();
      en30dias.setDate(en30dias.getDate() + 30);
      const fechaLimite = en30dias.toISOString().split('T')[0];

      const porVencer = await repo
        .createQueryBuilder('contrato')
        .where('contrato.tipo_contrato = :tipo', { tipo: 'Plazo Fijo' })
        .andWhere('contrato.fecha_termino BETWEEN :hoy AND :limite', { hoy, limite: fechaLimite })
        .andWhere('contrato.estado_contrato = :est', { est: 'Activo' })
        .getMany();

      if (porVencer.length > 0) {
        const admins = await AppDataSource.getRepository('Trabajador').find({
          where: { tipo_usuario: 'administrador' },
          select: ['id_trabajador'],
        });
        const idsAdmins = admins.map((a) => a.id_trabajador);

        for (const c of porVencer) {
          // Notificar al trabajador dueño del contrato
          await crearNotificacion({
            id_trabajador: c.id_trabajador,
            tipo: 'contrato_por_vencer',
            titulo: 'Tu contrato está por vencer',
            mensaje: `Tu contrato vence el ${c.fecha_termino}`,
            referencia_tipo: 'contrato',
            referencia_id: c.id_contrato,
          });

          // Notificar a todos los administradores
          if (idsAdmins.length > 0) {
            await crearNotificacionMasiva(idsAdmins, {
              tipo: 'contrato_por_vencer',
              titulo: 'Contrato por vencer',
              mensaje: `El contrato #${c.id_contrato} vence el ${c.fecha_termino}`,
              referencia_tipo: 'contrato',
              referencia_id: c.id_contrato,
            });
          }
        }

        // Marcar como "Por vencer" para no volver a notificar estos mismos
        // contratos en la corrida de mañana.
        const idsPorVencer = porVencer.map((c) => c.id_contrato);
        await repo
          .createQueryBuilder()
          .update()
          .set({ estado_contrato: 'Por vencer' })
          .whereInIds(idsPorVencer)
          .execute();

        console.log(`[CRON] ${porVencer.length} contrato(s) próximos a vencer notificados y marcados como "Por vencer".`);
      } else {
        console.log('[CRON] No hay contratos por vencer dentro del rango.');
      }

    } catch (error) {
      console.error('[CRON] Error al actualizar contratos:', error.message);
    }
  });

  console.log('[CRON] Job de contratos iniciado (corre todos los días a medianoche).');
}