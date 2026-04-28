const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Asignado",
  tableName: "asignados",

  columns: {
    id_asignado: {
      primary: true,
      type: "int",
      generated: true,
    },

    fecha_asignacion: {
      type: "date",
    },

    fecha_retiro: {
      type: "date",
      nullable: true,
    },

    tipo_jornada: {
      type: "varchar",
    },

    cargo_operativo: {
      type: "varchar",
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

    proyecto: {
      type: "many-to-one",
      target: "Proyecto",
      joinColumn: {
        name: "id_proyecto",
      },
      nullable: false,
    },
  },
});