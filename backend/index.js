import express from "express";
import { connectDB } from "./src/config/configDb.js";
import usuarioRoutes from "./src/routes/usuario.routes.js";
import ausenciaRoutes from "./src/routes/ausencia.routes.js";
import asignacionRoutes from "./src/routes/asignacion.routes.js";
import dashboardRoutes from "./src/routes/dashboard.routes.js";

const app = express();

app.use(express.json());

// rutas
app.use("/usuarios", usuarioRoutes);
app.use("/ausencias", ausenciaRoutes);
app.use("/asignaciones", asignacionRoutes);
app.use("/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("Backend funcionando [Nashe]");
});

// conexión DB
connectDB();

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});