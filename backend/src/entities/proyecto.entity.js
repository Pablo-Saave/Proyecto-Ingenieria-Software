const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Proyecto",
  tableName: "proyecto",

  columns: {
    id_proyecto: {
      primary: true,
      type: "int",
      generated: true,
    },
    nombre_proyecto: { type: "varchar" },
    tipo_instalacion: { type: "varchar" },
    direccion: { type: "varchar" },
    nivel_exigencia: { type: "varchar" },
    cantidad_personal_requerido: { type: "varchar" },
  },

  relations: {
    cliente: {
      type: "many-to-one",
      target: "cliente",
      joinColumn: true, 
      nullable: false,
      inverseSide: "proyecto",
    },
    trabajador: {
      type: "many-to-many",
      target: "trabajador",
      joinTable: true,
      inverseSide: "proyecto",
    },
    /*
    contrato_proyecto: {
      type: "one-to-one",
      target: "contrato_proyecto",
      joinColumn: true,
      inverseSide: "proyecto",
    },
    accidente_laboral: {
      type: "one-to-many",
      target: "accidente_laboral",
      inverseSide: "proyecto",
    },
    abastecimiento: {
      type: "one-to-one",
      target: "abastecimiento",
      joinColumn: true, 
      inverseSide: "proyecto",
    },
    */
  },
});