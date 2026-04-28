import { EntitySchema } from "typeorm";

export const PermisoSchema = new EntitySchema({

    name:'Permiso',
    tableName:"permiso",

    columns: {
        id_permiso: {
            type: "int",
            primary: true,
            generated: true,
        },
        
        nombre_permiso: {
            type: "varchar",
            length: 100,
            nullable: false,
        },

        descripcion: {
            type: "text",
            nullable: true,
        },
    },

    relations: {
        permisos_vinculados: {
            type: "one-to-many",
            target: "PermisoVinculado",
            inverseSide: "permiso",
        },
    },
})