import { AppDataSource } from "../config/configDb.js";
import { AusenciaSchema } from "../entities/ausencia.entity.js";
import { JustificacionAusenciaSchema } from "../entities/justificacion_ausencia.entity.js"; // Asegúrate de importar esto
import { In } from "typeorm";
import { crearNotificacion } from "../services/notificacion.service.js";

const repo = AppDataSource.getRepository(AusenciaSchema);
const repoJustificacion = AppDataSource.getRepository(JustificacionAusenciaSchema);

// ── CREAR AUSENCIA (Flujo normal: El empleado avisa que faltara) ──────────────
// El trabajador entrega el motivo al momento de crearla, así que se guarda de una
// vez una JustificacionAusencia asociada (estado_revision "Pendiente"), para que
// el resto del sistema pueda leer siempre el motivo desde 'ausencia.justificacion.motivo',
// sea cual sea el flujo (anticipado por el trabajador o detectado por el supervisor)
export const crearAusencia = async (req, res) => {
  const { id_cuadrilla, id_trabajador, fecha_inicio, fecha_termino, motivo } = req.body;

  if (!id_cuadrilla || !id_trabajador || !fecha_inicio || !fecha_termino || !motivo) {
    return res.status(400).json({
      error: "Faltan parámetros requeridos (id_cuadrilla, id_trabajador, fecha_inicio, fecha_termino, motivo)",
    });
  }

  try {
    const asignacion = await AppDataSource.getRepository("Asignado").findOne({
      where: { id_trabajador, id_cuadrilla },
    });

    if (!asignacion) {
      return res.status(403).json({ error: "El trabajador no pertenece a la cuadrilla" });
    }

    const resultado = await AppDataSource.transaction(async (transactionalEntityManager) => {
      const nueva = repo.create({
        fecha_inicio,
        fecha_termino,
        estado: "Pendiente", // Nace pendiente de aprobación por el supervisor
        trabajador: { id_trabajador },
        cuadrilla: { id_cuadrilla },
      });
      const ausenciaGuardada = await transactionalEntityManager.save(AusenciaSchema, nueva);

      const justificacion = repoJustificacion.create({
        id_ausencia: ausenciaGuardada.id_ausencia,
        motivo,
        estado_revision: "Pendiente",
        fecha_registro: new Date(),
      });
      await transactionalEntityManager.save(JustificacionAusenciaSchema, justificacion);

      return ausenciaGuardada;
    });

    // Notificar al supervisor del proyecto de esa cuadrilla que hay una
    // nueva ausencia pendiente de revisión.
    try {
      const cuadrillaConProyecto = await AppDataSource.getRepository("Cuadrilla").findOne({
        where: { id_cuadrilla },
        relations: ["proyecto"],
      });

      if (cuadrillaConProyecto?.proyecto?.id_supervisor) {
        await crearNotificacion({
          id_trabajador: cuadrillaConProyecto.proyecto.id_supervisor,
          tipo: "ausencia_pendiente",
          titulo: "Nueva ausencia pendiente",
          mensaje: "Un trabajador registró una ausencia pendiente de revisión",
          referencia_tipo: "ausencia",
          referencia_id: resultado.id_ausencia,
        });
      }
    } catch (notifError) {
      // La notificación nunca debe romper el flujo principal de creación de la ausencia.
      console.error("Error al notificar nueva ausencia:", notifError);
    }

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: "Error al crear ausencia" });
  }
};

// ── CREAR AUSENCIA POR SUPERVISOR (flujo espontaneo) ─────────────────────────
export const crearAusenciaPorSupervisor = async (req, res) => {
  try {
    const { fecha_inicio, fecha_termino, id_trabajador, id_cuadrilla } = req.body;

    // El usuario debe ser supervisor del proyecto al que pertenece la cuadrilla
    const cuadrilla = await AppDataSource.getRepository("Cuadrilla").findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });

    const esSupervisorAutorizado =
      req.user?.tipo_usuario === "supervisor" &&
      cuadrilla?.proyecto?.id_supervisor === req.user?.id_trabajador;

    if (!esSupervisorAutorizado) {
      return res.status(403).json({ error: "No eres supervisor autorizado de esta cuadrilla" });
    }

    // El trabajador afectado debe pertenecer a esa misma cuadrilla
    const verifTrabajador = await AppDataSource.getRepository("Asignado").findOne({
      where: { id_trabajador, id_cuadrilla },
    });

    if (!verifTrabajador) {
      return res.status(400).json({ error: "El trabajador no pertenece a la cuadrilla indicada" });
    }

    const nueva = repo.create({
      fecha_inicio,
      fecha_termino,
      // Nace "Por Justificar" pq el supervisor la detectó, pero es el trabajador quien apela
      estado: "Por Justificar",
      trabajador: { id_trabajador },
      cuadrilla: { id_cuadrilla },
    });

    const resultado = await repo.save(nueva);

    // Notificar al trabajador que se le registró una inasistencia y debe justificarla.
    try {
      await crearNotificacion({
        id_trabajador,
        tipo: "inasistencia_detectada",
        titulo: "Inasistencia registrada",
        mensaje: "Tu supervisor registró una inasistencia a tu nombre. Debes justificarla.",
        referencia_tipo: "ausencia",
        referencia_id: resultado.id_ausencia,
      });
    } catch (notifError) {
      console.error("Error al notificar inasistencia detectada:", notifError);
    }

    res.json(resultado);

  } catch (error) {
    res.status(500).json({ error: "Error al registrar inasistencia" });
  }
};

