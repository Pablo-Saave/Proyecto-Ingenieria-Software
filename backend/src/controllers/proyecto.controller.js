"use strict";

import { AppDataSource } from "../config/configDb.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";
import { ClienteSchema } from "../entities/cliente.entity.js";

const proyectoRepo = AppDataSource.getRepository(ProyectoSchema);
const clienteRepo = AppDataSource.getRepository(ClienteSchema);

export const getProyectos = async (req, res) => {
  try {
    // trae los registros de proyecto, tambien carga su relacion cliente
    const proyectos = await proyectoRepo.find({ relations: ["cliente"] });

    if (proyectos.length === 0) {
      return res.status(404).json({ message: "No se encontraron proyectos" });
    }

    res.status(200).json(proyectos);
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({ message: "Error interno al obtener proyectos" });
  }
};

export const crearProyecto = async (req, res) => {
  try {
    const {
      nombre_proyecto,
      tipo_instalacion,
      direccion,
      nivel_exigencia,
      cantidad_personal_requerido,
      id_cliente,
    } = req.body;

    if (
      !nombre_proyecto ||
      !tipo_instalacion ||
      !direccion ||
      !nivel_exigencia ||
      !cantidad_personal_requerido ||
      !id_cliente
    ) {
      return res.status(400).json({ message: "Todos los campos son obligatorios, incluyendo id_cliente" });
    }

    // Validar si existe cliente
    const cliente = await clienteRepo.findOneBy({ id_cliente: parseInt(id_cliente) });
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const nuevoProyecto = proyectoRepo.create({
      nombre_proyecto,
      tipo_instalacion,
      direccion,
      nivel_exigencia,
      cantidad_personal_requerido,
      cliente,
    });

    await proyectoRepo.save(nuevoProyecto);

    res.status(201).json(nuevoProyecto);
  } catch (error) {
    console.error("Error al crear proyecto:", error);
    res.status(500).json({ message: "Error interno al crear el proyecto" });
  }
};

export const actualizarProyecto = async (req, res) => {
  try {
    const { id } = req.params;

    const proyecto = await proyectoRepo.findOne({
      where: { id_proyecto: parseInt(id) },
      relations: ["cliente"],
    });

    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    const {
      nombre_proyecto,
      tipo_instalacion,
      direccion,
      nivel_exigencia,
      cantidad_personal_requerido,
      id_cliente,
    } = req.body;

    // Solo actualiza los campos que vienen en el body
    if (nombre_proyecto) proyecto.nombre_proyecto = nombre_proyecto;
    if (tipo_instalacion) proyecto.tipo_instalacion = tipo_instalacion;
    if (direccion) proyecto.direccion = direccion;
    if (nivel_exigencia) proyecto.nivel_exigencia = nivel_exigencia;
    if (cantidad_personal_requerido) proyecto.cantidad_personal_requerido = cantidad_personal_requerido;

    // Si se quiere reasignar a otro cliente
    if (id_cliente) {
      const nuevoCliente = await clienteRepo.findOneBy({ id_cliente: parseInt(id_cliente) });

      if (!nuevoCliente) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }

      proyecto.cliente = nuevoCliente;
    }

    await proyectoRepo.save(proyecto);

    res.status(200).json(proyecto);
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    res.status(500).json({ message: "Error interno al actualizar el proyecto" });
  }
};

export const eliminarProyecto = async (req, res) => {
  try {
    const { id } = req.params;

    const proyecto = await proyectoRepo.findOneBy({ id_proyecto: parseInt(id) });

    if (!proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    await proyectoRepo.remove(proyecto);

    res.status(200).json({ message: "Proyecto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar proyecto:", error);
    res.status(500).json({ message: "Error interno al eliminar el proyecto" });
  }
};