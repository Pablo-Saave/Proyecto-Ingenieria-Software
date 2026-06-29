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
    id_trabajador: {
      type: "int",
      nullable: false,
    },
    id_cuadrilla: {
      type: "int",
      nullable: false,
    },
    fecha_inicio: {
      type: "date",
    },
    fecha_termino: {
      type: "date",
    },
    // El "estado" general de la ausencia depende de si se justifica o no
    estado: {
      type: "varchar", // ej: "Pendiente", "Justificada", "Injustificada"
    },
  },

  relations: {
    trabajador: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "id_trabajador" },
      inverseSide: "ausencias",
      nullable: false,
    },
    cuadrilla: {
      type: "many-to-one",
      target: "Cuadrilla",
      joinColumn: { name: "id_cuadrilla" },
      inverseSide: "ausencias",
      nullable: false,
    },
    justificacion: {
      type: "one-to-one",
      target: "JustificacionAusencia",
      inverseSide: "ausencia",
    },
  },
});