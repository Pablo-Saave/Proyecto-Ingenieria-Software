import { EntitySchema } from "typeorm";

export const NotificacionSchema = new EntitySchema({
  name: "Notificacion",
  tableName: "notificaciones",

  columns: {
    id_notificacion: {
      primary: true,
      type: "int",
      generated: true,
    },

    id_trabajador: {
      type: "int",
      nullable: false,
    },

    tipo: {
      // 'aviso' | 'contrato_por_vencer' | 'ausencia_aprobada' | 'ausencia_rechazada' | 'nueva_asignacion' | ...
      type: "varchar",
      nullable: false,
    },

    titulo: {
      type: "varchar",
      nullable: false,
    },

    mensaje: {
      type: "varchar",
      nullable: false,
    },

    referencia_tipo: {
      // 'aviso' | 'contrato' | 'ausencia' | 'asignacion' — para saber a qué pantalla llevar
      type: "varchar",
      nullable: true,
    },

    referencia_id: {
      type: "int",
      nullable: true,
    },

    leido: {
      type: "boolean",
      nullable: false,
      default: false,
    },

    fecha_creacion: {
      type: "timestamp",
      nullable: false,
      createDate: true,
    },
  },

  relations: {
    trabajador: {
      type: "many-to-one",
      target: "Trabajador",
      joinColumn: { name: "id_trabajador" },
      nullable: false,
      // NOTA: sin inverseSide a propósito. Si agregas una relación "notificaciones"
      // en trabajador.entity.js más adelante, agrega aquí inverseSide: "notificaciones"
      // Y agrega en Trabajador: notificaciones: { type:"one-to-many", target:"Notificacion", inverseSide:"trabajador" }
    },
  },
});