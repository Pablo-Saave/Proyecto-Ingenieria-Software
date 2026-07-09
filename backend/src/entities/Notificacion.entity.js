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
    
    },
  },
});