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
    fecha_pago: { type: "varchar" },
    sueldo: { type: "int" },
    bono: { type: "int" },
    descuento: { type: "int" },
    estado_pago: { type: "varchar" },
  },

  relations: {
    trabajador: {
      type: "one-to-one",
      target: "Trabajador",
      joinColumn: true,
      inverseSide: "remuneracion",
    },
  }
});