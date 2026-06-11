import { handleErrorClient } from "../handlers/responseHandlers.js";

export const autorizar = (permisoRequerido) => {
  return (req, res, next) => {

    if (!req.user) {
      return handleErrorClient(res, 401, "No autenticado.");
    }

    const tienePermiso = req.user.permisos.includes(permisoRequerido);

    if (!tienePermiso) {
      return handleErrorClient(
        res,
        403,
        `Acceso denegado. Se requiere el permiso: ${permisoRequerido}`
      );
    }

    next();
  };
};