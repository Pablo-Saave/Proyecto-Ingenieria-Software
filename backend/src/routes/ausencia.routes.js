import { Router } from "express";
import { AppDataSource } from "../config/configDb.js";
import Ausencia from "../entities/ausencia.entity.js";
import Usuario from "../entities/usuario.entity.js";

const router = Router();


// crear ausencia
router.post("/", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Ausencia);
    const userRepo = AppDataSource.getRepository(Usuario);

    const usuario = await userRepo.findOneBy({
      id: Number(req.body.empleadoId),
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const ausencia = repo.create({
      ...req.body,
      usuario,
    });

    const resultado = await repo.save(ausencia);

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: "Error al crear ausencia" });
  }
});


// GET para listar todas las ausencias
router.get("/", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Ausencia);

    const ausencias = await repo.find({
      relations: ["usuario"],
    });

    res.json(ausencias);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ausencias" });
  }
});


// GET ausencias por usuario
router.get("/usuario/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Ausencia);

    const ausencias = await repo.find({
      where: {
        usuario: {
          id: Number(req.params.id),
        },
      },
      relations: ["usuario"],
    });

    res.json(ausencias);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ausencias del usuario" });
  }
});


//  PUT para modificar el estado a aprobar/rechazar
router.put("/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Ausencia);

    const ausencia = await repo.findOneBy({
      id: Number(req.params.id),
    });

    if (!ausencia) {
      return res.status(404).json({ message: "Ausencia no encontrada" });
    }

    repo.merge(ausencia, req.body);

    const actualizada = await repo.save(ausencia);

    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar ausencia" });
  }
});

export default router;