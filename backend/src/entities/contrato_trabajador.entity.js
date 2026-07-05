import { EntitySchema } from "typeorm";

export const ContratoTrabajadorSchema = new EntitySchema({
  name: "ContratoTrabajador",
  tableName: "contratos_trabajadores",

  columns: {
    id_contrato: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_trabajador: {
      type: "int",
      nullable: false,
    },

    tipo_contrato: {
      type: "varchar",
    },

    estado_contrato: {
      type: "varchar",
    },

    fecha_inicio: {
      type: "date",
    },

    fecha_termino: {
      type: "date",
      nullable: true,
    },

    observaciones: {
      type: "text",
      nullable: true,
    },

    monto: {
      type: "int",
      nullable: false
    }
  },

  relations: {
    trabajador: {
      type: "many-to-one",
      target: "Trabajador", // Referencia "name" en la entidad trabajador.entity.js
      joinColumn: { name: "id_trabajador" }, // FK
      inverseSide: "contratos",
      nullable: false,
    },

    // Necesaria para que getContratoById pueda pedir relations: ["trabajador", "anexos"]
    // y para que anexo_contrato.entity.js pueda apuntar de vuelta con inverseSide: "contrato"
    anexos: {
      type: "one-to-many",
      target: "AnexoContrato", // Referencia "name" en anexo_contrato.entity.js
      inverseSide: "contrato",
    },
  },

});