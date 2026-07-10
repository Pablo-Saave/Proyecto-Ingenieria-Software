// Cron diario: actualiza automáticamente el estado de los contratos de
// proyecto según su fecha de término efectiva (fecha_extension o
// fecha_termino), marcándolos como "por_vencer" o "inactivo".

import cron from 'node-cron';
import { AppDataSource } from '../config/configDb.js';
import { crearNotificacionMasiva } from '../services/Notificacion.service.js';
import { DIAS_UMBRAL_POR_VENCER, hoyLocal } from '../validations/contrato_proyecto.validation.js';

export function iniciarCronContratoProyecto() {

  async function verificarContratosProyecto() {
    console.log('[CRON] Verificando contratos de proyecto...');

    try {
      const repo = AppDataSource.getRepository('ContratoProyecto');
      const hoy  = hoyLocal(); // hora local, no UTC

      //1. Marcar como inactivo los contratos ya vencidos 
      const vencidos = await repo
        .createQueryBuilder('contrato')
        .where('COALESCE(contrato.fecha_extension, contrato.fecha_termino) < :hoy', { hoy })
        .andWhere('contrato.estado_contrato != :est', { est: 'inactivo' })
        .getMany();

      if (vencidos.length > 0) {
        const ids = vencidos.map((c) => c.id_contrato_proyecto);
        await repo
          .createQueryBuilder()
          .update()
          .set({ estado_contrato: 'inactivo' })
          .whereInIds(ids)
          .execute();

        console.log(`[CRON] ${vencidos.length} contrato(s) de proyecto marcados como inactivo.`);
      } else {
        console.log('[CRON] No hay contratos de proyecto vencidos por actualizar.');
      }

      //2. Detectar y notificar contratos "por vencer"
      const enUmbral = new Date();
      enUmbral.setDate(enUmbral.getDate() + DIAS_UMBRAL_POR_VENCER);
      const fechaLimite = `${enUmbral.getFullYear()}-${String(enUmbral.getMonth() + 1).padStart(2, '0')}-${String(enUmbral.getDate()).padStart(2, '0')}`;

      const porVencer = await repo
        .createQueryBuilder('contrato')
        .where('COALESCE(contrato.fecha_extension, contrato.fecha_termino) BETWEEN :hoy AND :limite', { hoy, limite: fechaLimite })
        .andWhere('contrato.estado_contrato = :est', { est: 'activo' })
        .leftJoinAndSelect('contrato.proyecto', 'proyecto')
        .getMany();

      if (porVencer.length > 0) {
        const admins = await AppDataSource.getRepository('Trabajador').find({
          where: { tipo_usuario: 'administrador' },
          select: ['id_trabajador'],
        });
        const idsAdmins = admins.map((a) => a.id_trabajador);

        if (idsAdmins.length > 0) {
          for (const c of porVencer) {
            const fechaEfectiva = c.fecha_extension || c.fecha_termino;
            const nombreProyecto = c.proyecto?.nombre_proyecto || `Proyecto #${c.id_proyecto}`;

            await crearNotificacionMasiva(idsAdmins, {
              tipo: 'contrato_proyecto_por_vencer',
              titulo: 'Contrato de proyecto por vencer',
              mensaje: `El contrato del proyecto "${nombreProyecto}" vence el ${fechaEfectiva}`,
              referencia_tipo: 'contrato_proyecto',
              referencia_id: c.id_contrato_proyecto,
            });
          }
        }

        // Marcar el estado como  "por_vencer" para no volver a notificar estos mismos contratos al siguiente dia
        const idsPorVencer = porVencer.map((c) => c.id_contrato_proyecto);
        await repo
          .createQueryBuilder()
          .update()
          .set({ estado_contrato: 'por_vencer' })
          .whereInIds(idsPorVencer)
          .execute();

        console.log(`[CRON] ${porVencer.length} contrato(s) de proyecto próximos a vencer notificados y marcados como "por_vencer".`);
      } else {
        console.log('[CRON] No hay contratos de proyecto por vencer dentro del rango.');
      }

    } catch (error) {
      console.error('[CRON] Error al actualizar contratos de proyecto:', error.message);
    }
  }

  //todos los días a las 00:00
  cron.schedule('0 0 * * *', verificarContratosProyecto);

  // Corre una vez de inmediato al levantar el servidor, para no depender para no esperar a las 12 igual a los laborales
  verificarContratosProyecto();

  console.log('[CRON] Job de contratos de proyecto iniciado (corre al iniciar el server y todos los días a medianoche).');
}