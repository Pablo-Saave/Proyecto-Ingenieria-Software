import { EntitySchema } from "typeorm";

export const JustificacionAusenciaSchema = new EntitySchema({
  name: "JustificacionAusencia",
  tableName: "justificacion_ausencia",

  columns: {
    id_justificacion: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_ausencia: {
      type: "int",
      nullable: false,
      unique: true,
    },

    estado_revision: {
        type: "varchar",
        nullable: false,
    },

    fecha_registro: {
        type: "date",
        nullable: false
    },

    motivo: {
        type: "varchar",
        nullable: false
    },

    documento_respaldo: {
        type: "varchar"
    }
  },

  relations: {
    ausencia: {
      type: "one-to-one",
      target: "Ausencia",
      joinColumn: { name: "id_ausencia" },
      inverseSide: "justificacion",
      nullable: false,
    },
  },
});