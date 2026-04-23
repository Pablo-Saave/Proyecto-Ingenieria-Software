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
    empleadoId: {
      type: "int",
    },
    tipo: {
      type: "varchar", // justificada / injustificada
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
      type: "varchar", // justificacion aceptada o rechazada
    },
  },
});