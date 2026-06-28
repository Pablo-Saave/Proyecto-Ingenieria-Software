// routes/aviso.routes.js
import { Router } from "express";
import {
  verAvisos,
  crearAviso,
  editarAviso,
  eliminarAviso
} from "../controllers/aviso.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { autorizar }      from "../middlewares/autorizar.middleware.js";

const router = Router();
router.use(authMiddleware);

// Administrador / Supervisor / Trabajador
router.get("/cuadrilla/:id_cuadrilla", verAvisos); // Retorna lista de avisos de una id_cuadrilla (tupla entera de entidad Aviso) [Paginado y Ordenado (orden por fecha_publicacion (por defecto))] (recibe id_cuadrilla, page, limit, orden) (Validacion 1: El que hace la peticion debe ser tipo_usuario = administrador, o pertenecer a la cuadrilla) (Valiacion 2: La cuadrilla debe existir)

// Administrador / Supervisor
router.post("/cuadrilla/:id_cuadrilla", crearAviso); // Crea un aviso en una cuadrilla (recibe id_cuadrilla, titulo, contenido, prioridad) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor tiene que pertenecer a la cuadrilla) (Validacion 2: La cuadrilla debe existir) (Validacion 3: El proyecto debe tener estado activo) (Validacion 4: La cuadrilla debe tener estado activa) (Validacion 5: Los campos esperados no pueden estar vacios) (Validacion 6: El atributo "publicado_por" de Aviso debe ser completado con nombre y apellido de el id_trabajador que realiza el aviso)
router.patch("/:id_aviso", editarAviso); // Edita los campos *solo el autor del aviso puede editarlo* (titulo, contenido, prioridad) de un aviso (Validacion 1: El aviso solo puede ser editado por el id_trabajador guardado en id_autor) (Validacion 2: El aviso debe existir) (Validacion 3: El proyecto debe tener estado activo) (Validacion 4: La cuadrilla debe tener estado activa)
router.delete("/:id_aviso", eliminarAviso); // Elimina un aviso (recibe id_aviso) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor tiene que pertenecer a la cuadrilla) (Validacion 2: En caso que el tipo_usuario sea supervisor, el aviso solo podra ser eliminado si su id_trabajador coincide con el id_autor de el aviso, es decir los supervisores solo pueden eliminar sus avisos.) (Validacion 3: El aviso debe existir) (Validacion 4: La cuadrilla debe tener estado activa) (Validacion 5: El proyecto debe tener estado activo)


export default router;
