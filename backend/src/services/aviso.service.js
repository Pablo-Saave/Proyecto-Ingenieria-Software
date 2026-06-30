// services/aviso.service.js
import { IsNull } from "typeorm";
import { AppDataSource } from "../config/configDb.js";

const avisoRepository      = AppDataSource.getRepository("Aviso");
const trabajadorRepository = AppDataSource.getRepository("Trabajador");
const cuadrillaRepository  = AppDataSource.getRepository("Cuadrilla");
const asignadoRepository   = AppDataSource.getRepository("Asignado");

// ─── Queries internas ──────────────────────────────────────────────────────────

const getAsignacionActiva = (id_trabajador) =>
  asignadoRepository.findOne({
    where: { id_trabajador, fecha_retiro: IsNull() },
    relations: ["cuadrilla"],
  });

const supervisorPerteneceACuadrilla = (id_trabajador, id_cuadrilla) =>
  asignadoRepository.findOne({
    where: { id_trabajador, id_cuadrilla: Number(id_cuadrilla), fecha_retiro: IsNull() },
  });

const getCuadrillaOperativa = async (id_cuadrilla) => {
  const cuadrilla = await cuadrillaRepository.findOne({
    where: { id_cuadrilla: Number(id_cuadrilla) },
    relations: ["proyecto"],
  });

  if (!cuadrilla)                          throw { status: 404, message: "Cuadrilla no encontrada" };
  if (cuadrilla.proyecto.estado !== "activo") throw { status: 409, message: "El proyecto no está activo" };
  if (cuadrilla.estado !== "activa")       throw { status: 409, message: "La cuadrilla no está activa" };

  return cuadrilla;
};

const assertSupervisorEnCuadrilla = async (id_trabajador, id_cuadrilla) => {
  const pertenece = await supervisorPerteneceACuadrilla(id_trabajador, id_cuadrilla);
  if (!pertenece) throw { status: 403, message: "No pertenece a esta cuadrilla" };
};

// ─── Servicios públicos ────────────────────────────────────────────────────────

export const listarCuadrillas = () =>
  cuadrillaRepository.find({ order: { nombre_cuadrilla: "ASC" } });

export const listarTodosLosAvisos = () =>
  avisoRepository.find({ relations: ["cuadrilla"], order: { fecha_publicacion: "DESC" } });

export const listarAvisosMiUnidad = async (id_trabajador) => {
  const asignacion = await getAsignacionActiva(id_trabajador);
  if (!asignacion) return { unidad: null, avisos: [] };

  const avisos = await avisoRepository.find({
    where: { id_cuadrilla: asignacion.id_cuadrilla },
    relations: ["cuadrilla"],
    order: { fecha_publicacion: "DESC" },
  });

  return { unidad: asignacion.cuadrilla, avisos };
};

export const listarAvisosDeCuadrilla = async ({ id_cuadrilla, id_trabajador, tipo_usuario, page, limit }) => {
  const cuadrilla = await cuadrillaRepository.findOne({ where: { id_cuadrilla: Number(id_cuadrilla) } });
  if (!cuadrilla) throw { status: 404, message: "Cuadrilla no encontrada" };

  if (tipo_usuario !== "administrador") {
    await assertSupervisorEnCuadrilla(id_trabajador, id_cuadrilla);
  }

  const [avisos, total] = await avisoRepository.findAndCount({
    where: { id_cuadrilla: Number(id_cuadrilla) },
    order: { fecha_publicacion: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { avisos, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const crearAviso = async ({ id_cuadrilla, titulo, contenido, prioridad, id_solicitante, tipo_usuario }) => {
  // Resolver cuadrilla del supervisor si no viene explícita
  if (!id_cuadrilla && tipo_usuario === "supervisor") {
    const asignacion = await getAsignacionActiva(id_solicitante);
    if (!asignacion) throw { status: 404, message: "No tiene una cuadrilla activa asignada" };
    id_cuadrilla = asignacion.id_cuadrilla;
  }

  if (!id_cuadrilla) throw { status: 400, message: "id_cuadrilla es obligatorio" };

  const cuadrilla = await getCuadrillaOperativa(id_cuadrilla);

  if (tipo_usuario === "supervisor") {
    await assertSupervisorEnCuadrilla(id_solicitante, id_cuadrilla);
  }

  const autor = await trabajadorRepository.findOne({ where: { id_trabajador: id_solicitante } });
  if (!autor) throw { status: 404, message: "Trabajador (autor) no encontrado" };

  const nuevoAviso = avisoRepository.create({
    id_cuadrilla: Number(id_cuadrilla),
    titulo,
    contenido,
    prioridad: prioridad || "normal",
    id_autor: id_solicitante,
    nombre_autor: `${autor.nombres} ${autor.apellidos}`,
  });

  await avisoRepository.save(nuevoAviso);

  return { ...nuevoAviso, cuadrilla };
};

export const editarAviso = async ({ id_aviso, titulo, contenido, prioridad, id_solicitante }) => {
  const aviso = await avisoRepository.findOne({
    where: { id_aviso: Number(id_aviso) },
    relations: ["cuadrilla", "cuadrilla.proyecto"],
  });
  if (!aviso) throw { status: 404, message: "Aviso no encontrado" };

  if (aviso.id_autor !== id_solicitante)
    throw { status: 403, message: "No tiene permisos para editar este aviso" };

  await getCuadrillaOperativa(aviso.id_cuadrilla);

  if (titulo    !== undefined) aviso.titulo    = titulo;
  if (contenido !== undefined) aviso.contenido = contenido;
  if (prioridad !== undefined) aviso.prioridad = prioridad;

  await avisoRepository.save(aviso);

  return aviso;
};

export const eliminarAviso = async ({ id_aviso, id_solicitante, tipo_usuario }) => {
  const aviso = await avisoRepository.findOne({
    where: { id_aviso: Number(id_aviso) },
    relations: ["cuadrilla", "cuadrilla.proyecto"],
  });
  if (!aviso) throw { status: 404, message: "Aviso no encontrado" };

  await getCuadrillaOperativa(aviso.id_cuadrilla);

  if (tipo_usuario === "supervisor") {
    await assertSupervisorEnCuadrilla(id_solicitante, aviso.cuadrilla.id_cuadrilla);

    if (aviso.id_autor !== id_solicitante)
      throw { status: 403, message: "Un supervisor solo puede eliminar sus propios avisos" };
  }

  await avisoRepository.remove(aviso);
};