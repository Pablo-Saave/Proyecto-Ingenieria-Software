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

    hashed_pass: {
      type: "varchar",
      generated: false,
      nullable: false
    },

    // "trabajador" | "supervisor" | "administrador"
    tipo_usuario: {
      type: "varchar",
      length: 50,
      nullable: false,
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
      type: "varchar",
      nullable: true,
    },
  },

  relations: {
    contratos: {
      type: "one-to-many",
      target: "ContratoTrabajador",
      inverseSide: "trabajador",
    },

    remuneraciones: {
      type: "one-to-many",
      target: "Remuneracion",
      inverseSide: "trabajador",
    },

    asignados: {
      type: "one-to-one",
      target: "Asignado",
      inverseSide: "trabajador",
    },

    ausencias: {
      type: "one-to-many",
      target: "Ausencia",
      inverseSide: "trabajador",
    },

    accidentes: {
      type: "one-to-many",
      target: "AccidenteLaboral",
      inverseSide: "trabajador",
    },
  },
});