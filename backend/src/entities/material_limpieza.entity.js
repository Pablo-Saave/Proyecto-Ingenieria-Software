import { EntitySchema } from "typeorm";

export const MaterialLimpiezaSchema = new EntitySchema({
  name: "MaterialLimpieza",
  tableName: "material_limpieza",

  columns: {
    id_material: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_inventario: {
      type: "int",
      nullable: false,
    },

    nombre_material: {
        type: "varchar",
        nullable: false
    },

    tipo_material: {
        type: "varchar",
        nullable: false
    },

    stock_actual: {
        type: "int",
        nullable: false
    },

    stock_minimo: {
        type: "int",
        nullable: true
    }
  },

  relations: {
    inventario: {
      type: "many-to-one",
      target: "Inventario",
      joinColumn: { name: "id_inventario" },
      inverseSide: "materiales",
      nullable: false,
    },
  },
});