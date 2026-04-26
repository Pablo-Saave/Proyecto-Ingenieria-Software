import { Router } from "express";
import { AppDataSource } from "../config/configDb.js";
import Usuario from "../entities/usuario.entity.js";
import Asignacion from "../entities/asignacion.entity.js";
import Ausencia from "../entities/ausencia.entity.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userRepo = AppDataSource.getRepository(Usuario);
    const asigRepo = AppDataSource.getRepository(Asignacion);
    const ausRepo = AppDataSource.getRepository(Ausencia);

    // usuarios
    const usuarios = await userRepo.find();

    const empleados = usuarios.filter(u => u.rol === "empleado");
    const supervisores = usuarios.filter(u => u.rol === "supervisor");
    const administradores = usuarios.filter(u => u.rol === "administrador");

    // asignaciones
    const asignacionesActivas = await asigRepo.find({
      where: { estado: "activa" },
    });

    // ausencias
    const ausenciasPendientes = await ausRepo.find({
      where: { estado: "pendiente" },
    });

    // implementacion de errores o alertas
    const alertas = [];

    if (empleados.length === 0) {
      alertas.push("No hay empleados registrados");
    }

    if (ausenciasPendientes.length > 0) {
      alertas.push(`${ausenciasPendientes.length} ausencias pendientes`);
    }

    res.json({
      resumen: {
        totalUsuarios: usuarios.length,
        empleados: empleados.length,
        supervisores: supervisores.length,
        administradores: administradores.length,
      },

      asignaciones: {
        activas: asignacionesActivas.length,
      },

      ausencias: {
        pendientes: ausenciasPendientes.length,
      },

      alertas,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener dashboard" });
  }
});

export default router;