import { AppDataSource } from "../config/configDb.js";
import { AusenciaSchema } from "../entities/ausencia.entity.js";

const repo = AppDataSource.getRepository(AusenciaSchema);

export const crearAusencia = async (req, res) => {
  try {
    const nueva = repo.create(req.body);
    const resultado = await repo.save(nueva);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: "Error al crear ausencia" });
  }
};

export const obtenerAusencias = async (req, res) => {
  try {
    const datos = await repo.find({
      relations: ["trabajador", "justificaciones"],
    });

    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ausencias" });
  }
};

export const obtenerAusenciasPorTrabajador = async (req, res) => {
  try {
    const datos = await repo.find({
      where: {
        trabajador: {
          id_trabajador: Number(req.params.id),
        },
      },
    });

    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al filtrar ausencias" });
  }
};