import { EntitySchema } from "typeorm";

// CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
// - Se eliminó la relación con Rol (id_rol / rol)
// - Se agregó campo tipo_usuario: define los permisos del sistema
//   Valores esperados: "trabajador" | "supervisor" | "administrador"
// - Se agregó relación con Etiqueta (id_etiqueta): define la unidad organizacional
//   Solo afecta qué información ve el usuario, no qué puede hacer

export const TrabajadorSchema = new EntitySchema({
  name: "Trabajador",
  tableName: "trabajador",

  columns: {
    id_trabajador: {
      primary: true,
      type: "int",
      generated: true,
    },

    // Reemplaza id_rol. Define las capacidades del usuario en el sistema.
    // "trabajador" | "supervisor" | "administrador"
    tipo_usuario: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    // FK hacia Etiqueta (unidad organizacional). Puede ser null si aún no asignada.
    id_etiqueta: {
      type: "int",
      nullable: true,
    },

    rut: {
      type: "varchar",
      unique: true,
    },

    nombres: {
      type: "varchar",
    },

    apellidos: {
      type: "varchar",
    },

    sexo: {
      type: "varchar",
    },

    telefono: {
      type: "varchar",
    },

    correo: {
      type: "varchar",
      unique: true,
    },

    direccion: {
      type: "varchar",
    },

    fecha_nacimiento: {
      type: "date",
    },

    fecha_ingreso: {
      type: "date",
    },

    estado_laboral: {
      type: "varchar",
    },

    experiencia_previa: {
      type: "int",
      nullable: true,
    },
  },

  relations: {
    // Unidad organizacional. Solo restringe visibilidad, no permisos.
    etiqueta: {
      type: "many-to-one",
      target: "Etiqueta",
      joinColumn: { name: "id_etiqueta" },
      nullable: true,
      inverseSide: "trabajadores",
    },

    contratos: {
      type: "one-to-many",
      target: "ContratoTrabajador",
      inverseSide: "trabajador",
    },

    ausencias: {
      type: "one-to-many",
      target: "Ausencia",
      inverseSide: "trabajador",
    },

    asignados: {
      type: "one-to-many",
      target: "Asignado",
      inverseSide: "trabajador",
    },
  },
});