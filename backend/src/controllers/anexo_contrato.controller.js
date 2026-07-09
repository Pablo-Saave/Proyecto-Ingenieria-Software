"use strict";

import { AppDataSource } from "../config/configDb.js";
import { AnexoContratoSchema } from "../entities/anexo_contrato.entity.js";
import { crearNotificacion } from "../services/notificacion.service.js";

import { DIAS_UMBRAL_POR_VENCER } from "../validations/contratos.validation.js";

const TIPOS_CONTRATO = ['Indefinido', 'Plazo Fijo'];

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Misma regla que usa el cron para decidir "Por vencer": si la fecha de
// término cae dentro del umbral, no esperamos a la corrida de medianoche.
function calcularEstadoDesdeFechaTermino(fechaTermino) {
  const hoy = hoyLocal();
  if (!fechaTermino) return 'Activo';
  if (fechaTermino < hoy) return 'Inactivo';

  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_UMBRAL_POR_VENCER);
  const y = limite.getFullYear();
  const m = String(limite.getMonth() + 1).padStart(2, '0');
  const day = String(limite.getDate()).padStart(2, '0');
  const limiteStr = `${y}-${m}-${day}`;

  return fechaTermino <= limiteStr ? 'Por vencer' : 'Activo';
}

function getAnexoRepo() {
  return AppDataSource.getRepository(AnexoContratoSchema);
}

function getContratoRepo() {
  return AppDataSource.getRepository("ContratoTrabajador");
}

function esAdministrador(req) {
  return req.user?.tipo_usuario === "administrador";
}

/***
 * Lista los anexos de un contrato laboral, del mas reciente al mas antiguo.
 */
