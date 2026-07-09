import { EntitySchema } from "typeorm";

export const AnexoContratoProyectoSchema = new EntitySchema({
  name: "AnexoContratoProyecto",
  tableName: "anexo_contrato_proyecto",

  columns: {
    id_anexo_contrato_proyecto: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_contrato_proyecto: {
      type: "int",
      nullable: false,
    },

    monto_nuevo: {
      type: "int",
      nullable: true,
    },

    fecha_anexo: {
      type: "date",
      nullable: false,
    },

    // Columna legacy: queda nullable para evitar una migracion destructiva.
    fecha_vigencia: {
      type: "date",
      nullable: true,
    },

    // Nueva fecha vigente cuando el anexo modifica el plazo.
    fecha_termino_nueva: {
      type: "date",
      nullable: true,
    },

    motivo: {
      type: "varchar",
      nullable: false,
    },

    descripcion_modificacion: {
      type: "varchar",
      nullable: false,
    },

    observaciones: {
      type: "varchar",
      nullable: true,
    },
  },

  relations: {
    contratoProyecto: {
      type: "many-to-one",
      target: "ContratoProyecto",
      joinColumn: { name: "id_contrato_proyecto" },
      inverseSide: "anexos",
      nullable: false,
    },
  },
});