// ── JUSTIFICAR AUSENCIA ─────────────────────
export const justificarAusencia = async (req, res) => {
  try {
    const { motivo, documento_respaldo } = req.body;
    const id_ausencia = Number(req.params.id);
 
    const ausencia = await repo.findOne({
      where: { id_ausencia },
      relations: ["trabajador", "cuadrilla", "cuadrilla.proyecto"],
    });
 
    if (!ausencia) {
      return res.status(404).json({ error: "Ausencia no encontrada" });
    }
 
    const requiereJustificacion = ausencia.estado === "Por Justificar";
 
    if (!requiereJustificacion) {
      return res.status(400).json({ error: "Esta ausencia no requiere justificación o ya está en proceso" });
    }
 
    if (req.user?.id_trabajador !== ausencia.trabajador?.id_trabajador) {
      return res.status(403).json({ error: "Solo puedes justificar tus propias ausencias" });
    }
 
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const nuevaJustificacion = repoJustificacion.create({
        id_ausencia,
        motivo,
        documento_respaldo,
        estado_revision: "Pendiente",
        fecha_registro: new Date(),
      });
      await transactionalEntityManager.save(JustificacionAusenciaSchema, nuevaJustificacion);
 
      // "Justificada"
      ausencia.estado = "Justificada";
      await transactionalEntityManager.save(AusenciaSchema, ausencia);
    });

    // Notificar al supervisor del proyecto que hay una justificación pendiente de revisar
    try {
      if (ausencia.cuadrilla?.proyecto?.id_supervisor) {
        await crearNotificacion({
          id_trabajador: ausencia.cuadrilla.proyecto.id_supervisor,
          tipo: "ausencia_justificada",
          titulo: "Justificación pendiente de revisión",
          mensaje: "Un trabajador justificó su inasistencia, queda pendiente de revisión",
          referencia_tipo: "ausencia",
          referencia_id: id_ausencia,
        });
      }
    } catch (notifError) {
      console.error("Error al notificar justificación de ausencia:", notifError);
    }
 
    res.json({ message: "Justificación presentada correctamente y pendiente de revisión" });
  } catch (error) {
    res.status(500).json({ error: "Error al justificar ausencia" });
  }
};

