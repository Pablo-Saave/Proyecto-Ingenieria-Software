import { EntitySchema } from "typeorm";

export const AccidenteLaboralSchema = new EntitySchema({
  name: "AccidenteLaboral",
  tableName: "accidente_laboral",

  columns: {
    id_accidente: {
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

    fecha_accidente: {
        type: "date",
        nullable: false,
    },

    descripcion: {
        type: "varchar",
        nullable: false
    },

    gravedad: {
        type: "varchar",
        nullable: false
    },

    traslado: {
        type: "varchar",
        nullable: false
    },

    observaciones: {
        type: "varchar",
    }

  },

  relations: {
    trabajador: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "id_trabajador" },
      inverseSide: "accidentes",
      nullable: false,
    },

    cuadrilla: {
      type: "many-to-one",
      target: "Cuadrilla",
      joinColumn: { name: "id_cuadrilla" },
      inverseSide: "accidentes",
      nullable: false,
    },
  },
});