export const getAnexosByContrato = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        status: "error",
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id_contrato } = req.params;
    if (isNaN(Number(id_contrato))) {
      return res.status(400).json({ status: "error", message: "id_contrato debe ser numérico" });
    }

    const contrato = await getContratoRepo().findOne({
      where: { id_contrato: Number(id_contrato) },
    });
    if (!contrato) {
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });
    }

    const anexos = await getAnexoRepo().find({
      where: { id_contrato: Number(id_contrato) },
      order: { fecha_anexo: "DESC" },
    });

    return res.status(200).json({ status: "success", data: anexos });
  } catch (error) {
    console.error("Error en getAnexosByContrato (laboral):", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/***
 * Crea un anexo para un contrato laboral (renovacion, cambio de tipo,
 * extension de plazo, cambio de sueldo, etc).
 * Body: fecha_anexo (debe ser hoy), motivo, descripcion_modificacion,
 *   tipo_contrato_nuevo (opcional), fecha_inicio_nueva (opcional),
 *   fecha_termino_nueva (opcional), monto_nuevo (opcional), observaciones (opcional)
 *
 * Efecto secundario: si viene alguno de tipo_contrato_nuevo / fecha_inicio_nueva /
 * fecha_termino_nueva / monto_nuevo, actualiza el contrato con esos valores
 * (es el mecanismo real para modificar esos campos, ya que la edición directa
 * del contrato los bloquea).
 */
export const crearAnexo = async (req, res) => {
  try {
    if (!esAdministrador(req)) {
      return res.status(403).json({
        status: "error",
        message: "No tiene permisos para realizar esta acción",
      });
    }

    const { id_contrato } = req.params;
    if (isNaN(Number(id_contrato))) {
      return res.status(400).json({ status: "error", message: "id_contrato debe ser numérico" });
    }

    const {
      fecha_anexo,
      motivo,
      descripcion_modificacion,
      tipo_contrato_nuevo,
      fecha_inicio_nueva,
      fecha_termino_nueva,
      monto_nuevo,
      observaciones,
      es_anexo_termino, // true = este anexo cierra el contrato (pasa a Inactivo)
    } = req.body;

    if (!fecha_anexo || !motivo || !descripcion_modificacion) {
      return res.status(400).json({
        status: "error",
        message:
          "Los campos fecha_anexo, motivo y descripcion_modificacion son obligatorios",
      });
    }

    // fecha_anexo es la fecha de firma/registro del anexo: nunca puede ser
    // pasada ni futura, solo HOY. Esto además evita la ambigüedad de "¿este
    // anexo se aplica ahora o se aplica el día que indica fecha_anexo?" —
    // como siempre es hoy, no hay duda: se aplica de inmediato al guardar.
    if (fecha_anexo !== hoyLocal()) {
      return res.status(400).json({
        status: "error",
        message: "fecha_anexo debe ser la fecha de hoy.",
      });
    }

    if (tipo_contrato_nuevo !== undefined && tipo_contrato_nuevo !== null && !TIPOS_CONTRATO.includes(tipo_contrato_nuevo)) {
      return res.status(400).json({
        status: "error",
        message: `tipo_contrato_nuevo inválido. Valores permitidos: ${TIPOS_CONTRATO.join(", ")}.`,
      });
    }

    if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== '' && isNaN(Number(monto_nuevo))) {
      return res.status(400).json({ status: "error", message: "monto_nuevo debe ser numérico" });
    }

    if (tipo_contrato_nuevo === 'Plazo Fijo' && !fecha_termino_nueva) {
      return res.status(400).json({
        status: "error",
        message: "Si cambia el tipo a Plazo Fijo debe indicar fecha_termino_nueva.",
      });
    }

    if (tipo_contrato_nuevo === 'Indefinido' && fecha_termino_nueva) {
      return res.status(400).json({
        status: "error",
        message: "Un contrato Indefinido no puede tener fecha_termino_nueva.",
      });
    }

    // Un anexo de término OBLIGA a indicar la fecha real de cierre.
    if (es_anexo_termino && !fecha_termino_nueva) {
      return res.status(400).json({
        status: "error",
        message: "Para inactivar el contrato mediante un anexo de término debe indicar fecha_termino_nueva.",
      });
    }

    const contratoRepo = getContratoRepo();
    const contrato = await contratoRepo.findOne({
      where: { id_contrato: Number(id_contrato) },
    });
    if (!contrato) {
      return res.status(404).json({ status: "error", message: "Contrato no encontrado" });
    }

    if (contrato.estado_contrato === 'Inactivo') {
      return res.status(400).json({
        status: "error",
        message: "El contrato ya está Inactivo, no se pueden agregar más anexos.",
      });
    }

    const anexoRepo = getAnexoRepo();

    // Todo (guardar anexo + aplicar cambios al contrato) va en una sola
    // transacción: o se guarda todo, o no se guarda nada.
    const { anexoGuardado, contratoActualizado } = await AppDataSource.transaction(
      async (transactionalEntityManager) => {
        const nuevoAnexo = anexoRepo.create({
          id_contrato: Number(id_contrato),
          fecha_anexo,
          motivo,
          descripcion_modificacion,
          tipo_contrato_nuevo: tipo_contrato_nuevo || null,
          fecha_inicio_nueva: fecha_inicio_nueva || null,
          fecha_termino_nueva: fecha_termino_nueva || null,
          monto_nuevo: monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== '' ? Number(monto_nuevo) : null,
          observaciones: observaciones || null,
        });

        const anexoGuardado = await transactionalEntityManager.save(AnexoContratoSchema, nuevoAnexo);

        // Aplica al contrato los cambios que haya traído el anexo
        if (tipo_contrato_nuevo) {
          contrato.tipo_contrato = tipo_contrato_nuevo;
        }
        if (fecha_inicio_nueva) {
          contrato.fecha_inicio = fecha_inicio_nueva;
        }
        if (fecha_termino_nueva !== undefined) {
          contrato.fecha_termino = fecha_termino_nueva || null;
        }
        if (tipo_contrato_nuevo === 'Indefinido') {
          contrato.fecha_termino = null;
        }

        // Si el anexo dejó al contrato con fecha_termino pero el tipo sigue
        // siendo Indefinido (porque no vino tipo_contrato_nuevo explícito),
        // es una contradicción: un Indefinido no puede tener fecha de
        // término. Se corrige automáticamente a Plazo Fijo.
        if (contrato.fecha_termino && contrato.tipo_contrato === 'Indefinido') {
          contrato.tipo_contrato = 'Plazo Fijo';
        }

        if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== '') {
          contrato.monto = Number(monto_nuevo);
        }

        // Efecto clave de este anexo: cierra el contrato.
        if (es_anexo_termino) {
          contrato.estado_contrato = 'Inactivo';
        } else {
          // Recalcula el estado en base a la fecha de término vigente
          // (misma regla que el cron), en vez de esperar a medianoche.
          contrato.estado_contrato = calcularEstadoDesdeFechaTermino(contrato.fecha_termino);
        }

        const contratoActualizado = await transactionalEntityManager.save("ContratoTrabajador", contrato);

        return { anexoGuardado, contratoActualizado };
      }
    );

    // Notificar al trabajador si el anexo cerró el contrato.
    if (es_anexo_termino) {
      try {
        await crearNotificacion({
          id_trabajador: contratoActualizado.id_trabajador,
          tipo: "contrato_inactivado",
          titulo: "Tu contrato ha finalizado",
          mensaje: `Tu contrato fue marcado como Inactivo, con término efectivo el ${fecha_termino_nueva}. Motivo: ${motivo}`,
          referencia_tipo: "contrato",
          referencia_id: contratoActualizado.id_contrato,
        });
      } catch (notifError) {
        console.error("Error al notificar cierre de contrato:", notifError);
      }
    }

    return res.status(201).json({
      status: "success",
      message: es_anexo_termino
        ? "Anexo de término creado. El contrato quedó Inactivo."
        : "Anexo creado correctamente",
      data: anexoGuardado,
    });
  } catch (error) {
    console.error("Error en crearAnexo (laboral):", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/***
 * Eliminar un anexo está deshabilitado a propósito: un anexo no es solo un
 * registro informativo, es el mecanismo que aplicó cambios reales al
 * contrato (tipo, fechas, monto o incluso su cierre a Inactivo). Borrarlo
 * dejaría esos cambios sin ningún respaldo en el historial. Si algo quedó
 * mal registrado, se corrige creando OTRO anexo, nunca eliminando el
 * original — igual que un asiento contable.
 *
 * Se deja el endpoint (en vez de sacar la ruta) para responder con un
 * mensaje explícito por si queda algún llamado antiguo desde el front.
 */
export const eliminarAnexo = async (req, res) => {
  return res.status(403).json({
    status: "error",
    message:
      "Los anexos no se pueden eliminar: forman parte del historial del contrato. " +
      "Si hay un error, corrígelo creando un nuevo anexo.",
  });
};