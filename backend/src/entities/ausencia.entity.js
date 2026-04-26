const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Ausencia",
  tableName: "ausencias",

  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },

    tipo: {
      type: "varchar", // justificada o injustificada
    },

    razon: {
      type: "varchar",
    },

    fecha_inicio: {
      type: "varchar",
    },

    fecha_termino: {
      type: "varchar",
    },

    estado: {
      type: "varchar", // pendiente, aprobada o rechazada
    },

    empleadoId: {
      type: "int",
    },
  },

  relations: {
    usuario: {
      type: "many-to-one",
      target: "Usuario",
      joinColumn: {
        name: "empleadoId",
      },
      nullable: false,
    },
  },
});