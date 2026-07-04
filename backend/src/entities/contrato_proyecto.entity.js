import { EntitySchema } from "typeorm";

export const ContratoProyectoSchema = new EntitySchema({
  name: "ContratoProyecto",
  tableName: "contrato_proyecto",

  columns: {
    id_contrato_proyecto: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_proyecto: {
      type: "int",
      nullable: false,
      unique: true,
    },

    descripcion: {
      type: "varchar",
      nullable: false
    },

    fecha_inicio: {
      type: "date",
      nullable: false,
    },

    fecha_termino: {
      type: "date",
      nullable: false,
    },

    fecha_extension: {
      type: "date",
      nullable: true,
    },

    estado_contrato: {
      type: "varchar",
      nullable: false,
    },

    monto: {
      type: "int",
      nullable: false
    }

    // NOTA: se eliminó la columna varchar "anexos" que existía aquí antes.
    // Colisionaba de nombre con la relación "anexos" de más abajo (ambas
    // intentaban ocupar la misma propiedad en la entidad). Los anexos reales
    // ahora viven exclusivamente como registros en la tabla
    // "anexo_contrato_proyecto", accesibles a través de la relación.
  },

  relations: {
    proyecto: {
      type: "one-to-one",
      target: "Proyecto",
      joinColumn: { name: "id_proyecto" },
      inverseSide: "contratoProyecto",
      nullable: false,
    },

    anexos: {
      type: "one-to-many",
      target: "AnexoContratoProyecto",
      inverseSide: "contratoProyecto",
    },
  },
});