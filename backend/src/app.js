import express from "express";
import cors from "cors";
import "reflect-metadata";
import { connectDB } from "./config/configDb.js";
import clienteRoutes from "./routes/cliente.routes.js";

export const app = express();

// Configurar middlewares
app.use(express.json());
app.use(cors());

// Conectar a la base de datos al iniciar
export async function initializeApp() {
  try {
    await connectDB();
    console.log("✓ Base de datos conectada correctamente");
  } catch (error) {
    console.error("✗ Error durante la inicialización:", error);
    process.exit(1);
  }
}

// Endpoint base
app.get("/", (req, res) => {
  res.json({
    message: "API funcionando correctamente",
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

// Rutas
app.use("/api/clientes", clienteRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method,
  });
});

export default app;
