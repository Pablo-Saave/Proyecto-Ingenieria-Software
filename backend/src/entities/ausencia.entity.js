const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Ausencia",
  tableName: "ausencias",

  columns: {
    id_ausencia: {
      primary: true,
      type: "int",
      generated: true,
    },

    fecha_ausencia: {
      type: "date",
    },

    tipo_ausencia: {
      type: "varchar",
    },

    estado: {
      type: "varchar",
    },

    observacion: {
      type: "varchar",
      nullable: true,
    },
  },

  relations: {
    trabajador: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: {
        name: "id_trabajador",
      },
      nullable: false,
    },
  },
});