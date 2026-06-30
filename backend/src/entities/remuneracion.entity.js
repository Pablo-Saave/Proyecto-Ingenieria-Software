import { EntitySchema } from "typeorm";

export const RemuneracionSchema = new EntitySchema({
  name: "Remuneracion",
  tableName: "remuneracion",

  columns: {
    id_remuneracion: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_trabajador: {
      type: "int",
      nullable: false,
    },

    fecha_pago: {
      type: "varchar"
    },

    sueldo: {
      type: "int"
    },

    bono: {
      type: "int"
    },

    descuento: {
      type: "int"
    },
    
    estado_pago: {
      type: "varchar"
    },
  },

  relations: {
    trabajador: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "id_trabajador" },
      inverseSide: "remuneraciones",
      nullable: false,
    },
  },
});