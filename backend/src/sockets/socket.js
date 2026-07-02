// sockets/socket.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // en producción, restringe esto al dominio real del frontend
      methods: ["GET", "POST"],
    },
  });

  // Middleware de autenticación del handshake: el cliente debe mandar { auth: { token } }
  // Mismo secreto y mismo payload que usa auth.middleware.js para las rutas HTTP.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No autorizado: falta token"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = {
        id_trabajador: payload.id_trabajador,
        correo:        payload.correo,
        tipo_usuario:  payload.tipo_usuario,
      };

      next();
    } catch (error) {
      next(new Error("No autorizado: token inválido o expirado"));
    }
  });

  io.on("connection", (socket) => {
    const { id_trabajador } = socket.user;

    // Room privada del usuario: solo él recibe lo que se emita aquí
    socket.join(`trabajador_${id_trabajador}`);

    socket.on("disconnect", () => {
      // no hace falta hacer nada explícito, socket.io limpia la room solo
    });
  });

  return io;
}

export function getIO() {
  return io;
}