import express from "express";
import cors from "cors";
import "reflect-metadata";
import { connectDB } from "./config/configDb.js";
import clienteRoutes from "./routes/cliente.routes.js";
import ausenciaRoutes from "./routes/ausencia.routes.js";
import justificacionRoutes from "./routes/justificacion.routes.js";
import asignadoRoutes from "./routes/asignado.routes.js";
import contratoRoutes from "./routes/contrato.routes.js";
import trabajadorRoutes from "./routes/trabajador.routes.js";
import proyectoRoutes from "./routes/proyecto.routes.js";
import remuneracionRoutes from "./routes/remuneracion.routes.js"
import rolRoutes from "./routes/rol.routes.js";
import { seedRoles } from "./seeders/rol.seeder.js";
import { seedTrabajadores } from "./seeders/trabajador.seeder.js";
import { seedContratos } from "./seeders/contrato.seeder.js";

export const app = express();

// Configurar middlewares
app.use(express.json());
app.use(cors());

// Conectar a la base de datos al iniciar
export async function initializeApp() {
  try {
    await connectDB();
    console.log("Base de datos conectada correctamente");
    
    // Ejecutar seeders en orden: roles -> trabajadores -> contratos
    await seedRoles();
    await seedTrabajadores();
    await seedContratos();
  } catch (error) {
    console.error("Error durante la inicialización:", error);
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
app.use("/api/ausencias", ausenciaRoutes);
app.use("/api/justificaciones", justificacionRoutes);
app.use("/api/asignados", asignadoRoutes);
app.use("/api/contratos", contratoRoutes);
app.use("/api/trabajadores", trabajadorRoutes);
app.use("/api/proyectos", proyectoRoutes);
app.use("/api/remuneraciones", remuneracionRoutes);
app.use("/api/roles", rolRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method,
  });
});

export default app;
