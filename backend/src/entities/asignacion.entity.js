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
    empleadoId: {
      type: "int",
    },
    supervisorId: {
      type: "int",
    },
    departamento: {
      type: "varchar",
    },
    fecha_inicio: {
      type: "varchar",
    },
  },
});