// Inventario

import { Router } from "express";

import {
    crearInventario,
    eliminarInventario,
    getAllInventariosAndMaterialesFromCuadrilla,
    crearMaterialLimpiezaInventario,
    actualizarMaterialLimpiezaInventario,
    eliminarMaterialLimpiezaInventario

} from "../controllers/inventario.controller.js";

const router = Router();

// Admin
/* LISTO */router.post("/", crearInventario); // Crea un inventario (Recibe id_cuadrilla, nombre_inventario) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla) (Validacion 2: El proyecto debe existir) (Validacion 3: La cuadrilla debe existir) (Validacion 4: El proyecto debe tener estado "activo") (Validacion 5: La cuadrilla debe tener estado "activa") (Validacion 6: No deben existir campos vacios) (Validacion 7: No debe existir un inventario con el mismo nombre dentro de la misma cuadrilla)
/* LISTO */router.delete("/", eliminarInventario); // Elimina un inventario (Recibe id_inventario) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla del inventario) (Validacion 2: El inventario debe existir) (Validacion 3: El proyecto debe tener estado "activo") (Validacion 4: La cuadrilla debe tener estado "activa") (Validacion 5: No deben existir campos vacios) (Validacion 6: No se puede eliminar un inventario que posea material_limpieza, osea solo se pueden eliminar inventarios vacios)

// Admin - Supervisor - Bodeguero
/* LISTO */ router.get("/:id_cuadrilla", getAllInventariosAndMaterialesFromCuadrilla); // Obtiene todos los inventarios y materiales de limpieza de una cuadrilla (Recibe id_cuadrilla) (paginada con page y limit) (devuelve una lista con {id_inventario, nombre inventario, [tuplas de material limpieza del inventario]}) (Los inventarios y materiales deben estar ordenados en orden alfabetico por nombre_inventario y nombre_material) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador, tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla, o tipo_usuario = trabajador, si es trabajador debe pertenecer a la cuadrilla y ser bodeguero, osea en la tabla asignado tener es_bodeguero = true) (Validacion 2: La cuadrilla debe existir) (Validacion 3: El proyecto debe tener estado activo) (Validacion 4: La cuadrilla debe tener estado activa)
/* LISTO */ router.post("/material/", crearMaterialLimpiezaInventario); // Crea un material limpieza para un inventario (Recibe id_inventario, nombre_material, tipo_material, stock_actual, stock_minimo) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador, tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla, o tipo_usuario = trabajador, si es trabajador debe pertenecer a la cuadrilla y ser bodeguero, osea en la tabla asignado tener es_bodeguero = true) (Validacion 2: El inventario debe existir) (Validacion 3: La cuadrilla debe existir) (Validacion 4: El proyecto debe tener estado activo) (Validacion 5: La cuadrilla debe tener estado activa) (Validacion 6: No deben existir campos vacios) (Validacion 7: No deben existir dos material limpieza con el mismo nombre en el mismo inventario) (Validacion 8: Los valores numericos no pueden ser negativos)
/* LISTO */ router.patch("/material/", actualizarMaterialLimpiezaInventario); // Actualiza un material de limpieza (Recibe id_material y uno o muchos atributos como, nombre_material, tipo_material, stock_actual y stock_minimo) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador, tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla, o tipo_usuario = trabajador, si es trabajador debe pertenecer a la cuadrilla y ser bodeguero, osea en la tabla asignado tener es_bodeguero = true) (Validacion 2: El material_limpieza debe existir) (Validacion 3: El proyecto debe tener estado activo) (Validacion 4: La cuadrilla debe tener estado activa) (Validacion 5: No deben existir campos vacios) (Validacion 6: No deben existir dos material limpieza con el mismo nombre en el mismo inventario) (Validacion 7: Los valores numericos no pueden ser negativos)
/* LISTO */ router.delete("/material/", eliminarMaterialLimpiezaInventario); // Elimina un material de limpieza de un inventario (Recibe id_material) (Validacion 1: El que realiza la peticion debe tener tipo_usuario = administrador, tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla, o tipo_usuario = trabajador, si es trabajador debe pertenecer a la cuadrilla y ser bodeguero, osea en la tabla asignado tener es_bodeguero = true) (Validacion 2: El material_limpieza debe existir) (Validacion 3: El proyecto debe tener estado activo) (Validacion 4: La cuadrilla debe tener estado activa)

export default router;