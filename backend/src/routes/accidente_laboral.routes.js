import { Router } from "express";
import { editarAccidenteLaboral, getAccidentesFromMyProyecto, getAllAccidentesLaborales, getMisAccidentes, registrarAccidenteLaboral } from "../controllers/accidente_laboral.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validarEditarAccidenteLaboral, validarGetAccidentesFromMyProyecto, validarGetAllAccidentesLaborales, validarRegistrarAccidenteLaboral } from "../validations/accidente_laboral.validation.js";

const router = Router();

router.use(authMiddleware); // Verifica Login - Agrega info de quien consulta y permisos al request

// Admin
router.get("/admin/", authMiddleware, validarGetAllAccidentesLaborales, getAllAccidentesLaborales); // Retorna una lista paginada (recibe page y limit) de todos los accidentes laborales del sistema (Ordenados por fecha_accidente) (Permite filtrar por id_proyecto, en ese caso buscar los accidentes cuya id_cuadrilla pertenescan al id_proyecto entregado) (Permite filtrar por rut, en ese caso buscar el id_trabajador al cual el rut entregado pertenece) (Recibe token de identificacion) (Retornar {"status": {}, "data": [.., {..datos accidente, "trabajador": {datos trabajador accidentado}}]) (Validacion 1: El que realiza la consulta debe tener tipo_usuario = administrador)

// Supervisor
router.get("/supervisor/", authMiddleware, validarGetAccidentesFromMyProyecto, getAccidentesFromMyProyecto); // Retorna una lista paginada  (recibe page y limit) de todos los accidentes laborales del proyecto al cual el supervisor que consulta pertence (Ordenados por fecha_accidente) (Permite filtrar por id_cuadrilla, en ese caso buscar los accidentes que pertenecen al id_cuadrilla entregado) (Permite filtrar por rut, en ese caso buscar el id_trabajador al cual el rut entregado pertenece) (Recibe token de identificacion) (Retornar {"status": {}, "data": [.., {..datos accidente, "trabajador": {datos trabajador accidentado **sin contar hashed_pass**}}]}) (Validacion 1: El que realiza la consulta debe tener tipo_usuario = supervisor) (Validacion 2: Las id_cuadrilla de los accidentes deben pertenecer al proyecto cuyo id_supervisor es = al id_trabajador de quien hace la consulta)
router.post("/supervisor/", authMiddleware, validarRegistrarAccidenteLaboral, registrarAccidenteLaboral); // Registra un accidente laboral (Recibe {id_trabajador, id_cuadrilla, fecha_accidente, descripcion, gravedad, traslado, observaciones} y token de identificacion) (Validacion 1: El que realiza la consulta debe tener tipo_usuario = supervisor) (Validacion 2: El id_trabajador de el que realiza la consulta debe coincidir con el atributo id_supervisor de el proyecto al cual el trabajador(id_trabajador) accidentado pertenece) (Validacion 3: La cuadrilla debe tener estado = activa) (Validacion 4: El proyecto debe tener estado = activo)
router.patch("/supervisor/:id_accidente_laboral", authMiddleware, validarEditarAccidenteLaboral, editarAccidenteLaboral); // Actualiza los datos de un accidente laboral  (Recibe {descripcion, gravedad, traslado, observaciones} y token de identificacion) (Validacion 1: El que realiza la consulta debe tener tipo_usuario = supervisor) (Validacion 2: El id_trabajador de el que realiza la consulta debe coincidir con el atributo id_supervisor de el proyecto donde ocurrio el accidente laboral) (Validacion 3: La cuadrilla debe tener estado = activa) (Validacion 4: El proyecto debe tener estado = activo)

// Trabajador
router.get("/trabajador/", authMiddleware, getMisAccidentes); // Retorna una lista paginada  (recibe page y limit) de los accidentes laborales del trabajador (Recibe token de identificacion) (Retorna los accidentes laborales cuyo id_trabajador coincida con el id_trabajador del token, {"status": {}, "data": [.., {..datos accidente, "trabajador": {datos trabajador accidentado **sin contar hashed_pass**}}]}) 

export default router;