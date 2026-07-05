import express from "express";
import cors from "cors";
import "reflect-metadata";
import { connectDB } from "./config/configDb.js";
import clienteRoutes from "./routes/cliente.routes.js";
import ausenciaRoutes from "./routes/ausencia.routes.js";
import asignacionRoutes from "./routes/asignacion.routes.js";
import contratoRoutes from "./routes/contrato.routes.js";
import trabajadorRoutes from "./routes/trabajador.routes.js";
import proyectoRoutes from "./routes/proyecto.routes.js";
import contratoProyectoRoutes from "./routes/contrato_proyecto.routes.js";
import cuadrillaRoutes from "./routes/cuadrilla.routes.js"
import remuneracionRoutes from "./routes/remuneracion.routes.js";
import avisoRoutes from "./routes/aviso.routes.js";
import notificacionRoutes from "./routes/notificacion.routes.js";
import authRoutes from "./routes/auth.routes.js";
import inventarioRoutes from "./routes/inventario.route.js"
import { iniciarCronContratos } from "./jobs/contratosCron.js";
import resetPasswordRoutes from './routes/resetPasswordRoutes.js';
import accidenteLaboralRoutes from './routes/accidente_laboral.routes.js'

import path from "path";
import { fileURLToPath } from "url";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir Frontend React
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
app.use(cors());

export async function initializeApp() {
  try {
    await connectDB();
    console.log("Base de datos conectada correctamente");

    // Iniciar job de contratos DESPUÉS de que la BD esté lista
    iniciarCronContratos();

  } catch (error) {
    console.error("Error durante la inicialización:", error);
    process.exit(1);
  }
}

app.use("/api/clientes",       clienteRoutes);
app.use("/api/ausencias",      ausenciaRoutes);
app.use("/api/asignaciones",   asignacionRoutes);
app.use("/api/contratos",      contratoRoutes);
app.use("/api/trabajadores",   trabajadorRoutes);
app.use("/api/proyectos",      proyectoRoutes);
app.use("/api/contratos-proyecto", contratoProyectoRoutes);
app.use("/api/cuadrilla",      cuadrillaRoutes);
app.use("/api/remuneraciones", remuneracionRoutes);
app.use("/api/avisos",         avisoRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/auth",           authRoutes);
app.use('/api/reset', resetPasswordRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/accidente_laboral', accidenteLaboralRoutes);

// Expone la carpeta uploads para servir archivos estáticos (imágenes, documentos, etc.) desde el backend 
app.use('/uploads', express.static('uploads'));

// React Router SPA Fallback
// Express entrega index.html
// React carga -> ve la URL -> renderiza la ruta que este en la URL
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

export default app;