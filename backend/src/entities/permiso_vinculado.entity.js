import { EntitySchema } from "typeorm";

export const PermisoVinculadoSchema = new EntitySchema({
    
    name: 'PermisoVinculado',
    tableName: "permiso_vinculado",

    columns: {
        id_rol_permiso: {
            type: "int",
            primary: true,
            generated: true,
        },

        id_rol: {
            type: "int",
            primary: true,
            generated: true,
        },

        id_permiso: {
            type: "int",
            primary: true,
            generated: true,
        },
    },

    relations: {
        rol: {
            type: "many-to-one",
            target: "Rol",
            joinColumn: { name: "id_rol" },
            nullable: false,
            onDelete: "CASCADE",
            inverseSide: "permisos_vinculados",
        },
        permiso: {
            type: "many-to-one",
            target: "Permiso",
            joinColumn: { name: "id_permiso" },
            nullable: false,
            onDelete: "CASCADE",
            inverseSide: "permisos_vinculados",
        },
    },

});