// validations/aviso.validation.js

const PRIORIDADES_VALIDAS = ["baja", "normal", "alta", "urgente"];

// ─── Helpers de formato ────────────────────────────────────────────────────────

const esIdNumerico = (valor) => !isNaN(Number(valor)) && valor !== "";

// ─── Validaciones de campos ────────────────────────────────────────────────────

export const validarCamposCrear = ({ titulo, contenido, prioridad }) => {
  if (!titulo?.trim())    return "El título es obligatorio";
  if (titulo.length > 150) return "El título no puede superar los 150 caracteres";
  if (!contenido?.trim()) return "El contenido es obligatorio";
  if (prioridad !== undefined && !PRIORIDADES_VALIDAS.includes(prioridad))
    return `Prioridad inválida. Valores permitidos: ${PRIORIDADES_VALIDAS.join(", ")}`;
  return null;
};

export const validarCamposEditar = ({ titulo, contenido, prioridad }) => {
  if (titulo === undefined && contenido === undefined && prioridad === undefined)
    return "Debe enviar al menos un campo para actualizar";
  if (titulo !== undefined && !titulo.trim())     return "El título no puede estar vacío";
  if (titulo !== undefined && titulo.length > 150) return "El título no puede superar los 150 caracteres";
  if (contenido !== undefined && !contenido.trim()) return "El contenido no puede estar vacío";
  if (prioridad !== undefined && !PRIORIDADES_VALIDAS.includes(prioridad))
    return `Prioridad inválida. Valores permitidos: ${PRIORIDADES_VALIDAS.join(", ")}`;
  return null;
};

// Validaciones de acceso por rol 

export const validarAccesoLectura = (tipo_usuario) => {
  // Todos los roles pueden leer avisos de su unidad
  const rolesPermitidos = ["administrador", "supervisor", "trabajador"];
  if (!rolesPermitidos.includes(tipo_usuario))
    return "No tiene permisos para ver avisos";
  return null;
};

export const validarAccesoCrear = (tipo_usuario) => {
  // Solo administrador y supervisor pueden crear avisos
  if (!["administrador", "supervisor"].includes(tipo_usuario))
    return "Solo administradores y supervisores pueden crear avisos";
  return null;
};

export const validarAccesoEliminar = (tipo_usuario) => {
  // Solo administrador y supervisor pueden eliminar avisos
  if (!["administrador", "supervisor"].includes(tipo_usuario))
    return "Solo administradores y supervisores pueden eliminar avisos";
  return null;
};

// Validaciones de parámetros de ruta/query 

export const validarIdCuadrilla = (id_cuadrilla) => {
  if (!esIdNumerico(id_cuadrilla)) return "id_cuadrilla debe ser un número válido";
  return null;
};

export const validarIdAviso = (id_aviso) => {
  if (!esIdNumerico(id_aviso)) return "id_aviso debe ser un número válido";
  return null;
};

export const normalizarPaginacion = ({ page, limit }) => ({
  page:  Math.max(1, Number(page)  || 1),
  limit: Math.max(1, Number(limit) || 10),
});