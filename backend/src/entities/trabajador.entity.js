import { EntitySchema } from "typeorm";

export const TrabajadorSchema = new EntitySchema({
  name: "Trabajador",
  tableName: "trabajador",

  columns: {
    id_trabajador: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_rol: {
      type: "int",
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
    contratos: {
      type: "one-to-many",
      target: "ContratoTrabajador",
      inverseSide: "trabajador",
    },

  rol: {
      type: "many-to-one",
      target: "Rol",
      joinColumn: { name: "id_rol" },
      inverseSide: "trabajadores",
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
