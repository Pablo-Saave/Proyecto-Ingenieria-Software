import { Router } from "express";
import { AppDataSource } from "../config/configDb.js";
import Usuario from "../entities/user.entity.js";

const router = Router();

// POST /users

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

// ahora GET con /users para listar todos los usuarios

router.get("/", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);
    const users = await repo.find();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// y ahora para mostrar buscando por ID get /users

router.get("/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);

    const user = await repo.findOneBy({
      id: req.params.id,
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// ahora para modificar un usuario especifico (PUT MODIFICA TODO)

router.put("/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);

    const user = await repo.findOneBy({
      id: Number(req.params.id),
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    repo.merge(user, req.body);

    const updatedUser = await repo.save(user);

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// finally para eliminar algun usuario

router.delete("/:id", async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Usuario);

    const user = await repo.findOneBy({
      id: Number(req.params.id),
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    await repo.remove(user);

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});


export default router;