import express from "express";
import { connectDB } from "./src/config/configDb.js";
import userRoutes from "./src/routes/user.routes.js";

const app = express();

app.use(express.json());

// rutas
app.use("/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Backend funcionando [Nashe]");
});

// conexión DB
connectDB();

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});