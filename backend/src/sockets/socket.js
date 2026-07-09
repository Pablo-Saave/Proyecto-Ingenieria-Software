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

// Valida el token del cliente al establecer la conexión con Socket.IO.
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
      
    });
  });

  return io;
}

export function getIO() {
  return io;
}