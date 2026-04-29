"use strict";

import { RolSchema } from '../entities/rol.entity.js';
import { AppDataSource } from '../config/configDb.js';

const rolRepo = AppDataSource.getRepository(RolSchema);

export const getRoles = async (req, res) => {
    try {
        const roles = await rolRepo.find();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener roles" });
    }
};

export const crearRol = async (req, res) => {
    try {
        const { nombre_rol, descripcion } = req.body;
        const nuevoRol = rolRepo.create({ nombre_rol, descripcion });
        await rolRepo.save(nuevoRol);
        res.status(201).json(nuevoRol);
    } catch (error) {
        res.status(500).json({ message: "Error al crear el rol" });
    }
};

