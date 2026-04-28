const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "ContratoTrabajador",
  tableName: "contratos_trabajadores",

  columns: {
    id_contrato: {
      primary: true,
      type: "int",
      generated: true,
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

    id_trabajador: {
      type: "int",
    },
  },

  relations: {
    trabajador: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "id_trabajador" },
      inverseSide: "contratos",
    },
  },
});
