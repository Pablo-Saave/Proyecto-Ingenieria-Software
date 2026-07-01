// anexo_contrato_proyecto.entity.js
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

    fecha_vigencia: {
      type: "date",
      nullable: false,
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