import { EntitySchema } from "typeorm";

// Reemplaza el sistema de Rol + Permiso + PermisoVinculado.
// Una etiqueta representa una unidad organizacional (proyecto + cuadrilla).
// Ejemplo: "Hospital Regional - Cuadrilla 1", "Mall Trébol - Cuadrilla 2"
// NO otorga permisos. Los permisos los define el campo tipo_usuario en Trabajador.

export const EtiquetaSchema = new EntitySchema({
  name: "Etiqueta",
  tableName: "etiqueta",

  columns: {
    id_etiqueta: {
      primary: true,
      type: "int",
      generated: true,
    },

    nombre_etiqueta: {
      type: "varchar",
      length: 150,
      nullable: false,
      // Ej: "Hospital Regional - Cuadrilla 1"
    },

    descripcion: {
      type: "text",
      nullable: true,
    },
  },

  relations: {
    trabajadores: {
      type: "one-to-many",
      target: "Trabajador",
      inverseSide: "etiqueta",
    },
  },
});