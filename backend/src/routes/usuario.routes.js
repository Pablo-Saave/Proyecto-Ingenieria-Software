import { Router } from "express";
import { AppDataSource } from "../config/configDb.js";
import Usuario from "../entities/usuario.entity.js";

const router = Router();


// POST para generar usuario

router.post("/", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);

    const nuevoUsuario = repo.create(req.body);
    const resultado = await repo.save(nuevoUsuario);

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});


// GET Para listar a todos los usuarios

router.get("/", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);

    const usuarios = await repo.find();

    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});


// GET para obtener un usuario

router.get("/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);

    const usuario = await repo.findOneBy({
      id: Number(req.params.id),   // 👈 IMPORTANTE: convertir a número
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});


//  PUT para actualizar usuario

router.put("/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);

    const usuario = await repo.findOneBy({
      id: Number(req.params.id),
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    repo.merge(usuario, req.body);

    const actualizado = await repo.save(usuario);

    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});


// ELIMINAR USUARIO
router.delete("/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);

    const usuario = await repo.findOneBy({
      id: Number(req.params.id),
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    await repo.remove(usuario);

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

export default router;