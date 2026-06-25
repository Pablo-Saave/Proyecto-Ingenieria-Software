import { EntitySchema } from "typeorm";

export const CuadrillaSchema = new EntitySchema({
  name: "Cuadrilla",
  tableName: "cuadrilla",

  columns: {
    id_cuadrilla: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_proyecto: {
      type: "int",
      nullable: false,
    },

    nombre_cuadrilla: {
        type: "varchar",
        nullable: false
    },

    fecha_creacion: {
        type: "date",
        nullable: false
    },

    estado: {
        type: "varchar",
        nullable: false
    }
  },

  relations: {
    proyecto: {
      type: "many-to-one",
      target: "Proyecto",
      joinColumn: { name: "id_proyecto" },
      inverseSide: "cuadrillas",
      nullable: false,
    },

    asignados: {
      type: "one-to-many",
      target: "Asignado",
      inverseSide: "cuadrilla",
    },

    avisos: {
      type: "one-to-many",
      target: "Aviso",
      inverseSide: "cuadrilla",
    },

    ausencias: {
      type: "one-to-many",
      target: "Ausencia",
      inverseSide: "cuadrilla",
    },

    accidentes: {
      type: "one-to-many",
      target: "AccidenteLaboral",
      inverseSide: "cuadrilla",
    },
  },
});