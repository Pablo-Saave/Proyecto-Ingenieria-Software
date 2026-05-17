import { EntitySchema } from "typeorm";

export const AusenciaSchema = new EntitySchema({
  name: "Ausencia",
  tableName: "ausencias",

  columns: {
    id_ausencia: {
      primary: true,
      type: "int",
      generated: true,
    },

    fecha_inicio: {
      type: "date",
    },

    fecha_termino: {
      type: "date",
    },

    motivo: {
      type: "varchar",
    },

    estado: {
      type: "varchar",
    },

    comentario_revision: {
      type: "varchar",
      nullable: true,
    },

    fecha_revision: {
      type: "date",
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

    revisor: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: {
        name: "revisado_por",
      },
      nullable: true,
    },
  },
});