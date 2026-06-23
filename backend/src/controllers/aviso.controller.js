// controllers/aviso.controller.js
import { AppDataSource } from "../config/configDb.js";

const PRIORIDADES_VALIDAS = ["baja", "normal", "alta", "urgente"];

function getAvisoRepo()     { return AppDataSource.getRepository("Aviso"); }
function getTrabajadorRepo(){ return AppDataSource.getRepository("Trabajador"); }
function getEtiquetaRepo()  { return AppDataSource.getRepository("Etiqueta"); }

async function getUsuarioActual(idTrabajador) {
  return getTrabajadorRepo().findOne({
    where: { id_trabajador: Number(idTrabajador) },
    relations: ["etiqueta"],
  });
}

function limpiarAviso(aviso) {
  if (!aviso) return aviso;
  const { autor, ...resto } = aviso;
  if (!autor) return resto;
  const { hashed_pass, ...autorSinPassword } = autor;
  return { ...resto, autor: autorSinPassword };
}

// ── GET /api/avisos/mi-unidad ─────────────────────────────────────────────────
// Trabajador y Supervisor: solo ven avisos de su etiqueta
export async function getAvisosMiUnidad(req, res) {
  try {
    const trabajador = await getUsuarioActual(req.user.id_trabajador);
    if (!trabajador)
      return res.status(404).json({ status: "error", message: "Usuario no encontrado" });

    if (!trabajador.id_etiqueta)
      return res.json({ status: "success", unidad: null, data: [] });

    const avisos = await getAvisoRepo().find({
      where: { id_etiqueta: trabajador.id_etiqueta },
      relations: ["autor", "etiqueta"],
      order: { fecha_publicacion: "DESC" },
    });

    res.json({
      status: "success",
      unidad: trabajador.etiqueta ?? null,
      data: avisos.map(limpiarAviso),
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// ── GET /api/avisos/todas ─────────────────────────────────────────────────────
// Solo Administrador: ve todos los avisos de todas las cuadrillas
export async function getTodosLosAvisos(req, res) {
  try {
    const avisos = await getAvisoRepo().find({
      relations: ["autor", "etiqueta"],
      order: { fecha_publicacion: "DESC" },
    });
    res.json({ status: "success", data: avisos.map(limpiarAviso) });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// ── GET /api/avisos/etiquetas ─────────────────────────────────────────────────
// Solo Administrador: lista de etiquetas para el selector al publicar
export async function getEtiquetas(req, res) {
  try {
    const etiquetas = await getEtiquetaRepo().find({ order: { nombre_etiqueta: "ASC" } });
    res.json({ status: "success", data: etiquetas });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// ── POST /api/avisos ──────────────────────────────────────────────────────────
// Supervisor: publica en su propia cuadrilla
// Administrador: puede elegir cualquier etiqueta (id_etiqueta en body)
export async function crearAviso(req, res) {
  try {
    const { titulo, contenido, prioridad = "normal", id_etiqueta } = req.body;

    if (!titulo || !contenido)
      return res.status(400).json({ status: "error", message: "titulo y contenido son obligatorios." });

    if (!PRIORIDADES_VALIDAS.includes(String(prioridad).toLowerCase()))
      return res.status(400).json({
        status: "error",
        message: `Prioridad inválida. Valores: ${PRIORIDADES_VALIDAS.join(", ")}`,
      });

    const autor = await getUsuarioActual(req.user.id_trabajador);
    if (!autor)
      return res.status(404).json({ status: "error", message: "Usuario no encontrado" });

    const esAdmin = req.user.tipo_usuario === "administrador";

    // Admin puede elegir cualquier etiqueta; supervisor usa la suya
    const etiquetaDestino = esAdmin
      ? Number(id_etiqueta || autor.id_etiqueta)
      : Number(autor.id_etiqueta);

    if (!etiquetaDestino)
      return res.status(400).json({
        status: "error",
        message: "Debes tener una etiqueta asignada o indicar id_etiqueta.",
      });

    // Supervisor no puede publicar en otra cuadrilla
    if (!esAdmin && id_etiqueta && Number(id_etiqueta) !== etiquetaDestino)
      return res.status(403).json({
        status: "error",
        message: "No puedes publicar avisos en otra unidad organizacional.",
      });

    const etiqueta = await getEtiquetaRepo().findOneBy({ id_etiqueta: etiquetaDestino });
    if (!etiqueta)
      return res.status(404).json({ status: "error", message: "Etiqueta no encontrada." });

    const aviso = getAvisoRepo().create({
      publicado_por: autor.id_trabajador,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      prioridad: String(prioridad).toLowerCase(),
      id_etiqueta: etiquetaDestino,
    });

    const guardado = await getAvisoRepo().save(aviso);
    const completo = await getAvisoRepo().findOne({
      where: { id_aviso: guardado.id_aviso },
      relations: ["autor", "etiqueta"],
    });

    res.status(201).json({ status: "success", data: limpiarAviso(completo) });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}

// ── DELETE /api/avisos/:id ────────────────────────────────────────────────────
// Solo Administrador
export async function eliminarAviso(req, res) {
  try {
    const repo   = getAvisoRepo();
    const aviso  = await repo.findOneBy({ id_aviso: Number(req.params.id) });

    if (!aviso)
      return res.status(404).json({ status: "error", message: "Aviso no encontrado." });

    await repo.remove(aviso);
    res.json({ status: "success", message: "Aviso eliminado correctamente." });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
}