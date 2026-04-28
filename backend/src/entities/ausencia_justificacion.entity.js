const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "JustificacionAusencia",
  tableName: "justificaciones_ausencia",

  columns: {
    id_justificacion: {
      primary: true,
      type: "int",
      generated: true,
    },

    estado_revision: { type: "varchar" },
    fecha_registro: { type: "date" },
    motivo: { type: "varchar" },
    documento_respaldo: { type: "varchar", nullable: true },
  },

  relations: {
    ausencia: {
      type: "many-to-one",
      target: "Ausencia",
      joinColumn: { name: "id_ausencia" },
    },

    revisor: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "revisado_por" },
    },
  },
});