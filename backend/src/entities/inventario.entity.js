import { EntitySchema } from "typeorm";

export const InventarioSchema = new EntitySchema({
  name: "Inventario",
  tableName: "inventario",

  columns: {
    id_inventario: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_cuadrilla: {
      type: "int",
      nullable: false,
    },

    nombre_inventario: {
      type: "varchar",
      nullable: false,
    },
  },

  relations: {
    cuadrilla: {
      type: "many-to-one",
      target: "Cuadrilla",
      joinColumn: { name: "id_cuadrilla" },
      inverseSide: "inventarios",
      nullable: false,
    },

    materiales: {
      type: "one-to-many",
      target: "MaterialLimpieza",
      inverseSide: "inventario",
    },
  },
});