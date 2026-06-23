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

    publicado_por: {
      type: "int",
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

    id_etiqueta: {
      type: "int",
      nullable: false,
    },
  },

  relations: {
    autor: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "publicado_por" },
      nullable: false,
    },

    etiqueta: {
      type: "many-to-one",
      target: "Etiqueta",
      joinColumn: { name: "id_etiqueta" },
      nullable: false,
    },
  },
});
