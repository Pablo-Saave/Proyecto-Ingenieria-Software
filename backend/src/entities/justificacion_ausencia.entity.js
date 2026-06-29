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
    id_revisor: {
      type: "int",
      nullable: true,
    },
    motivo: {
      type: "varchar",
      nullable: false, // Ej: "Licencia médica", "Trámite legal"
    },
    documento_respaldo: {
      type: "varchar",
      nullable: true,
    },
    estado_revision: {
      type: "varchar", // ej: "Pendiente", "Aprobado", "Rechazado"
      default: "Pendiente"
    },
    comentario_revision: {
      type: "varchar",
      nullable: true,
    },
    fecha_registro: {
      type: "date",
      nullable: false,
    },
    fecha_revision: {
      type: "date",
      nullable: true,
    },
  },

  relations: {
    ausencia: {
      type: "one-to-one",
      target: "Ausencia",
      joinColumn: { name: "id_ausencia" },
      inverseSide: "justificacion",
      nullable: false,
    },
    revisor: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "id_revisor" },
      nullable: true,
    },
  },
});