// ── OBTENER TODAS LAS AUSENCIAS ────────────────────────────────────────────
export const obtenerAusencias = async (req, res) => {
  try {
    const { id_trabajador, tipo_usuario } = req.user;

    // Administrador: ve todas las ausencias del sistema
    if (tipo_usuario === "administrador") {
      const ausencias = await repo.find({
        relations: ["trabajador", "cuadrilla", "justificacion", "justificacion.revisor"],
      });
      return res.json(ausencias);
    }

    // Supervisor solo ve las ausencias de las cuadrillas de los proyectos que supervisa
    if (tipo_usuario === "supervisor") {
      const proyectos = await AppDataSource.getRepository("Proyecto").find({
        where: { id_supervisor: id_trabajador },
        select: ["id_proyecto"],
      });
      const idProyectos = proyectos.map((p) => p.id_proyecto);
      if (!idProyectos.length) return res.json([]);

      const cuadrillas = await AppDataSource.getRepository("Cuadrilla").find({
        where: { id_proyecto: In(idProyectos) },
        select: ["id_cuadrilla"],
      });
      const idsCuadrillas = cuadrillas.map((c) => c.id_cuadrilla);
      if (!idsCuadrillas.length) return res.json([]);

      const ausencias = await repo.find({
        where: { cuadrilla: { id_cuadrilla: In(idsCuadrillas) } },
        relations: ["trabajador", "cuadrilla", "justificacion", "justificacion.revisor"],
      });
      return res.json(ausencias);
    }

    // Trabajador: ve las ausencias de la cuadrilla que pertenece
    const asignaciones = await AppDataSource.getRepository("Asignado").find({
      where: { id_trabajador },
    });
    const idsCuadrillas = asignaciones.map((a) => a.id_cuadrilla);
    if (!idsCuadrillas.length) return res.json([]);

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
    const ausencia = await repo.findOne({
      where: { id_ausencia: Number(req.params.id) },
      relations: ["justificacion"],
    });
 
    if (!ausencia) return res.status(404).json({ error: 'Ausencia no encontrada' });
 
    const esAdministrador = req.user?.tipo_usuario === 'administrador';
 
    if (!esAdministrador && ausencia.estado !== 'Pendiente' && ausencia.estado !== 'Por Justificar') {
      return res.status(400).json({ error: 'No se puede eliminar una ausencia ya procesada o cerrada' });
    }
 
    // Se borra primero la justificación asociada por el tema de la FK 
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      if (ausencia.justificacion) {
        await transactionalEntityManager.remove(JustificacionAusenciaSchema, ausencia.justificacion);
      }
      await transactionalEntityManager.remove(AusenciaSchema, ausencia);
    });
 
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

// ── REVISAR O EVALUAR AUSENCIA  ────────────────────────────────────
export const revisarAusencia = async (req, res) => {
  try {
    const { estado_aprobacion, comentario_revision } = req.body; // 'Aprobado' o 'Rechazado'
    const id_ausencia = Number(req.params.id);
 
    if (isNaN(id_ausencia)) {
      return res.status(400).json({ error: "id de ausencia inválido" });
    }
 
    const ausencia = await repo.findOne({
      where: { id_ausencia },
      relations: ["trabajador", "cuadrilla", "cuadrilla.proyecto", "justificacion"],
    });
 
    if (!ausencia) {
      return res.status(404).json({ error: "Ausencia no encontrada" });
    }

    const permiteRevision = ausencia.estado === "Pendiente" || ausencia.estado === "Justificada";
 
    if (!permiteRevision) {
      return res.status(400).json({ error: "La ausencia no está en un estado válido para revisión" });
    }
 
    if (req.user?.id_trabajador === ausencia.trabajador?.id_trabajador) {
      return res.status(403).json({ error: "No puedes revisar tu propia solicitud de ausencia" });
    }
 
    const esRevisorValido =
      req.user?.tipo_usuario === "administrador" ||
      (req.user?.tipo_usuario === "supervisor" &&
        ausencia.cuadrilla?.proyecto?.id_supervisor === req.user?.id_trabajador);
 
    if (!esRevisorValido) {
      return res.status(403).json({
        error: "No tienes permisos de supervisor en el proyecto de esta ausencia para poder revisarla.",
      });
    }
 
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      if (ausencia.justificacion) {
        ausencia.justificacion.estado_revision = estado_aprobacion;
        ausencia.justificacion.comentario_revision = comentario_revision;
        ausencia.justificacion.fecha_revision = new Date();
        ausencia.justificacion.revisor = { id_trabajador: req.user.id_trabajador };
 
        await transactionalEntityManager.save(JustificacionAusenciaSchema, ausencia.justificacion);
      }
 
      // Estado final
      ausencia.estado = estado_aprobacion;
      await transactionalEntityManager.save(AusenciaSchema, ausencia);
    });

    // Notificar al trabajador
    try {
      await crearNotificacion({
        id_trabajador: ausencia.trabajador.id_trabajador,
        tipo: estado_aprobacion === "Aprobado" ? "ausencia_aprobada" : "ausencia_rechazada",
        titulo: estado_aprobacion === "Aprobado" ? "Ausencia aprobada" : "Ausencia rechazada",
        mensaje:
          estado_aprobacion === "Aprobado"
            ? "Tu ausencia fue aprobada"
            : `Tu ausencia fue rechazada${comentario_revision ? ": " + comentario_revision : ""}`,
        referencia_tipo: "ausencia",
        referencia_id: id_ausencia,
      });
    } catch (notifError) {
      console.error("Error al notificar revisión de ausencia:", notifError);
    }
 
    res.json({ message: `Ausencia revisada con éxito. Resultado: ${estado_aprobacion}` });
 
  } catch (error) {
    res.status(500).json({ error: "Error al revisar la ausencia" });
  }
};