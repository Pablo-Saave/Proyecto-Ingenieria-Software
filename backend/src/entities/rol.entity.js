import { EntitySchema } from "typeorm";

export const RolSchema = new EntitySchema({

    name:'Rol',
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
        trabajadores: {
            type: "one-to-many",
            target: "Trabajador",
            inverseSide: "rol",
        },
        permisos_vinculados: {
            type: "one-to-many",
            target: "PermisoVinculado",
            inverseSide: "rol",
        },
    },
})