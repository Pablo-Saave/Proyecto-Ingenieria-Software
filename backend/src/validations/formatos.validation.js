// validations/formatos.validation.js
"use strict";

/**
 * Este archivo NO valida lógica de negocio (como "el proyecto debe estar
 * activo"). Solo valida FORMATO: ¿el dato que llegó tiene la forma correcta?
 * Por eso vive separado de cada *.validation.js de módulo — un RUT se valida
 * igual sin importar si es de un Trabajador, un Cliente o un Supervisor.
 */

// ── RUT chileno ──────────────────────────────────────────────────────────────
/**
 * Verifica el dígito verificador de un RUT chileno (algoritmo módulo 11).
 *
 * Cómo funciona, paso a paso:
 * 1. Se limpia el RUT de puntos y guión: "12.345.678-K" -> "12345678K"
 * 2. Se separa el "cuerpo" (los números) del "dígito verificador" (dv):
 *    cuerpo = "12345678", dv = "K"
 * 3. Se recorre el cuerpo DE DERECHA A IZQUIERDA, multiplicando cada dígito
 *    por una secuencia que va 2,3,4,5,6,7,2,3,4,5,6,7... (y vuelve a 2)
 * 4. Se suman todos esos productos
 * 5. Se calcula 11 - (suma % 11). Si da 11 -> el dv esperado es "0".
 *    Si da 10 -> el dv esperado es "K". Cualquier otro caso, es ese número.
 * 6. Si el dv calculado coincide con el que venía en el RUT, es válido.
 */
function rutValido(rut) {
  if (!rut || typeof rut !== "string") return false;

  const limpio = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase().trim();

  // Un RUT válido tiene el cuerpo (7 u 8 dígitos) + 1 dígito verificador
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);

  return dv === dvEsperado;
}

// ── Teléfono chileno ─────────────────────────────────────────────────────────
/**
 * Un celular chileno sin el +56 se ve así: 9 1234 5678
 * Reglas: 9 dígitos exactos, el primero debe ser "9", solo números (nada de
 * espacios, guiones ni letras — por eso NO uso espacios opcionales en el regex,
 * a diferencia de la validación de "formato visual" que sí los toleraría).
 *
 * ^9      -> debe EMPEZAR con 9
 * \d{8}$  -> seguido de exactamente 8 dígitos más (9 en total) y termina ahí
 */
function telefonoCLValido(telefono) {
  if (!telefono || typeof telefono !== "string") return false;
  return /^9\d{8}$/.test(telefono.trim());
}

// ── Correo electrónico ───────────────────────────────────────────────────────
/**
 * Formato básico: algo@algo.algo
 * No es un validador RFC 5322 completo (esos son enormes y exagerados para
 * un formulario) — cubre el 99% de los casos reales: sin espacios, con un
 * solo @, con un dominio que tenga al menos un punto.
 */
function correoValido(correo) {
  if (!correo || typeof correo !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

// ── Fecha de nacimiento (mayor de edad) ──────────────────────────────────────
/**
 * Calcula la edad exacta (no solo resta años) y verifica que sea >= 18.
 *
 * Por qué no basta con "restar los años": si alguien nació el 05-julio-2008
 * y hoy es 01-julio-2026, restar años da 18, pero en realidad todavía le
 * faltan 4 días para cumplir 18. Por eso se ajusta con los meses/días.
 */
function esMayorDeEdad(fechaNacimiento, edadMinima = 18) {
  if (!fechaNacimiento) return false;

  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return false; // fecha inválida/no parseable

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  const noHaCumplidoAnosEsteAno =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());

  if (noHaCumplidoAnosEsteAno) edad--;

  return edad >= edadMinima;
}

// ── Solo letras / solo números ───────────────────────────────────────────────
/**
 * "Solo letras" incluye tildes, ñ, y espacios (para nombres compuestos como
 * "José Ignacio" o "Núñez"). Si necesitas SIN espacios, usa la versión
 * soloLetrasSinEspacios en su lugar.
 */
function soloLetras(texto) {
  if (!texto || typeof texto !== "string") return false;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(texto.trim());
}

function soloLetrasSinEspacios(texto) {
  if (!texto || typeof texto !== "string") return false;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/.test(texto.trim());
}

function soloNumeros(texto) {
  if (texto === null || texto === undefined) return false;
  return /^\d+$/.test(String(texto).trim());
}

export {
  rutValido,
  telefonoCLValido,
  correoValido,
  esMayorDeEdad,
  soloLetras,
  soloLetrasSinEspacios,
  soloNumeros,
};