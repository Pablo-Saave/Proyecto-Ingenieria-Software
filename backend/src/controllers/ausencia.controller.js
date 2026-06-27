import { AppDataSource } from "../config/configDb.js";
import { AusenciaSchema } from "../entities/ausencia.entity.js";

const repo = AppDataSource.getRepository(AusenciaSchema);

// ── CREAR AUSENCIA (flujo normal) ────────────────────────────────────────────
export const crearAusencia = async (req, res) => {
  try {
    const nueva = repo.create({
      fecha_inicio: req.body.fecha_inicio,
      fecha_termino: req.body.fecha_termino,
      motivo: req.body.motivo,
      estado: "Pendiente",
      comentario_revision: null,
      fecha_revision: null,
      trabajador: { id_trabajador: req.body.id_trabajador },
    });

    const resultado = await repo.save(nueva);
    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: "Error al crear ausencia" });
  }
};

// ── CREAR AUSENCIA POR SUPERVISOR (flujo espontáneo) ─────────────────────────
export const crearAusenciaPorSupervisor = async (req, res) => {
  try {
    const { fecha_inicio, fecha_termino, motivo, id_trabajador } = req.body;

    const nueva = repo.create({
      fecha_inicio,
      fecha_termino,
      motivo: motivo || "Inasistencia no avisada — pendiente de justificación",
      estado: "Por Justificar",
      comentario_revision: null,
      fecha_revision: null,
      trabajador: { id_trabajador },
    });

    const resultado = await repo.save(nueva);
    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: "Error al registrar inasistencia" });
  }
};

// ── JUSTIFICAR AUSENCIA ───────────────────────────────────────────────────────
export const justificarAusencia = async (req, res) => {
  try {
    const ausencia = await repo.findOne({
      where: { id_ausencia: Number(req.params.id) },
      relations: ["trabajador"],
    });

    if (!ausencia) {
      return res.status(404).json({ error: "Ausencia no encontrada" });
    }

    if (ausencia.estado !== "Por Justificar") {
      return res.status(400).json({ error: "Esta ausencia no requiere justificación" });
    }

    const idTrabajadorAusencia = ausencia.trabajador?.id_trabajador;
    if (req.user?.id_trabajador !== idTrabajadorAusencia) {
      return res.status(403).json({ error: "Solo puedes justificar tus propias ausencias" });
    }

    ausencia.motivo = req.body.motivo;
    ausencia.estado = "Pendiente";

    const resultado = await repo.save(ausencia);
    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: "Error al justificar ausencia" });
  }
};

// ── OBTENER TODAS LAS AUSENCIAS ──────────────────────────────────────────────
export const obtenerAusencias = async (req, res) => {
  try {
    const datos = await repo.find({ relations: ["trabajador", "revisor"] });
    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ausencias" });
  }
};

// ── ELIMINAR AUSENCIA ─────────────────────────────────────────────────────────
export const eliminarAusencia = async (req, res) => {
  try {
    const ausencia = await repo.findOne({ where: { id_ausencia: Number(req.params.id) } });

    if (!ausencia) {
      return res.status(404).json({ error: 'Ausencia no encontrada' });
    }

    if (ausencia.estado !== 'Pendiente') {
      return res.status(400).json({ error: 'Solo se pueden eliminar ausencias pendientes' });
    }

    await repo.remove(ausencia);
    res.json({ message: 'Ausencia eliminada correctamente' });

  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ausencia' });
  }
};

// ── OBTENER AUSENCIAS POR TRABAJADOR ─────────────────────────────────────────
export const obtenerAusenciasPorTrabajador = async (req, res) => {
  try {
    const datos = await repo.find({
      where: { trabajador: { id_trabajador: Number(req.params.id) } },
      relations: ["trabajador", "revisor"],
    });
    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al filtrar ausencias" });
  }
};

// ── OBTENER AUSENCIAS PENDIENTES ─────────────────────────────────────────────
export const obtenerAusenciasPendientes = async (req, res) => {
  try {
    const datos = await repo.find({
      where: { estado: "Pendiente" },
      relations: ["trabajador"],
    });
    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ausencias pendientes" });
  }
};

// ── REVISAR AUSENCIA (aprobar / rechazar) ────────────────────────────────────
export const revisarAusencia = async (req, res) => {
  try {
    const ausencia = await repo.findOne({
      where: { id_ausencia: Number(req.params.id) },
      relations: ["trabajador", "revisor"],
    });

    if (!ausencia) {
      return res.status(404).json({ error: "Ausencia no encontrada" });
    }

    if (ausencia.estado !== "Pendiente") {
      return res.status(400).json({ error: "La ausencia ya fue revisada o aún no ha sido justificada" });
    }

    // No se puede revisar la propia ausencia
    const idTrabajadorAusencia = ausencia.trabajador?.id_trabajador;
    if (req.user?.id_trabajador === idTrabajadorAusencia) {
      return res.status(403).json({ error: "No puedes revisar tu propia solicitud de ausencia" });
    }

    // El revisor siempre es quien hace la petición, nunca un valor arbitrario del body
    ausencia.estado = req.body.estado;
    ausencia.comentario_revision = req.body.comentario_revision;
    ausencia.fecha_revision = new Date();
    ausencia.revisor = { id_trabajador: req.user.id_trabajador };

    const resultado = await repo.save(ausencia);
    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: "Error al revisar ausencia" });
  }
};