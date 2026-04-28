import { EntitySchema } from "typeorm";

export const ClienteSchema= new EntitySchema({
  name: "Cliente",
  tableName: "cliente",

  columns: {
    id_cliente: {
      primary: true,
      type: "int",
      generated: true,
    },
    nombres: { type: "varchar" },
    apellidos: { type: "varchar" },
    tipo_cliente: { type: "varchar" },
    rubro: { type: "varchar" },
    telefono: { type: "varchar" },
    correo: { type: "varchar" },
    direccion: { type: "varchar" },
  },

  relations: {
    proyectos: {
      type: "one-to-many",
      target: "Proyecto",
      inverseSide: "cliente",
    },
  },
});