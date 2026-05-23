import { EntitySchema } from "typeorm";
export const EtiquetaSchema = new EntitySchema({
  name: "Etiqueta",
  tableName: "etiqueta",

  columns: {
    id_etiqueta: {
      primary: true,
      type: "int",
      generated: true,
    },

    nombre_etiqueta: { 
      type: "varchar",
      length: 150,
      nullable: false,       // Ej: "Hospital Regional - Cuadrilla 1"
    },

    descripcion: {
      type: "text",
      nullable: true,
    },
  },

  relations: {
    trabajadores: {
      type: "one-to-many",
      target: "Trabajador",
      inverseSide: "etiqueta",
    },
  },
});