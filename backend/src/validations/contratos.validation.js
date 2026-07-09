import { AppDataSource } from "../config/configDb.js";

export const TIPOS_CONTRATO   = ['Indefinido', 'Plazo Fijo'];
export const ESTADOS_CONTRATO = ['Activo', 'Inactivo', 'Por vencer'];
export const ESTADOS_ELIMINABLES = ['Inactivo'];

// Umbral (en días) para que el cron marque un contrato como "Por vencer".
// Usado también como referencia por el frontend para mostrar el badge.
export const DIAS_UMBRAL_POR_VENCER = 30;


const CAMPOS_EDITABLES = ['observaciones'];
const CAMPOS_SOLO_VIA_ANEXO = ['tipo_contrato', 'fecha_inicio', 'fecha_termino', 'monto', 'estado_contrato'];

function hoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hoyLocalDesde(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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

    // Si el contrato nace ya dentro del umbral de "por vencer" (un
    // Plazo Fijo de pocos días), corregimos el estado aquí mismo en vez de
    // esperar a que el cron corra en la próxima medianoche.
    if (
      req.body.estado_contrato !== 'Inactivo' &&
      tipo_contrato === 'Plazo Fijo' &&
      req.body.fecha_termino
    ) {
      const limite = new Date();
      limite.setDate(limite.getDate() + DIAS_UMBRAL_POR_VENCER);
      const limiteStr = hoyLocalDesde(limite);

      if (req.body.fecha_termino <= limiteStr) {
        req.body.estado_contrato = 'Por vencer';
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

export function validarActualizarContrato(req, res, next) {
  const errores = [];
  const contratoActual = req.contratoActual; // ver nota en las rutas más abajo

  // Un contrato Inactivo es historial cerrado: se bloquea CUALQUIER edición,
  // incluidas las observaciones.
  if (contratoActual && contratoActual.estado_contrato === 'Inactivo') {
    return res.status(400).json({
      status: 'error',
      message: 'No se puede modificar un contrato Inactivo.',
    });
  }

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

  // Solo dejamos pasar los campos editables + cualquier campo interno que ya
  // hayamos limpiado arriba.
  const bodyLimpio = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (req.body[campo] !== undefined) bodyLimpio[campo] = req.body[campo];
  }
  req.body = bodyLimpio;

  next();
}


//Crear anexo: bloquea la operación si el contrato asociado está Inactivo.
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

export function validarBodyAnexoContrato(body) {
  const errores = [];
  const {
    fecha_anexo,
    motivo,
    descripcion_modificacion,
    tipo_contrato_nuevo,
    fecha_termino_nueva,
    monto_nuevo,
    es_anexo_termino,
  } = body;

  if (!fecha_anexo || !motivo || !descripcion_modificacion) {
    errores.push('Los campos fecha_anexo, motivo y descripcion_modificacion son obligatorios');
    return errores;
  }

  if (fecha_anexo !== hoyLocal()) errores.push('fecha_anexo debe ser la fecha de hoy.');

  if (tipo_contrato_nuevo !== undefined && tipo_contrato_nuevo !== null && !TIPOS_CONTRATO.includes(tipo_contrato_nuevo)) {
    errores.push(`tipo_contrato_nuevo invalido. Valores permitidos: ${TIPOS_CONTRATO.join(', ')}.`);
  }

  if (monto_nuevo !== undefined && monto_nuevo !== null && monto_nuevo !== '' && Number.isNaN(Number(monto_nuevo))) {
    errores.push('monto_nuevo debe ser numerico');
  }

  if (tipo_contrato_nuevo === 'Plazo Fijo' && !fecha_termino_nueva) {
    errores.push('Si cambia el tipo a Plazo Fijo debe indicar fecha_termino_nueva.');
  }

  if (tipo_contrato_nuevo === 'Indefinido' && fecha_termino_nueva) {
    errores.push('Un contrato Indefinido no puede tener fecha_termino_nueva.');
  }

  if (es_anexo_termino && !fecha_termino_nueva) {
    errores.push('Para inactivar el contrato mediante un anexo de termino debe indicar fecha_termino_nueva.');
  }

  return errores;
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
