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

    id_proyecto: {
      type: "int",
      nullable: false,
    },

    nombre_inventario: {
      type: "varchar",
      nullable: false
    }
  },

  relations: {
    proyecto: {
      type: "many-to-one",
      target: "Proyecto",
      joinColumn: { name: "id_proyecto" },
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