import { EntitySchema } from "typeorm";
export const TrabajadorSchema = new EntitySchema({
  name: "Trabajador",
  tableName: "trabajador",

  columns: {
    id_trabajador: {
      primary: true,
      type: "int",
      generated: true,
    },

    // "trabajador" | "supervisor" | "administrador"
    tipo_usuario: {
      type: "varchar",
      length: 50,
      nullable: false,
    },

    id_etiqueta: {
      type: "int",
      nullable: true,
    },

    rut: {
      type: "varchar",
      unique: true,
    },

    nombres: {
      type: "varchar",
    },

    apellidos: {
      type: "varchar",
    },

    sexo: {
      type: "varchar",
    },

    telefono: {
      type: "varchar",
    },

    correo: {
      type: "varchar",
      unique: true,
    },

    direccion: {
      type: "varchar",
    },

    fecha_nacimiento: {
      type: "date",
    },

    fecha_ingreso: {
      type: "date",
    },

    estado_laboral: {
      type: "varchar",
    },

    experiencia_previa: {
      type: "int",
      nullable: true,
    },
  },

  relations: {
    // Unidad organizacional. Solo restringe visibilidad de canales de avisos por ejemplo.
    etiqueta: {
      type: "many-to-one",
      target: "Etiqueta",
      joinColumn: { name: "id_etiqueta" },
      nullable: true,
      inverseSide: "trabajadores",
    },

    contratos: {
      type: "one-to-many",
      target: "ContratoTrabajador",
      inverseSide: "trabajador",
    },

    ausencias: {
      type: "one-to-many",
      target: "Ausencia",
      inverseSide: "trabajador",
    },

    asignados: {
      type: "one-to-many",
      target: "Asignado",
      inverseSide: "trabajador",
    },
  },
});