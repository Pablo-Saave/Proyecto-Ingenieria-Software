import http from "http";
import { app, initializeApp } from "./src/app.js";
import { PORT } from "./src/config/configEnv.js";
import { initSocket } from "./src/sockets/socket.js";

async function startServer(port = Number(PORT)) {
  // Inicializar la aplicación y conectar a la base de datos
  await initializeApp();

  // Socket.io necesita el servidor http "crudo", no la app de Express directamente,
  // por eso envolvemos app en http.createServer() en vez de usar app.listen() como antes.
  const httpServer = http.createServer(app);

  initSocket(httpServer);

  const server = httpServer.listen(port, () => {
    console.log(`\nServidor ejecutándose en http://localhost:${port}`);
    console.log(`   Socket.io activo`);
    console.log(`   Presiona Ctrl+C para detener el servidor\n`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Puerto ${port} ocupado. Cierra el proceso que lo usa o cambia la variable PORT.`);
      process.exit(1);
    }

    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error("Error al iniciar el servidor:", error);
  process.exit(1);
});