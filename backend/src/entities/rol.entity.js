import { EntitySchema } from "typeorm";

export const RolSchema = new EntitySchema({

    name:'rol',
    tableName:"rol",

    columns: {
        id_rol: {
            type: "int",
            primary: true,
            generated: true,
        },
        
        nombre_rol: {
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
            target: "permiso_vinculado",
            inverseSide: "rol",
        },
    },
})