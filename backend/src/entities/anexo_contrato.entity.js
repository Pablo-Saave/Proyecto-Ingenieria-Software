// anexo_contrato.entity.js
import { EntitySchema } from "typeorm";

export const AnexoContratoSchema = new EntitySchema({
  name: "AnexoContrato",
  tableName: "anexo_contrato",

  columns: {
    id_anexo_contrato: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_contrato: {
      type: "int",
      nullable: false,
    },

    // A diferencia del anexo de proyecto, aquí SÍ puede cambiar el tipo de
    // contrato (ej: pasar de Plazo Fijo a Indefinido tras renovar).
    tipo_contrato_nuevo: {
      type: "varchar",
      nullable: true,
    },

    fecha_inicio_nueva: {
      type: "date",
      nullable: true,
    },

    fecha_termino_nueva: {
      type: "date",
      nullable: true,
    },

    monto_nuevo: {
      type: "int",
      nullable: true,
    },

    fecha_anexo: {
      type: "date",
      nullable: false,
    },

    // Ya no se exige desde el form ni se usa en el backend; se deja nullable
    // en vez de eliminar la columna para no requerir una migración destructiva.
    fecha_vigencia: {
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
    contrato: {
      type: "many-to-one",
      target: "ContratoTrabajador",
      joinColumn: { name: "id_contrato" },
      inverseSide: "anexos",
      nullable: false,
    },
  },
});