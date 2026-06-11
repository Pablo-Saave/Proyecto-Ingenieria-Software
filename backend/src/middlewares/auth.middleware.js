// middlewares/auth.middleware.js

import jwt from "jsonwebtoken";
import { handleErrorClient } from "../handlers/responseHandlers.js";
import { getPermisosPorRol } from "../config/configPermisos.js";

export function authMiddleware(req, res, next) {

  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return handleErrorClient(res, 401, "Acceso denegado. No se proporcionó token.");
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return handleErrorClient(res, 401, "Acceso denegado. Token malformado.");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Adjuntar usuario decodificado + permisos calculados al request
    req.user = {
      id_trabajador: payload.id_trabajador,
      correo:        payload.correo,
      tipo_usuario:  payload.tipo_usuario,
      permisos:      getPermisosPorRol(payload.tipo_usuario),
    };

    next();

  } catch (error) {
    return handleErrorClient(res, 401, "Token inválido o expirado.", error.message);
  }
}