import { EntitySchema } from "typeorm";

export const AsignadoSchema = new EntitySchema({
  name: "Asignado",
  tableName: "asignados",

  columns: {
    id_trabajador: {
      primary: true,
      type: "int",
    },

    id_cuadrilla: {
      type: "int",
      nullable: false,
    },

    cargo_operativo: {
      type: "varchar",
      nullable: false,
    },

    tipo_jornada: {
      type: "varchar",
      nullable: false,
    },

    fecha_asignacion: {
      type: "date",
      nullable: false,
    },
  },

  relations: {
    trabajador: {
      type: "one-to-one",
      target: "Trabajador",
      joinColumn: { name: "id_trabajador" },
      inverseSide: "asignados",
      nullable: false,
      primary: true, // <- pk + fk a la vez
    },

    cuadrilla: {
      type: "many-to-one",
      target: "Cuadrilla",
      joinColumn: { name: "id_cuadrilla" },
      inverseSide: "asignados",
      nullable: false,
      onDelete: "CASCADE"
    },
  },
});