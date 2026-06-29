import { AppDataSource } from "../config/configDb.js";
import { AusenciaSchema } from "../entities/ausencia.entity.js";
import { JustificacionAusenciaSchema } from "../entities/justificacion_ausencia.entity.js"; // Asegúrate de importar esto
import { In } from "typeorm";

const repo = AppDataSource.getRepository(AusenciaSchema);
const repoJustificacion = AppDataSource.getRepository(JustificacionAusenciaSchema);

// ── CREAR AUSENCIA (Flujo normal: El empleado avisa que faltará) ──────────────
export const crearAusencia = async (req, res) => {
  const { id_cuadrilla, id_trabajador, fecha_inicio, fecha_termino } = req.body;

  if (!id_cuadrilla || !id_trabajador) {
    return res.status(400).json({ error: "Faltan parámetros requeridos (id_cuadrilla, id_trabajador)" });
  }

  try {
    const asignacion = await AppDataSource.getRepository("Asignado").findOne({
      where: { id_trabajador, id_cuadrilla },
    });

    if (!asignacion) {
      return res.status(403).json({ error: "El trabajador no pertenece a la cuadrilla" });
    }

    const nueva = repo.create({
      fecha_inicio,
      fecha_termino,
      estado: "Pendiente", // Al ser avisada con tiempo, nace como pendiente de aprobación
      trabajador: { id_trabajador },
      cuadrilla: { id_cuadrilla },
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
    const { fecha_inicio, fecha_termino, motivo, id_trabajador, id_cuadrilla } = req.body;

    // REGLA: El usuario que ejecuta la acción debe ser supervisor de esa cuadrilla
    const verifSupervisor = await AppDataSource.getRepository("Asignado").findOne({
      where: {
        id_trabajador: req.user?.id_trabajador,
        id_cuadrilla: id_cuadrilla,
        rol: "supervisor",
      },
    });

    if (!verifSupervisor) {
      return res.status(403).json({ error: "No eres supervisor autorizado de esta cuadrilla" });
    }

    // REGLA: El trabajador afectado debe pertenecer a esa misma cuadrilla
    const verifTrabajador = await AppDataSource.getRepository("Asignado").findOne({
      where: { id_trabajador, id_cuadrilla },
    });

    if (!verifTrabajador) {
      return res.status(400).json({ error: "El trabajador no pertenece a la cuadrilla indicada" });
    }

    const nueva = repo.create({
      fecha_inicio,
      fecha_termino,
      motivo: motivo || "Inasistencia no avisada — pendiente de justificación",
      estado: "Por Justificar",
      trabajador: { id_trabajador },
      cuadrilla: { id_cuadrilla },
    });

    const resultado = await repo.save(nueva);
    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: "Error al registrar inasistencia" });
  }
};

// ── JUSTIFICAR AUSENCIA (El empleado sube el comprobante) ─────────────────────
export const justificarAusencia = async (req, res) => {
  try {
    const { motivo, documento_respaldo } = req.body;
    const id_ausencia = Number(req.params.id);

    const ausencia = await repo.findOne({
      where: { id_ausencia },
      relations: ["trabajador", "cuadrilla"],
    });

    if (!ausencia) {
      return res.status(404).json({ error: "Ausencia no encontrada" });
    }

    if (ausencia.estado !== "Por Justificar") {
      return res.status(400).json({ error: "Esta ausencia no requiere justificación o ya está en proceso" });
    }

    if (req.user?.id_trabajador !== ausencia.trabajador?.id_trabajador) {
      return res.status(403).json({ error: "Solo puedes justificar tus propias ausencias" });
    }

    // Usamos una transacción para guardar la justificación y cambiar el estado de la ausencia de golpe
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const nuevaJustificacion = repoJustificacion.create({
        id_ausencia,
        motivo,
        documento_respaldo,
        estado_revision: "Pendiente",
        fecha_registro: new Date(),
      });
      await transactionalEntityManager.save(JustificacionAusenciaSchema, nuevaJustificacion);

      ausencia.estado = "Pendiente"; // Pasa a pendiente de revisión por el supervisor
      await transactionalEntityManager.save(AusenciaSchema, ausencia);
    });

    res.json({ message: "Justificación presentada correctamente y pendiente de revisión" });
  } catch (error) {
    res.status(500).json({ error: "Error al justificar ausencia" });
  }
};

