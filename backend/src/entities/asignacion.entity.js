const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Asignacion",
  tableName: "asignaciones",

  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },

    fecha: {
      type: "varchar",
    },

    estado: {
      type: "varchar", // activa o finalizada
    },
  },

  relations: {
    supervisor: {
      type: "many-to-one",
      target: "Usuario",
      joinColumn: {
        name: "supervisorId",
      },
      nullable: false,
    },

    empleado: {
      type: "many-to-one",
      target: "Usuario",
      joinColumn: {
        name: "empleadoId",
      },
      nullable: false,
    },
  },
});