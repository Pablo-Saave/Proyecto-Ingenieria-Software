const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "usuarios",
  columns: {
    id: {
      primary: true, // id unico
      type: "int",
      generated: true, //generated significa que genere secuencialmente 1, 2, 3...
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
      type: "varchar", // administrador, supervisor o empleado
    },
  },
});