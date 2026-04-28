"use strict";
import { AppDataSource } from "../config/configDb.js";

export async function seedTrabajadores() {
  try {
    const trabajadorRepo = AppDataSource.getRepository("Trabajador");
    const rolRepo = AppDataSource.getRepository("Rol");

    // Verificar si ya existen trabajadores
    const trabajadoresExistentes = await trabajadorRepo.count();
    if (trabajadoresExistentes > 0) {
      console.log("Los trabajadores ya existen en la base de datos. Saltando seed de trabajadores.");
      return;
    }

    // Obtener roles existentes
    const roles = await rolRepo.find();
    if (roles.length === 0) {
      console.log("No hay roles en la base de datos. Por favor crea roles primero.");
      return;
    }

    // Crear trabajadores de prueba
    const trabajadores = [
      {
        id_rol: roles[0].id_rol, // Admin
        rut: "12345678-9",
        nombres: "Juan",
        apellidos: "García López",
        sexo: "M",
        telefono: "+56912345678",
        correo: "juan.garcia@empresa.com",
        direccion: "Calle Principal 123, Santiago",
        fecha_nacimiento: new Date("1990-05-15"),
        fecha_ingreso: new Date("2023-01-10"),
        estado_laboral: "Activo",
        experiencia_previa: 5,
      },
      {
        id_rol: roles[1].id_rol, // Empleado
        rut: "98765432-1",
        nombres: "María",
        apellidos: "Rodríguez Silva",
        sexo: "F",
        telefono: "+56987654321",
        correo: "maria.rodriguez@empresa.com",
        direccion: "Avenida Secundaria 456, Santiago",
        fecha_nacimiento: new Date("1992-08-22"),
        fecha_ingreso: new Date("2023-03-15"),
        estado_laboral: "Activo",
        experiencia_previa: 3,
      },
      {
        id_rol: roles[2].id_rol, // Supervisor
        rut: "11111111-1",
        nombres: "Carlos",
        apellidos: "Martínez González",
        sexo: "M",
        telefono: "+56911111111",
        correo: "carlos.martinez@empresa.com",
        direccion: "Pasaje Tercera 789, Santiago",
        fecha_nacimiento: new Date("1988-12-10"),
        fecha_ingreso: new Date("2022-06-01"),
        estado_laboral: "Activo",
        experiencia_previa: 8,
      },
      {
        id_rol: roles[1].id_rol, // Empleado
        rut: "55555555-5",
        nombres: "Laura",
        apellidos: "Sánchez Mendez",
        sexo: "F",
        telefono: "+56955555555",
        correo: "laura.sanchez@empresa.com",
        direccion: "Calle Cuarta 101, Santiago",
        fecha_nacimiento: new Date("1995-03-18"),
        fecha_ingreso: new Date("2024-01-05"),
        estado_laboral: "Activo",
        experiencia_previa: 1,
      },
    ];

    // Insertar trabajadores
    const trabajadoresGuardados = await trabajadorRepo.save(trabajadores);
    console.log(`✓ ${trabajadoresGuardados.length} trabajadores insertados correctamente`);

    trabajadoresGuardados.forEach((trabajador) => {
      console.log(`  - Trabajador ID: ${trabajador.id_trabajador} - ${trabajador.nombres} ${trabajador.apellidos}`);
    });
  } catch (error) {
    console.error("Error al hacer seed de trabajadores:", error);
  }
}
