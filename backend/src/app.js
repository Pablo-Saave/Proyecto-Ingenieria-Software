import express from "express";
import cors from "cors";
import "reflect-metadata";
import { connectDB } from "./config/configDb.js";
import clienteRoutes from "./routes/cliente.routes.js";
import ausenciaRoutes from "./routes/ausencia.routes.js";
import asignadoRoutes from "./routes/asignado.routes.js";
import contratoRoutes from "./routes/contrato.routes.js";
import trabajadorRoutes from "./routes/trabajador.routes.js";
import proyectoRoutes from "./routes/proyecto.routes.js";
import remuneracionRoutes from "./routes/remuneracion.routes.js";
import etiquetaRoutes from "./routes/etiqueta.routes.js";

export const app = express();

app.use(express.json());
app.use(cors());

export async function initializeApp() {
  try {
    await connectDB();
    console.log("Base de datos conectada correctamente");
  } catch (error) {
    console.error("Error durante la inicialización:", error);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "API funcionando correctamente",
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/clientes", clienteRoutes);
app.use("/api/ausencias", ausenciaRoutes);
app.use("/api/asignados", asignadoRoutes);
app.use("/api/contratos", contratoRoutes);
app.use("/api/trabajadores", trabajadorRoutes);
app.use("/api/proyectos", proyectoRoutes);
app.use("/api/remuneraciones", remuneracionRoutes);
app.use("/api/etiquetas", etiquetaRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method,
  });
});

export default app;