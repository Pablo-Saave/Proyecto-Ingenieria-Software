import cron from 'node-cron';
import { AppDataSource } from '../config/configDb.js';
import { crearNotificacion, crearNotificacionMasiva } from '../services/notificacion.service.js';

function hoyLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function iniciarCronContratos() {

  async function verificarContratos() {
    console.log('[CRON] Verificando contratos...');

    try {
      const repo = AppDataSource.getRepository('ContratoTrabajador');
      const hoy  = hoyLocal();

      //1. Marcar como Inactivo los contratos ya vencidos
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

      //2. Detectar y notificar contratos "por vencer" (próximos 30 días)
      const en30dias = new Date();
      en30dias.setDate(en30dias.getDate() + 30);
      const fechaLimite = hoyLocal(en30dias);

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
  }

  //todos los días a las 00:00
  cron.schedule('0 0 * * *', verificarContratos);

  // Ejecuta el cron al iniciar el servidor para actualizar estados de inmediato.
  verificarContratos();

  console.log('[CRON] Job de contratos iniciado (corre al iniciar el server y todos los días a medianoche).');
}