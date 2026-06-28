import { EntitySchema } from "typeorm";

export const AvisoSchema = new EntitySchema({
  name: "Aviso",
  tableName: "aviso",

  columns: {
    id_aviso: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_cuadrilla: {
      type: "int",
      nullable: false,
    },

    id_autor: {
      type: "int",
      nullable: false,
    },

    nombre_autor: {
      type: "varchar",
      nullable: false,
    },

    titulo: {
      type: "varchar",
      length: 150,
      nullable: false,
    },

    contenido: {
      type: "text",
      nullable: false,
    },

    fecha_publicacion: {
      type: "timestamp",
      createDate: true,
    },

    prioridad: {
      type: "varchar",
      length: 30,
      default: "normal",
    },
  },

  relations: {
    cuadrilla: {
      type: "many-to-one",
      target: "Cuadrilla",
      joinColumn: { name: "id_cuadrilla" },
      inverseSide: "avisos",
      nullable: false,
    },
  },
});