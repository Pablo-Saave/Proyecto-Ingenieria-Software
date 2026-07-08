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

    id_contrato: {
      type: "int",
      nullable: false,
    },

    fecha_pago: {
      type: "varchar",
      nullable: false
    },

    sueldo: {
      type: "int",
      nullable: false
    },

    bono: {
      type: "int",
      default: 0
    },

    descuento: {
      type: "int",
      default: 0
    },
    
    estado_pago: {
      type: "varchar",
      default: "pendiente"
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
    contrato: {
      type: "many-to-one",
      target: "ContratoTrabajador",
      joinColumn: { name: "id_contrato" },
      inverseSide: "remuneraciones",
      nullable: false,
    },
  },
});