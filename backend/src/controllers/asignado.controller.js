import { AppDataSource } from "../config/configDb.js";
import { AsignadoSchema } from "../entities/asignado.entity.js";

const repo = AppDataSource.getRepository(AsignadoSchema);

export const crearAsignado = async (req, res) => {
  try {
    const nuevo = repo.create(req.body);
    const resultado = await repo.save(nuevo);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: "Error al crear asignación" });
  }
};

export const obtenerAsignados = async (req, res) => {
  try {
    const datos = await repo.find({
      relations: ["trabajador"],
    });

    res.json(datos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener asignaciones" });
  }
};

export const obtenerAsignadosPorTrabajador = async (req, res) => {
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
    res.status(500).json({ error: "Error al filtrar asignaciones" });
  }
};