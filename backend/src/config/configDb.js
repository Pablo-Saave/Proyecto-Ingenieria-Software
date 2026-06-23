"use strict";
import { DataSource } from "typeorm";
import { DATABASE, DB_USERNAME, HOST, PASSWORD, DB_PORT } from "./configEnv.js";
import { TrabajadorSchema } from "../entities/trabajador.entity.js";
import { EtiquetaSchema } from "../entities/etiqueta.entity.js";
import { AusenciaSchema } from "../entities/ausencia.entity.js";
import { ContratoTrabajadorSchema } from "../entities/contrato_trabajador.entity.js";
import { AsignadoSchema } from "../entities/asignado.entity.js";
import { RemuneracionSchema } from "../entities/remuneracion.entity.js";
import { ProyectoSchema } from "../entities/proyecto.entity.js";
import { ClienteSchema } from "../entities/cliente.entity.js";
import { AvisoSchema } from "../entities/aviso.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: `${HOST}`,
  port: DB_PORT,
  username: `${DB_USERNAME}`,
  password: `${PASSWORD}`,
  database: `${DATABASE}`,
  entities: [
    TrabajadorSchema,
    EtiquetaSchema,
    AusenciaSchema,
    ContratoTrabajadorSchema,
    AsignadoSchema,
    RemuneracionSchema,
    ProyectoSchema,
    ClienteSchema,
    AvisoSchema,
  ],
  synchronize: true,
  logging: true,
});

export async function connectDB() {
  try {
    await AppDataSource.initialize();
    console.log("=> Conexión exitosa a la base de datos PostgreSQL!");
  } catch (error) {
    console.error("Error al conectar con la base de datos:", error);
    process.exit(1);
  }
}
