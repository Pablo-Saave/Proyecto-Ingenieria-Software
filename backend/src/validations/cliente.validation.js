// validations/cliente.validation.js
"use strict";

import {
  correoValido,
  telefonoCLValido,
  soloLetras,
} from "./formatos.validation.js";

const TIPOS_CLIENTE_VALIDOS = ["Persona", "Empresa,", "Organización"];

// "empresa" -> "Empresa", "PERSONA" -> "Persona", " persona " -> "Persona"
function capitalizar(texto) {
  const limpio = String(texto).trim().toLowerCase();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/**
 * Middleware para POST /api/clientes
 *
 * Nota qué NO aparece acá: rutValido. Cliente no tiene columna de RUT en su
 * entidad, así que no hay nada que validar con esa función para este módulo.
 */
export function validarCrearCliente(req, res, next) {
  const { nombres, apellidos, tipo_cliente, telefono, correo } = req.body;

  // 1. Campos obligatorios (según la entidad: nombres, apellidos, correo)
  if (!nombres || !apellidos || !correo) {
    return res.status(400).json({
      status: "error",
      message: "Los campos nombres, apellidos y correo son obligatorios.",
    });
  }

  // 2. nombres y apellidos: solo letras
  if (!soloLetras(nombres)) {
    return res.status(400).json({ status: "error", message: "El nombre solo puede contener letras" });
  }
  if (!soloLetras(apellidos)) {
    return res.status(400).json({ status: "error", message: "El apellido solo puede contener letras" });
  }

  // 3. correo con formato válido
  if (!correoValido(correo)) {
    return res.status(400).json({ status: "error", message: "El correo ingresado no es válido" });
  }

  // 4. telefono: opcional (no tiene nullable:false en el schema), pero si viene, se valida
  if (telefono && !telefonoCLValido(telefono)) {
    return res.status(400).json({
      status: "error",
      message: "El teléfono debe tener 9 dígitos y comenzar con 9 (ej: 912345678)",
    });
  }

  // 5. tipo_cliente: solo si viene, debe ser un valor permitido
  //    (se normaliza con inicial mayúscula para no depender de cómo lo
  //    escriba el usuario o el frontend — "empresa", "EMPRESA" y "Empresa"
  //    son válidos por igual, y siempre se guarda como "Empresa")
  if (tipo_cliente !== undefined) {
    const normalizado = capitalizar(tipo_cliente);
    if (!TIPOS_CLIENTE_VALIDOS.includes(normalizado)) {
      return res.status(400).json({
        status: "error",
        message: `tipo_cliente inválido. Valores permitidos: ${TIPOS_CLIENTE_VALIDOS.join(", ")}`,
      });
    }
    // Reescribimos el body con el valor ya normalizado, así el controller
    // siempre guarda "Persona"/"Empresa" con el mismo formato exacto.
    req.body.tipo_cliente = normalizado;
  }

  // Nota: "direccion" y "rubro" NO se validan con soloLetras -> mismo motivo
  // que direccion en Proyecto: pueden (y suelen) tener números y símbolos.

  next();
}

/**
 * Middleware para PUT /api/clientes/:id
 * Igual que en Trabajador y Contrato: todos los campos son opcionales acá,
 * solo se valida lo que efectivamente venga en el body.
 */
export function validarActualizarCliente(req, res, next) {
  const { nombres, apellidos, tipo_cliente, telefono, correo } = req.body;

  if (nombres !== undefined && !soloLetras(nombres)) {
    return res.status(400).json({ status: "error", message: "El nombre solo puede contener letras" });
  }

  if (apellidos !== undefined && !soloLetras(apellidos)) {
    return res.status(400).json({ status: "error", message: "El apellido solo puede contener letras" });
  }

  if (correo !== undefined && !correoValido(correo)) {
    return res.status(400).json({ status: "error", message: "El correo ingresado no es válido" });
  }

  if (telefono !== undefined && !telefonoCLValido(telefono)) {
    return res.status(400).json({
      status: "error",
      message: "El teléfono debe tener 9 dígitos y comenzar con 9 (ej: 912345678)",
    });
  }

  if (tipo_cliente !== undefined) {
    const normalizado = capitalizar(tipo_cliente);
    if (!TIPOS_CLIENTE_VALIDOS.includes(normalizado)) {
      return res.status(400).json({
        status: "error",
        message: `tipo_cliente inválido. Valores permitidos: ${TIPOS_CLIENTE_VALIDOS.join(", ")}`,
      });
    }
    req.body.tipo_cliente = normalizado;
  }

  next();
}