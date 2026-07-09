import { AppDataSource } from "../config/configDb.js";
import { getIO } from "../sockets/socket.js";

const notificacionRepository = AppDataSource.getRepository("Notificacion");

//Crea y envía una notificación en tiempo real al usuario.
export const crearNotificacion = async ({
  id_trabajador,
  tipo,
  titulo,
  mensaje,
  referencia_tipo = null,
  referencia_id = null,
}) => {
  const notificacion = notificacionRepository.create({
    id_trabajador,
    tipo,
    titulo,
    mensaje,
    referencia_tipo,
    referencia_id,
    leido: false,
  });

  await notificacionRepository.save(notificacion);

  // Emitir en tiempo real al usuario si tiene un socket abierto.
  // getIO() puede devolver null si el socket aún no se inicializó 
  const io = getIO();
  if (io) {
    io.to(`trabajador_${id_trabajador}`).emit("notificacion:nueva", notificacion);
  }

  return notificacion;
};

/**
 * Crea la misma notificación para varios trabajadores a la vez (ej: todos los de una cuadrilla).
 */
export const crearNotificacionMasiva = async (id_trabajadores, datosBase) => {
  const resultados = await Promise.all(
    id_trabajadores.map((id_trabajador) =>
      crearNotificacion({ ...datosBase, id_trabajador })
    )
  );
  return resultados;
};

export const listarNotificaciones = async (id_trabajador, { page = 1, limit = 20 } = {}) => {
  const [notificaciones, total] = await notificacionRepository.findAndCount({
    where: { id_trabajador },
    order: { fecha_creacion: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { notificaciones, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const contarNoLeidas = (id_trabajador) =>
  notificacionRepository.count({ where: { id_trabajador, leido: false } });

export const marcarLeida = async (id_notificacion, id_trabajador) => {
  const notificacion = await notificacionRepository.findOne({
    where: { id_notificacion: Number(id_notificacion) },
  });

  if (!notificacion) throw { status: 404, message: "Notificación no encontrada" };
  if (notificacion.id_trabajador !== id_trabajador)
    throw { status: 403, message: "No tiene permisos sobre esta notificación" };

  notificacion.leido = true;
  await notificacionRepository.save(notificacion);
  return notificacion;
};

export const marcarTodasLeidas = async (id_trabajador) => {
  await notificacionRepository.update(
    { id_trabajador, leido: false },
    { leido: true }
  );
};