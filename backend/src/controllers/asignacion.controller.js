// controllers/asignacion.controller.js
import { AppDataSource } from "../config/configDb.js";

const repoProyecto = AppDataSource.getRepository("Proyecto");
const repoAsignado = AppDataSource.getRepository("Asignado");

/**
 * GET /api/asignaciones/mias
 * Devuelve la(s) asignación(es) actual(es) e historial del usuario autenticado.
 *
 * - Supervisor: vive en Proyecto.id_supervisor. "Actual" = proyectos con
 *   estado "activo". "Historial" = proyectos con cualquier otro estado
 *   (ej. "inactivo"), ya que un proyecto no cambia de supervisor al cerrarse.
 * - Trabajador: vive en Asignado (PK = id_trabajador, una sola fila posible).
 *   Solo existe "actual" — el esquema no permite reconstruir historial de
 *   cuadrillas pasadas.
 */
export const getMisAsignaciones = async (req, res) => {
  try {
    const { id_trabajador, tipo_usuario } = req.user;

    if (tipo_usuario === "supervisor") {
      const proyectos = await repoProyecto.find({
        where: { id_supervisor: id_trabajador },
        order: { fecha_creacion: "DESC" },
      });

      const actual = proyectos.filter((p) => p.estado === "activo");
      const historial = proyectos.filter((p) => p.estado !== "activo");

      return res.status(200).json({
        tipo_usuario: "supervisor",
        actual,
        historial,
      });
    }

    if (tipo_usuario === "trabajador") {
      const asignado = await repoAsignado.findOne({
        where: { id_trabajador },
        relations: ["cuadrilla", "cuadrilla.proyecto"],
      });

      if (!asignado) {
        return res.status(200).json({
          tipo_usuario: "trabajador",
          actual: null,
          historial: [],
        });
      }

      return res.status(200).json({
        tipo_usuario: "trabajador",
        actual: {
          id_cuadrilla: asignado.cuadrilla.id_cuadrilla,
          nombre_cuadrilla: asignado.cuadrilla.nombre_cuadrilla,
          cargo_operativo: asignado.cargo_operativo,
          tipo_jornada: asignado.tipo_jornada,
          fecha_asignacion: asignado.fecha_asignacion,
          proyecto: asignado.cuadrilla.proyecto
            ? {
                id_proyecto: asignado.cuadrilla.proyecto.id_proyecto,
                nombre_proyecto: asignado.cuadrilla.proyecto.nombre_proyecto,
                estado: asignado.cuadrilla.proyecto.estado,
                direccion: asignado.cuadrilla.proyecto.direccion,
              }
            : null,
        },
        // No disponible: Asignado solo guarda la asignación vigente (ver nota arriba)
        historial: [],
      });
    }

    return res.status(403).json({ error: "Esta vista es solo para trabajadores y supervisores" });
  } catch (error) {
    console.error("Error en getMisAsignaciones:", error);
    res.status(500).json({ error: "Error al obtener tus asignaciones" });
  }
};