import { app, initializeApp } from "./src/app.js";
import { PORT } from "./src/config/configEnv.js";

async function startServer() {
  // Inicializar la aplicación y conectar a la base de datos
  await initializeApp();

  // Levantar el servidor
  app.listen(PORT, () => {
    console.log(`\nServidor ejecutándose en http://localhost:${PORT}`);
    console.log(`   Presiona Ctrl+C para detener el servidor\n`);
  });
}

startServer().catch((error) => {
  console.error("Error al iniciar el servidor:", error);
  process.exit(1);
});
