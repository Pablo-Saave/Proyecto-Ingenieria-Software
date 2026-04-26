const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Usuario",
  tableName: "usuarios",

  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },

    nombre: {
      type: "varchar",
    },

    email: {
      type: "varchar",
      unique: true,
    },

    contraseña: {
      type: "varchar",
    },

    rol: {
      type: "varchar", // administrador, supervisor, empleado
    },
  },

  relations: {
    ausencias: {
      type: "one-to-many",
      target: "Ausencia",
      inverseSide: "usuario",
    },
  },
});