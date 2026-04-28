"use strict";
import { AppDataSource } from "../config/configDb.js";

export async function seedRoles() {
  try {
    const rolRepo = AppDataSource.getRepository("Rol");

    // Verificar si ya existen roles
    const rolesExistentes = await rolRepo.count();
    if (rolesExistentes > 0) {
      console.log("Los roles ya existen en la base de datos. Saltando seed de roles.");
      return;
    }

    // Crear roles de prueba
    const roles = [
      {
        nombre_rol: "Admin",
        descripcion: "Administrador del sistema con acceso completo",
      },
      {
        nombre_rol: "Empleado",
        descripcion: "Empleado estándar de la empresa",
      },
      {
        nombre_rol: "Supervisor",
        descripcion: "Supervisor de equipo y proyectos",
      },
    ];

    // Insertar roles
    const rolesGuardados = await rolRepo.save(roles);
    console.log(`✓ ${rolesGuardados.length} roles insertados correctamente`);

    rolesGuardados.forEach((rol) => {
      console.log(`  - Rol ID: ${rol.id_rol} - ${rol.nombre_rol}`);
    });
  } catch (error) {
    console.error("Error al hacer seed de roles:", error);
  }
}