// ── OBTENER TODAS LAS AUSENCIAS (Optimizado a nivel DB) ───────────────────────
export const obtenerAusencias = async (req, res) => {
  try {
    const asignaciones = await AppDataSource.getRepository("Asignado").find({
      where: { id_trabajador: req.user.id_trabajador },
    });

    const idsCuadrillas = asignaciones.map(a => a.id_cuadrilla);
    if (!idsCuadrillas.length) return res.json([]);

    // FILTRADO DIRECTO EN LA BASE DE DATOS (Mucho más rápido)
    const ausencias = await repo.find({
      where: { cuadrilla: { id_cuadrilla: In(idsCuadrillas) } },
      relations: ["trabajador", "cuadrilla", "justificacion", "justificacion.revisor"],
    });

    res.json(ausencias);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ausencias" });
  }
};

// ── ELIMINAR AUSENCIA ─────────────────────────────────────────────────────────
export const eliminarAusencia = async (req, res) => {
  try {
    const ausencia = await repo.findOne({ where: { id_ausencia: Number(req.params.id) } });

    if (!ausence) return res.status(404).json({ error: 'Ausencia no encontrada' });
    if (ausencia.estado !== 'Pendiente' && ausencia.estado !== 'Por Justificar') {
      return res.status(400).json({ error: 'No se puede eliminar una ausencia ya procesada o cerrada' });
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
      relations: ["trabajador", "justificacion", "justificacion.revisor"],
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
      relations: ["trabajador", "justificacion"],
    });
    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ausencias pendientes" });
  }
};

// ── REVISAR AUSENCIA (aprobar / rechazar) ────────────────────────────────────
export const revisarAusencia = async (req, res) => {
  try {
    const { estado_aprobacion, comentario_revision } = req.body; // 'Aprobado' o 'Rechazado'
    const id_ausencia = Number(req.params.id);

    // 1. Traemos la ausencia junto con su cuadrilla y su justificación actual
    const ausencia = await repo.findOne({
      where: { id_ausencia },
      relations: ["trabajador", "cuadrilla", "justificacion"],
    });

    if (!ausencia) {
      return res.status(404).json({ error: "Ausencia no encontrada" });
    }

    if (ausencia.estado !== "Pendiente") {
      return res.status(400).json({ error: "La ausencia no está en estado Pendiente para revisión" });
    }

    // REGLA: El supervisor no puede auto-revisarse si él fue el que faltó
    if (req.user?.id_trabajador === ausencia.trabajador?.id_trabajador) {
      return res.status(403).json({ error: "No puedes revisar tu propia solicitud de ausencia" });
    }

    // REGLA CENTRAL: Quien revisa debe estar asignado a esa cuadrilla Y tener tipo_usuario 'supervisor'
    const asignacionRevisor = await AppDataSource.getRepository("Asignado").findOne({
      where: {
        id_trabajador: req.user?.id_trabajador,
        id_cuadrilla: ausencia.cuadrilla?.id_cuadrilla,
        trabajador: { tipo_usuario: "supervisor" } // <-- Valida el rol guardado en el Trabajador
      },
      relations: ["trabajador"]
    });

    if (!asignacionRevisor) {
      return res.status(403).json({ 
        error: "No tienes permisos de supervisor en la cuadrilla de esta ausencia para poder revisarla." 
      });
    }

    // 2. Guardado atómico con Transacción
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      if (ausencia.justificacion) {
        ausencia.justificacion.estado_revision = estado_aprobacion;
        ausencia.justificacion.comentario_revision = comentario_revision;
        ausencia.justificacion.fecha_revision = new Date();
        ausencia.justificacion.revisor = { id_trabajador: req.user.id_trabajador };
        
        await transactionalEntityManager.save(JustificacionAusenciaSchema, ausencia.justificacion);
      }

      // Sincronizamos el estado en la ausencia madre
      ausencia.estado = estado_aprobacion === "Aprobado" ? "Justificada" : "Injustificada";
      await transactionalEntityManager.save(AusenciaSchema, ausencia);
    });

    res.json({ message: `Ausencia revisada con éxito. Resultado: ${estado_aprobacion}` });

  } catch (error) {
    res.status(500).json({ error: "Error al revisar la ausencia" });
  }
};