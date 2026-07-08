// validations/contratos.validation.js
import { AppDataSource } from "../config/configDb.js";

export const TIPOS_CONTRATO   = ['Indefinido', 'Plazo Fijo'];
export const ESTADOS_CONTRATO = ['Activo', 'Inactivo', 'Por vencer'];
export const ESTADOS_ELIMINABLES = ['Inactivo'];

// Campos que SÍ se pueden editar directamente en un contrato existente.
// Todo lo demás (tipo_contrato, fecha_inicio, fecha_termino, monto,
// estado_contrato) requiere crear un anexo. En particular, para pasar a
// "Inactivo" se exige un anexo de término (es_anexo_termino) que registre
// el motivo y la fecha real de cierre — no se permite apagar el contrato
// con un simple PUT.
const CAMPOS_EDITABLES = ['observaciones'];
const CAMPOS_SOLO_VIA_ANEXO = ['tipo_contrato', 'fecha_inicio', 'fecha_termino', 'monto', 'estado_contrato'];

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function esFechaValida(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return !isNaN(d.getTime());
}

export async function validarCrearContrato(req, res, next) {
  try {
    const errores = [];
    const { tipo_contrato, estado_contrato, fecha_inicio, fecha_termino, monto, id_trabajador } = req.body;

    if (!tipo_contrato)   errores.push('El campo tipo_contrato es obligatorio.');
    if (!estado_contrato) errores.push('El campo estado_contrato es obligatorio.');
    if (!fecha_inicio)    errores.push('El campo fecha_inicio es obligatorio.');
    if (monto === undefined || monto === null || monto === '') errores.push('El campo monto es obligatorio.');
    if (!id_trabajador)   errores.push('El campo id_trabajador es obligatorio.');

    if (errores.length) {
      return res.status(400).json({ status: 'error', message: errores.join(' ') });
    }

    if (!TIPOS_CONTRATO.includes(tipo_contrato)) {
      errores.push(`tipo_contrato inválido. Valores permitidos: ${TIPOS_CONTRATO.join(', ')}.`);
    }

    if (!ESTADOS_CONTRATO.includes(estado_contrato)) {
      errores.push(`estado_contrato inválido. Valores permitidos: ${ESTADOS_CONTRATO.join(', ')}.`);
    }

    // Esta validación de "no anterior a hoy" SOLO aplica al crear.
    if (!esFechaValida(fecha_inicio)) {
      errores.push('fecha_inicio no es una fecha válida (formato YYYY-MM-DD).');
    } else if (fecha_inicio < hoyLocal()) {
      errores.push('La fecha de inicio no puede ser anterior a hoy.');
    }

    if (monto !== undefined && monto !== null && monto !== '' && Number.isNaN(Number(monto))) {
      errores.push('monto debe ser numérico.');
    }

    if (tipo_contrato === 'Indefinido' && fecha_termino) {
      errores.push('Un contrato Indefinido no puede tener fecha de término.');
    }

    if (tipo_contrato === 'Plazo Fijo') {
      if (!fecha_termino) {
        errores.push('Un contrato de Plazo Fijo debe tener fecha de término.');
      } else if (!esFechaValida(fecha_termino)) {
        errores.push('fecha_termino no es una fecha válida (formato YYYY-MM-DD).');
      } else if (esFechaValida(fecha_inicio) && fecha_termino <= fecha_inicio) {
        errores.push('La fecha de término debe ser posterior a la fecha de inicio.');
      }
    }

    if (errores.length) {
      return res.status(400).json({ status: 'error', message: errores.join(' ') });
    }

    // Regla de negocio: un trabajador solo puede tener UN contrato vigente
    // a la vez (Activo o Por vencer); puede tener varios Inactivos, que
    // funcionan como historial. Si ya tiene uno vigente, no se puede crear
    // otro sin antes cerrarlo (inactivar vía anexo de término).
    if (estado_contrato !== 'Inactivo') {
      const repo = AppDataSource.getRepository('ContratoTrabajador');
      const contratoVigente = await repo.findOne({
        where: [
          { id_trabajador: Number(id_trabajador), estado_contrato: 'Activo' },
          { id_trabajador: Number(id_trabajador), estado_contrato: 'Por vencer' },
        ],
      });

      if (contratoVigente) {
        return res.status(409).json({
          status: 'error',
          message: `Este trabajador ya tiene un contrato vigente (estado "${contratoVigente.estado_contrato}").`,
        });
      }
    }

    if (tipo_contrato === 'Indefinido') req.body.fecha_termino = null;

    if (monto !== undefined && monto !== null && monto !== '') {
      req.body.monto = Number(monto);
    }

    next();
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Actualizar contrato: SOLO permite estado_contrato y observaciones.
 * Si el frontend manda tipo_contrato, fecha_inicio, fecha_termino o monto
 * (aunque sea el mismo valor que ya tenía), avisamos que esos cambios
 * deben hacerse mediante un anexo, no aquí.
 *
 * IMPORTANTE: comparamos contra req.contratoActual (adjuntado por un loader,
 * igual que cargarContrato en las rutas de DELETE) para no explotar si el
 * frontend simplemente reenvía los mismos valores que ya tenía el contrato.
 */
export function validarActualizarContrato(req, res, next) {
  const errores = [];
  const contratoActual = req.contratoActual; // ver nota en las rutas más abajo

  for (const campo of CAMPOS_SOLO_VIA_ANEXO) {
    if (req.body[campo] === undefined) continue;

    const valorNuevo = req.body[campo];
    const valorActual = contratoActual ? contratoActual[campo] : undefined;

    // Si es el mismo valor que ya tenía, lo ignoramos silenciosamente
    // (evita que el form, al reenviar todo el objeto, rompa la edición).
    const sonIguales =
      contratoActual &&
      (valorNuevo === valorActual ||
        (valorNuevo == null && valorActual == null) ||
        String(valorNuevo) === String(valorActual));

    if (sonIguales) {
      delete req.body[campo];
      continue;
    }

    errores.push(
      campo === 'estado_contrato'
        ? 'No se puede modificar "estado_contrato" desde la edición directa. Para inactivar el contrato debes crear un anexo de término (es_anexo_termino).'
        : `No se puede modificar "${campo}" desde la edición directa. Para cambiar tipo de contrato, fechas o monto debes crear un anexo.`
    );
  }

  if (errores.length) {
    return res.status(400).json({ status: 'error', message: errores.join(' ') });
  }

  if (errores.length) {
    return res.status(400).json({ status: 'error', message: errores.join(' ') });
  }

  // Solo dejamos pasar los campos editables + cualquier campo interno que ya
  // hayamos limpiado arriba.
  const bodyLimpio = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (req.body[campo] !== undefined) bodyLimpio[campo] = req.body[campo];
  }
  req.body = bodyLimpio;

  next();
}

/**
 * Crear anexo: bloquea la operación si el contrato asociado está Inactivo.
 * Se usa en la ruta POST /api/contratos/:id_contrato/anexos, antes del
 * controlador de creación de anexo.
 */
export async function validarCrearAnexo(req, res, next) {
  try {
    const idContrato = parseInt(req.params.id_contrato);

    if (Number.isNaN(idContrato)) {
      return res.status(400).json({ status: 'error', message: 'id de contrato inválido.' });
    }

    const repo = AppDataSource.getRepository('ContratoTrabajador');
    const contrato = await repo.findOne({ where: { id_contrato: idContrato } });

    if (!contrato) {
      return res.status(404).json({ status: 'error', message: 'Contrato no encontrado.' });
    }

    if (contrato.estado_contrato === 'Inactivo') {
      return res.status(400).json({
        status: 'error',
        message: 'No se pueden agregar anexos a un contrato Inactivo.',
      });
    }

    // Lo dejamos disponible por si el controlador lo necesita, evitando
    // otra consulta a la BD.
    req.contratoActual = contrato;
    next();
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

export function validarEliminarContrato(req, res, next) {
  const contrato = req.contrato;

  if (!contrato) {
    return res.status(404).json({ status: 'error', message: 'Contrato no encontrado.' });
  }

  if (!ESTADOS_ELIMINABLES.includes(contrato.estado_contrato)) {
    return res.status(400).json({
      status: 'error',
      message: `Solo se pueden eliminar contratos con estado "Inactivo". Estado actual: "${contrato.estado_contrato}".`,
    });
  }

  next();
}