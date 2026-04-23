const express = require("express");
const { connectDB } = require("./src/config/configDb");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

connectDB();

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});