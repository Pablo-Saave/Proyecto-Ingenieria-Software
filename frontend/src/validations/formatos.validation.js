// src/validations/formatos.validation.js

/**
 * Espejo en frontend de `validations/formatos.validation.js` del backend.
 * Mismo algoritmo, mismos criterios -- la idea es que el usuario vea el
 * mismo error ANTES de gastar una llamada HTTP al backend.
 *
 * IMPORTANTE: esto es solo UX. El backend sigue siendo la fuente de verdad;
 * nunca hay que confiar en que el frontend "ya validó" -- por eso el backend
 * vuelve a correr las mismas validaciones igual.
 */

// ── RUT chileno ──────────────────────────────────────────────────────────────
export function rutValido(rut) {
  if (!rut || typeof rut !== 'string') return false;

  const limpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim();

  // Cuerpo (7 u 8 dígitos) + 1 dígito verificador
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
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);

  return dv === dvEsperado;
}

/**
 * Normaliza un RUT a formato canónico "XXXXXXXX-X" (sin puntos, con guion).
 * Úsala DESPUÉS de validar con rutValido() y ANTES de mandar el dato al
 * backend, para que en la base de datos siempre quede guardado igual sin
 * importar cómo lo haya escrito el usuario (con puntos, sin puntos, con o
 * sin guion). Si el RUT no tiene formato válido, devuelve el string tal cual
 * llegó (no es su responsabilidad validar, para eso está rutValido).
 */
export function formatearRut(rut) {
  if (!rut || typeof rut !== 'string') return rut;
 
  const limpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim();
 
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return rut;
 
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
 
  return `${cuerpo}-${dv}`;
}

// ── Teléfono chileno ─────────────────────────────────────────────────────────
export function telefonoCLValido(telefono) {
  if (!telefono || typeof telefono !== 'string') return false;
  return /^9\d{8}$/.test(telefono.trim());
}

// ── Correo electrónico ───────────────────────────────────────────────────────
export function correoValido(correo) {
  if (!correo || typeof correo !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

// ── Fecha de nacimiento (mayor de edad) ──────────────────────────────────────
export function esMayorDeEdad(fechaNacimiento, edadMinima = 18) {
  if (!fechaNacimiento) return false;

  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return false;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  const noHaCumplidoAnosEsteAno =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());

  if (noHaCumplidoAnosEsteAno) edad--;

  return edad >= edadMinima;
}

// ── Solo letras / solo números ───────────────────────────────────────────────
export function soloLetras(texto) {
  if (!texto || typeof texto !== 'string') return false;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(texto.trim());
}

export function soloLetrasSinEspacios(texto) {
  if (!texto || typeof texto !== 'string') return false;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/.test(texto.trim());
}

export function soloNumeros(texto) {
  if (texto === null || texto === undefined) return false;
  return /^\d+$/.test(String(texto).trim());
}