import { EntitySchema } from "typeorm";

export const ProyectoSchema = new EntitySchema({
  name: "Proyecto",
  tableName: "proyecto",

  columns: {
    id_proyecto: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_cliente: {
      type: "int",
      nullable: false,
    },

    nombre_proyecto: {
      type: "varchar"
    },

    tipo_instalacion: {
      type: "varchar"
    },

    direccion: {
      type: "varchar"
    },

    nivel_exigencia: {
      type: "varchar"
    },

    cantidad_personal_requerido: {
      type: "varchar"
    },

  },

  relations: {
    cliente: {
      type: "many-to-one",
      target: "Cliente",
      joinColumn: { name: "id_cliente" },
      inverseSide: "proyectos",
      nullable: false,
    },

    cuadrillas: {
      type: "one-to-many",
      target: "Cuadrilla",
      inverseSide: "proyecto",
    },

    contratoProyecto: {
      type: "one-to-one",
      target: "ContratoProyecto",
      inverseSide: "proyecto",
    },

    inventarios: {
      type: "one-to-many",
      target: "Inventario",
      inverseSide: "proyecto",
    },
  },
});