import { EntitySchema } from "typeorm";

export const AsignadoSchema = new EntitySchema({
  name: "Asignado",
  tableName: "asignados",

  columns: {
    id_trabajador: {
      type: "int",
      primary: true, // PK compuesto de  (id_trabajador, id_cuadrilla)
    },

    id_cuadrilla: {
      type: "int",
      primary: true, // PK compuesto de  (id_trabajador, id_cuadrilla)
    },

    cargo_operativo: {
      type: "varchar",
      nullable: true,
    },

    tipo_jornada: {
      type: "varchar",
      nullable: true,
    },

    fecha_asignacion: {
      type: "date",
      nullable: false,
    },

    fecha_retiro: {
      type: "date",
      nullable: true,
    },
  },

  relations: {
    trabajador: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "id_trabajador" }, // FK
      inverseSide: "asignados",
      primary: true,
      nullable: false,
    },

    cuadrilla: {
      type: "many-to-one",
      target: "Cuadrilla",
      joinColumn: { name: "id_cuadrilla" }, // FK
      inverseSide: "asignados",
      primary: true,
      nullable: false,
    },
  },
});