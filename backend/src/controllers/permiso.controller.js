"use strict";

import { PermisoSchema } from '../entities/user.entity.js';
import { appDataSource } from '../config/configDb.js';

const permisoRepo = AppDataSource.getRepository(PermisoSchema);

export const getPermisos = async (req, res) => {
    try {
        const permisos = await permisoRepo.find();
        res.json(permisos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener permisos" });
    }
};

export const crearPermiso = async (req, res) => {
    try {
        const { nombre_permiso, descripcion } = req.body;
        const nuevoPermiso = permisoRepo.create({ nombre_permiso, descripcion });
        await permisoRepo.save(nuevoPermiso);
        res.status(201).json(nuevoPermiso);
    } catch (error) {
        res.status(500).json({ message: "Error al crear el permiso" });
    }
};
