import { Router } from "express";
import { AppDataSource } from "../config/configDb.js";
import Asignacion from "../entities/asignacion.entity.js";
import Usuario from "../entities/usuario.entity.js";

const router = Router();


// POST para crear asignacion

router.post("/", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Asignacion);
    const userRepo = AppDataSource.getRepository(Usuario);

    const supervisor = await userRepo.findOneBy({
      id: Number(req.body.supervisorId),
    });

    const empleado = await userRepo.findOneBy({
      id: Number(req.body.empleadoId),
    });

    if (!supervisor || !empleado) {
      return res.status(404).json({
        message: "Supervisor o empleado no encontrado",
      });
    }

    const asignacion = repo.create({
      ...req.body,
      supervisor,
      empleado,
    });

    const resultado = await repo.save(asignacion);

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: "Error al crear asignación" });
  }
});


// GET listar todas

router.get("/", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Asignacion);

    const asignaciones = await repo.find({
      relations: ["supervisor", "empleado"],
    });

    res.json(asignaciones);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener asignaciones" });
  }
});


// Listar por supervisor

router.get("/supervisor/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Asignacion);

    const asignaciones = await repo.find({
      where: {
        supervisor: {
          id: Number(req.params.id),
        },
      },
      relations: ["supervisor", "empleado"],
    });

    res.json(asignaciones);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener asignaciones" });
  }
});


// por empleado

router.get("/empleado/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Asignacion);

    const asignaciones = await repo.find({
      where: {
        empleado: {
          id: Number(req.params.id),
        },
      },
      relations: ["supervisor", "empleado"],
    });

    res.json(asignaciones);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener asignaciones" });
  }
});


// actualizar

router.put("/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Asignacion);

    const asignacion = await repo.findOneBy({
      id: Number(req.params.id),
    });

    if (!asignacion) {
      return res.status(404).json({ message: "Asignación no encontrada" });
    }

    repo.merge(asignacion, req.body);

    const actualizada = await repo.save(asignacion);

    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar asignación" });
  }
});

export default router;