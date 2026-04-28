import { AppDataSource } from "../config/configDb.js";
import { JustificacionAusenciaSchema } from "../entities/ausencia_justificacion.entity.js";

const repo = AppDataSource.getRepository(JustificacionAusenciaSchema);

export const crearJustificacion = async (req, res) => {
  try {
    const nueva = repo.create(req.body);
    const resultado = await repo.save(nueva);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: "Error al crear justificación" });
  }
};

export const obtenerJustificaciones = async (req, res) => {
  try {
    const datos = await repo.find({
      relations: ["ausencia", "revisor"],
    });

    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener justificaciones" });
  }
};