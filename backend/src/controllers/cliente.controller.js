"use strict";

import { ClienteSchema } from "../entities/cliente.entity.js";
import { AppDataSource } from "../config/configDb.js";

const clienteRepo = AppDataSource.getRepository(ClienteSchema);

export const getClientes = async (req, res) => {
  try {
    const clientes = await clienteRepo.find();

    if (clientes.length === 0) {
      return res.status(404).json({ message: "No se encontraron clientes" });
    }

    res.status(200).json(clientes);
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    res.status(500).json({ message: "Error interno al obtener clientes" });
  }
};

export const crearCliente = async (req, res) => {
  try {
    const {
      nombres,
      apellidos,
      tipo_cliente,
      rubro,
      telefono,
      correo,
      direccion,
    } = req.body;

    if (!nombres || !apellidos || !tipo_cliente || !rubro || !telefono || !correo || !direccion) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const nuevoCliente = clienteRepo.create({
      nombres,
      apellidos,
      tipo_cliente,
      rubro,
      telefono,
      correo,
      direccion,
    });

    await clienteRepo.save(nuevoCliente);

    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error("Error al crear cliente:", error);
    res.status(500).json({ message: "Error interno al crear el cliente" });
  }
};

export const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombres,
      apellidos,
      tipo_cliente,
      rubro,
      telefono,
      correo,
      direccion,
    } = req.body;

    if (!nombres || !apellidos || !tipo_cliente || !rubro || !telefono || !correo || !direccion) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const cliente = await clienteRepo.findOneBy({ id_cliente: parseInt(id) });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    clienteRepo.merge(cliente, {
      nombres,
      apellidos,
      tipo_cliente,
      rubro,
      telefono,
      correo,
      direccion,
    });

    await clienteRepo.save(cliente);

    res.status(200).json(cliente);
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({ message: "Error interno al actualizar el cliente" });
  }
};

export const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await clienteRepo.findOneBy({ id_cliente: parseInt(id) });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    await clienteRepo.remove(cliente);

    res.status(200).json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    res.status(500).json({ message: "Error interno al eliminar el cliente" });
  }
};