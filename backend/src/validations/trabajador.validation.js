// validations/trabajador.validation.js
"use strict";

import {
  rutValido,
  telefonoCLValido,
  correoValido,
  esMayorDeEdad,
  soloLetras,
} from "./formatos.validation.js";

const TIPOS_USUARIO_VALIDOS = ["trabajador", "supervisor", "administrador"];

/**
 * Middleware para POST /api/trabajadores
 * Nota cómo esta función SOLO valida forma de los datos (usando las
 * funciones de formatos.validation.js) — no consulta la base de datos, no
 * decide reglas de negocio. Eso simplemente no le corresponde a este archivo.
 */
export function validarCrearTrabajador(formData) {
  const { tipo_usuario, rut, nombres, apellidos, telefono, correo, fecha_nacimiento } = formData;
 
  if (!tipo_usuario || !rut || !nombres || !apellidos || !correo) {
    return {
      valido: false,
      mensaje: 'Faltan campos obligatorios: tipo_usuario, rut, nombres, apellidos, correo',
    };
  }

  // 1. Campos obligatorios presentes
  if (!tipo_usuario || !rut || !nombres || !apellidos || !correo) {
    return res.status(400).json({
      status: "error",
      message: "Faltan campos obligatorios: tipo_usuario, rut, nombres, apellidos, correo",
    });
  }

  // 2. tipo_usuario debe ser uno de los 3 valores permitidos
  if (!TIPOS_USUARIO_VALIDOS.includes(tipo_usuario)) {
    return res.status(400).json({
      status: "error",
      message: `tipo_usuario inválido. Valores permitidos: ${TIPOS_USUARIO_VALIDOS.join(", ")}`,
    });
  }

  // 3. Formato de RUT (dígito verificador incluido)
  if (!rutValido(rut)) {
    return res.status(400).json({ status: "error", message: "El RUT ingresado no es válido" });
  }

  // 4. Nombres y apellidos: solo letras (permite tildes, ñ y espacios)
  if (!soloLetras(nombres)) {
    return res.status(400).json({ status: "error", message: "El nombre solo puede contener letras" });
  }
  if (!soloLetras(apellidos)) {
    return res.status(400).json({ status: "error", message: "El apellido solo puede contener letras" });
  }

  // 5. Correo con formato válido
  if (!correoValido(correo)) {
    return res.status(400).json({ status: "error", message: "El correo ingresado no es válido" });
  }

  // 6. Teléfono: solo si viene (es opcional según el schema, no tiene nullable:false)
  if (telefono && !telefonoCLValido(telefono)) {
    return res.status(400).json({
      status: "error",
      message: "El teléfono debe tener 9 dígitos y comenzar con 9 (ej: 912345678)",
    });
  }

  // 7. Fecha de nacimiento: mayor de 18 años
  if (fecha_nacimiento && !esMayorDeEdad(fecha_nacimiento, 18)) {
    return res.status(400).json({
      status: "error",
      message: "El trabajador debe ser mayor de 18 años",
    });
  }

  next();
}

/**
 * Middleware para PUT /api/trabajadores/:id
 * A diferencia de "crear", en "editar" los campos son opcionales (el usuario
 * puede actualizar solo el teléfono, por ejemplo) — por eso cada validación
 * solo se aplica SI el campo viene en el body.
 */
export function validarActualizarTrabajador(req, res, next) {
  const { tipo_usuario, rut, nombres, apellidos, telefono, correo, fecha_nacimiento } = req.body;

  if (tipo_usuario !== undefined && !TIPOS_USUARIO_VALIDOS.includes(tipo_usuario)) {
    return res.status(400).json({
      status: "error",
      message: `tipo_usuario inválido. Valores permitidos: ${TIPOS_USUARIO_VALIDOS.join(", ")}`,
    });
  }

  if (rut !== undefined && !rutValido(rut)) {
    return res.status(400).json({ status: "error", message: "El RUT ingresado no es válido" });
  }

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

  if (fecha_nacimiento !== undefined && !esMayorDeEdad(fecha_nacimiento, 18)) {
    return res.status(400).json({
      status: "error",
      message: "El trabajador debe ser mayor de 18 años",
    });
  }

  next();
}