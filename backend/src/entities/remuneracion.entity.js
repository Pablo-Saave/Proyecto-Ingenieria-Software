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

    id_contrato_trabajador: {
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
    contratoTrabajador: {
      type: "many-to-one",
      target: "ContratoTrabajador",
      joinColumn: { name: "id_contrato_trabajador" },
      inverseSide: "remuneraciones",
      nullable: false,
    },
  },
});