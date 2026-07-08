// src/validations/trabajador.validation.js

import {
  rutValido,
  telefonoCLValido,
  correoValido,
  esMayorDeEdad,
  soloLetras,
} from './formatos.validation.js';

const TIPOS_USUARIO_VALIDOS = ['trabajador', 'supervisor', 'administrador'];

/**
 * Espejo de `validarCrearTrabajador` del backend, adaptado a frontend:
 * en vez de middleware (req, res, next) recibe el formData directo y
 * devuelve { valido, mensaje } -- en el navegador no hay req/res.
 *
 * Se valida en el MISMO ORDEN y con los MISMOS MENSAJES que el backend,
 * para que si algo se escapa acá, lo que devuelva el backend no sorprenda
 * al usuario con un mensaje distinto al que ya vio (o hubiera visto).
 */
export function validarCrearTrabajador(formData) {
  const { tipo_usuario, rut, nombres, apellidos, telefono, correo, fecha_nacimiento } = formData;

  if (!tipo_usuario || !rut || !nombres || !apellidos || !correo) {
    return {
      valido: false,
      mensaje: 'Faltan campos obligatorios: tipo_usuario, rut, nombres, apellidos, correo',
    };
  }

  if (!TIPOS_USUARIO_VALIDOS.includes(tipo_usuario)) {
    return {
      valido: false,
      mensaje: `tipo_usuario inválido. Valores permitidos: ${TIPOS_USUARIO_VALIDOS.join(', ')}`,
    };
  }

  if (!rutValido(rut)) {
    return { valido: false, mensaje: 'El RUT ingresado no es válido' };
  }

  if (!soloLetras(nombres)) {
    return { valido: false, mensaje: 'El nombre solo puede contener letras' };
  }

  if (!soloLetras(apellidos)) {
    return { valido: false, mensaje: 'El apellido solo puede contener letras' };
  }

  if (!correoValido(correo)) {
    return { valido: false, mensaje: 'El correo ingresado no es válido' };
  }

  // Teléfono es opcional: solo se valida si viene con algo escrito
  if (telefono && !telefonoCLValido(telefono)) {
    return {
      valido: false,
      mensaje: 'El teléfono debe tener 9 dígitos y comenzar con 9 (ej: 912345678)',
    };
  }

  if (fecha_nacimiento && !esMayorDeEdad(fecha_nacimiento, 18)) {
    return { valido: false, mensaje: 'El trabajador debe ser mayor de 18 años' };
  }

  return { valido: true, mensaje: null };
}

/**
 * Espejo de `validarActualizarTrabajador`: mismos campos, pero cada uno
 * solo se valida SI trae contenido (en un form controlado de React los
 * campos nunca son `undefined`, así que acá el criterio de "no vino" es
 * el string vacío, a diferencia del backend que usa `!== undefined`).
 */
export function validarActualizarTrabajador(formData) {
  const { tipo_usuario, rut, nombres, apellidos, telefono, correo, fecha_nacimiento } = formData;

  if (tipo_usuario && !TIPOS_USUARIO_VALIDOS.includes(tipo_usuario)) {
    return {
      valido: false,
      mensaje: `tipo_usuario inválido. Valores permitidos: ${TIPOS_USUARIO_VALIDOS.join(', ')}`,
    };
  }

  if (rut && !rutValido(rut)) {
    return { valido: false, mensaje: 'El RUT ingresado no es válido' };
  }

  if (nombres && !soloLetras(nombres)) {
    return { valido: false, mensaje: 'El nombre solo puede contener letras' };
  }

  if (apellidos && !soloLetras(apellidos)) {
    return { valido: false, mensaje: 'El apellido solo puede contener letras' };
  }

  if (correo && !correoValido(correo)) {
    return { valido: false, mensaje: 'El correo ingresado no es válido' };
  }

  if (telefono && !telefonoCLValido(telefono)) {
    return {
      valido: false,
      mensaje: 'El teléfono debe tener 9 dígitos y comenzar con 9 (ej: 912345678)',
    };
  }

  if (fecha_nacimiento && !esMayorDeEdad(fecha_nacimiento, 18)) {
    return { valido: false, mensaje: 'El trabajador debe ser mayor de 18 años' };
  }

  return { valido: true, mensaje: null };
}