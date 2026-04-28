import { EntitySchema } from "typeorm";

export const JustificacionAusenciaSchema = new EntitySchema({
  name: "JustificacionAusencia",
  tableName: "justificaciones_ausencia",

  columns: {
    id_justificacion: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_ausencia: {
      type: "int",
    },

    revisado_por: {
      type: "int",
      nullable: true,
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
      inverseSide: "justificaciones",
    },

    revisor: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "revisado_por" },
    },
  },
});