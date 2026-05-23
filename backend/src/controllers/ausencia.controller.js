import { AppDataSource } from "../config/configDb.js";
import { AusenciaSchema } from "../entities/ausencia.entity.js";

const repo = AppDataSource.getRepository(AusenciaSchema);

// CREAR AUSENCIA
export const crearAusencia = async (req, res) => {
  try {
    const nueva = repo.create({
      fecha_inicio: req.body.fecha_inicio,
      fecha_termino: req.body.fecha_termino,
      motivo: req.body.motivo,

      // estado inicial
      estado: "Pendiente",

      comentario_revision: null,
      fecha_revision: null,

      // relación con trabajador
      trabajador: {
        id_trabajador: req.body.id_trabajador,
      },
    });

    const resultado = await repo.save(nueva);

    res.json(resultado);

  } catch (error) {
    res.status(500).json({
      error: "Error al crear ausencia",
    });
  }
};

// OBTENER TODAS LAS AUSENCIAS
export const obtenerAusencias = async (req, res) => {
  try {
    const datos = await repo.find({
      relations: ["trabajador", "revisor"],
    });

    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ausencias" });
  }
};

// OBTENER AUSENCIAS POR TRABAJADOR
export const obtenerAusenciasPorTrabajador = async (req, res) => {
  try {
    const datos = await repo.find({
      where: {
        trabajador: {
          id_trabajador: Number(req.params.id),
        },
      },

      relations: ["trabajador", "revisor"],
    });

    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al filtrar ausencias" });
  }
};

// OBTENER AUSENCIAS PENDIENTES
export const obtenerAusenciasPendientes = async (req, res) => {
  try {
    const datos = await repo.find({
      where: {
        estado: "Pendiente",
      },

      relations: ["trabajador"],
    });

    res.json(datos);
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener ausencias pendientes",
    });
  }
};

// administrar ausencia, es decir aprobar o rechazar
export const revisarAusencia = async (req, res) => {
  try {
    const ausencia = await repo.findOne({
      where: {
        id_ausencia: Number(req.params.id),
      },

      relations: ["trabajador", "revisor"],
    });

    // verificar existencia
    if (!ausencia) {
      return res.status(404).json({
        error: "Ausencia no encontrada",
      });
    }

    // solo pendientes pueden revisarse
    if (ausencia.estado !== "Pendiente") {
      return res.status(400).json({
        error: "La ausencia ya fue revisada",
      });
    }

    // actualizar datos revisión
    ausencia.estado = req.body.estado;

    ausencia.comentario_revision =
      req.body.comentario_revision;

    ausencia.fecha_revision = new Date();

    ausencia.revisor = {
      id_trabajador: req.body.revisado_por,
    };

    const resultado = await repo.save(ausencia);

    res.json(resultado);
  } catch (error) {
    res.status(500).json({
      error: "Error al revisar ausencia",
    });
  }
};