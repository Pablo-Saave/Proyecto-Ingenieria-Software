// Inventario

import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";

import {
    crearInventario,
    eliminarInventario,
    crearMaterialLimpiezaInventario,
    actualizarMaterialLimpiezaInventario,
    eliminarMaterialLimpiezaInventario,
    getAllInventariosFromMyProyecto,
    getAllLowStockInventariosFromMyProyecto,
    getAllMaterialesFromAnInventario
} from "../controllers/inventario.controller.js";

import {
    validarActualizarMaterial,
    validarCrearInventario,
    validarCrearMaterial,
    validarEliminarInventario,
    validarGetAllInventarios,
    validarGetAllMateriales,

} from "../validations/inventario.validation.js";

const router = Router();

// Supervisor

router.post("/", authMiddleware, validarCrearInventario, crearInventario); // Crea un inventario (recibe {nombre_inventario} y token con id_trabajador) (retorna {status, message}) (Validacion 1: Crea un inventario en el proyecto cuyo atributo de proyecto "id_supervisor" coincida con el "id_trabajador" entregado por el token del que realiza la peticion) (Validacion 2: El que realiza la peticion debe tener tipo_usuario = supervisor) (Validacion 3: El proyecto debe tener estado = activo) (Validacion 4: No pueden existir campos vacios)
router.delete("/", authMiddleware, validarEliminarInventario, eliminarInventario); // Elimina un inventario y sus materiales en cascada (recibe {id_inventario} y token con id_trabajador) (retorna {status, message}) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = supervisor) (Validacion 2: El proyecto debe tener estado = activo) (Validacion 3: El atributo id_supervisor del proyecto debe coincidir con id_trabajador del que hace la peticion)

router.get("/", authMiddleware, validarGetAllInventarios, getAllInventariosFromMyProyecto); // Retorna todos los inventarios de un proyecto (recibe token con id_trabajador) (Retorna lista de inventarios [{id_inventario, nombre_inventario}, ..]) (Paginado y ordenado alfabeticamente segun nombre_inventario) (recibe page, limit y token con id_trabajador) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = supervisor) (Validacion 2: El proyecto que posee los inventarios a retornar es aquel cuyo atributo id_supervisor coincida con el id_trabajador del que realiza la peticion)
router.get("/lowStock/", authMiddleware, validarGetAllInventarios, getAllLowStockInventariosFromMyProyecto); // Retorna todos los inventarios de un proyecto que cumpla la condicion (Al menos uno de sus materiales de limpieza cumpla stock_actual < stock_minimo) (Paginado y ordenado alfabeticamente segun nombre_inventario) (recibe page, limit y token con id_trabajador) (Retorna lista de inventarios [{id_inventario, nombre_inventario}, ..]) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = supervisor) (Validacion 2: El proyecto que posee los inventarios a retornar es aquel cuyo atributo id_supervisor coincida con el id_trabajador del que realiza la peticion)
router.get("/:id_inventario", authMiddleware, validarGetAllMateriales, getAllMaterialesFromAnInventario); // Retorna todos los materiales de un inventario (recibe id_inventario y token con id_trabajador) (Retorna lista de informacion del material [{id_inventario, id_material, nombre_material, tipo_material, stock_actual, stock_minimo}, ..]) (Paginado y ordenado alfabeticamente segun nombre_material) (recibe page, limit y token con id_trabajador) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = supervisor) (Validacion 2: El atributo id_supervisor del proyecto al cual el id_inventario pertenece debe coincidir con el id_trabajador en el token del que realiza la consulta)

router.post("/material/", authMiddleware, validarCrearMaterial, crearMaterialLimpiezaInventario); // Crea un material de limpieza en un inventario (recibe  {id_inventario, nombre_material, tipo_material, stock_actual, stock_minimo} y token con id_trabajador) (Validacion 1: El inventario debe existir) (Validacion 2: El que realiza la peticion debe tener tipo_usuario = supervisor) (Validacion 3: No pueden existir campos vacios) (Validacion 4: El atributo id_supervisor del proyecto al cual el inventario pertenece, debe coincidir con el id_trabajador entregado por el token)
router.patch("/material/:id_material", authMiddleware, validarActualizarMaterial, actualizarMaterialLimpiezaInventario); // Actualiza la informacion de un material de limpieza de un inventario (Recibe id_material, {nombre_material, tipo_material, stock_actual, stock_minimo}) (Validacion 1: El atributo id_supervisor del proyecto al cual este material pertenece debe coincidir con el id_trabajador del token suministrado en la consulta) (Validacion 2: El que realiza la peticion debe tener tipo_usuario = supervisor) (Validacion 3: El id_material debe existir) (Validacion 4: El proyecto del cual este material pertenece debe tener estado = activo)
router.delete("/material/:id_material", authMiddleware, validarActualizarMaterial, eliminarMaterialLimpiezaInventario); // Elimina un material de limpieza de un inventario (Recibe id_material) (Validacion 1: El atributo id_supervisor del proyecto al cual este material pertenece debe coincidir con el id_trabajador del token suministrado en la consulta) (Validacion 2: El que realiza la peticion debe tener tipo_usuario = supervisor) (Validacion 3: El id_material debe existir) (Validacion 4: El proyecto del cual este material pertenece debe tener estado = activo)

export default router;