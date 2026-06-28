// controllers/aviso.controller.js
import { AppDataSource } from "../config/configDb.js";

const PRIORIDADES_VALIDAS = ["baja", "normal", "alta", "urgente"];

function getAvisoRepo()     { return AppDataSource.getRepository("Aviso"); }
function getTrabajadorRepo(){ return AppDataSource.getRepository("Trabajador"); }


/***
 * Retorna lista de avisos de una cuadrilla (tupla completa de la entidad Aviso)
 * Paginado y Ordenado por fecha_publicacion (por defecto)
 * Recibe: id_cuadrilla (param), page, limit (query params)
 * Validaciones:
 * - El que hace la peticion debe tener tipo_usuario = administrador, o pertenecer a la cuadrilla
 * - La cuadrilla debe existir
 */
export const verAvisos = async (req, res) => {
  try {
    const { id_cuadrilla } = req.params;
    const { id_trabajador, tipo_usuario: tipo_solicitante } = req.user;

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // 2. Validar que la cuadrilla exista
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // 1. Validar que sea administrador o pertenezca a la cuadrilla
    if (tipo_solicitante !== "administrador") {
      const pertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador,
          id_cuadrilla: Number(id_cuadrilla),
        },
      });

      if (!pertenece) {
        return res.status(403).json({
          message: "No tiene permisos para ver los avisos de esta cuadrilla",
        });
      }
    }

    let { page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const [avisos, total] = await avisoRepository.findAndCount({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      order: { fecha_publicacion: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return res.status(200).json({
      data: avisos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en verAvisos:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};








/***
 * Crea un aviso en una cuadrilla
 * Recibe: id_cuadrilla (param), titulo, contenido, prioridad (body)
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor,
 *   si es supervisor tiene que pertenecer a la cuadrilla
 * - La cuadrilla debe existir
 * - El proyecto debe tener estado activo
 * - La cuadrilla debe tener estado activa
 * - Los campos esperados no pueden estar vacios
 * - id_autor y nombre_autor se completan automáticamente con los datos del
 *   trabajador que realiza la petición (obtenidos del token)
 */
export const crearAviso = async (req, res) => {
  try {
    const { id_cuadrilla } = req.params;
    const { titulo, contenido, prioridad } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // 5. Validar que los campos esperados no estén vacíos
    if (!titulo || !contenido) {
      return res.status(400).json({
        message: "Los campos titulo y contenido son obligatorios",
      });
    }

    // 2. Validar que la cuadrilla exista (con su proyecto, para validar estados)
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // 3. Validar que el proyecto esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede crear el aviso porque el proyecto no está activo",
      });
    }

    // 4. Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede crear el aviso porque la cuadrilla no está activa",
      });
    }

    // 1. Validar quién realiza la petición: administrador (libre) o supervisor (debe pertenecer a la cuadrilla)
    if (tipo_solicitante !== "administrador") {
      if (tipo_solicitante !== "supervisor") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
      }

      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla: Number(id_cuadrilla),
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }
    }

    // 6. Obtener nombre y apellido del trabajador que realiza la petición,
    // para completar id_autor y nombre_autor automáticamente
    const autor = await trabajadorRepository.findOne({
      where: { id_trabajador: id_solicitante },
    });
    if (!autor) {
      return res.status(404).json({ message: "Trabajador (autor) no encontrado" });
    }

    const nuevoAviso = avisoRepository.create({
      id_cuadrilla: Number(id_cuadrilla),
      titulo,
      contenido,
      prioridad: prioridad || "normal",
      id_autor: id_solicitante,
      nombre_autor: `${autor.nombres} ${autor.apellidos}`,
    });

    await avisoRepository.save(nuevoAviso);

    return res.status(201).json({
      message: "Aviso creado correctamente",
      data: nuevoAviso,
    });
  } catch (error) {
    console.error("Error en crearAviso:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};











/***
 * Edita los campos (titulo, contenido, prioridad) de un aviso
 * Validaciones:
 * - El aviso debe existir
 * - El aviso solo puede ser editado por el id_trabajador guardado en id_autor
 * - El proyecto debe tener estado activo
 * - La cuadrilla debe tener estado activa
 */
export const editarAviso = async (req, res) => {
  try {
    const { id_aviso } = req.params;
    const { titulo, contenido, prioridad } = req.body;
    const { id_trabajador: id_solicitante } = req.user;

    if (isNaN(Number(id_aviso))) {
      return res.status(400).json({
        message: "id_aviso debe ser numérico",
      });
    }

    // Validar que al menos un campo haya sido enviado (PATCH parcial)
    if (titulo === undefined && contenido === undefined && prioridad === undefined) {
      return res.status(400).json({
        message: "Debe enviar al menos un campo para actualizar",
      });
    }

    // 0. Validar que el aviso exista
    const aviso = await avisoRepository.findOne({
      where: { id_aviso: Number(id_aviso) },
      relations: ["cuadrilla", "cuadrilla.proyecto"],
    });
    if (!aviso) {
      return res.status(404).json({ message: "Aviso no encontrado" });
    }

    // 2. Validar que el proyecto esté activo
    if (aviso.cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede editar el aviso porque el proyecto no está activo",
      });
    }

    // 3. Validar que la cuadrilla esté activa
    if (aviso.cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede editar el aviso porque la cuadrilla no está activa",
      });
    }

    // 1. Validar que solo el autor pueda editar el aviso
    if (aviso.id_autor !== id_solicitante) {
      return res.status(403).json({
        message: "No tiene permisos para editar este aviso",
      });
    }

    // Aplicar solo los campos enviados
    if (titulo !== undefined) aviso.titulo = titulo;
    if (contenido !== undefined) aviso.contenido = contenido;
    if (prioridad !== undefined) aviso.prioridad = prioridad;

    await avisoRepository.save(aviso);

    return res.status(200).json({
      message: "Aviso actualizado correctamente",
      data: aviso,
    });
  } catch (error) {
    console.error("Error en editarAviso:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};













/***
 * Elimina un aviso
 * Recibe: id_aviso (param)
 * Validaciones:
 * - El aviso debe existir
 * - El proyecto debe tener estado activo
 * - La cuadrilla debe tener estado activa
 * - El que realiza la peticion debe tener tipo_usuario = administrador (libre),
 *   o tipo_usuario = supervisor y pertenecer a la cuadrilla
 * - Si es supervisor, solo puede eliminar avisos donde id_autor coincida con su propio id_trabajador
 */
export const eliminarAviso = async (req, res) => {
  try {
    const { id_aviso } = req.params;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    if (isNaN(Number(id_aviso))) {
      return res.status(400).json({
        message: "id_aviso debe ser numérico",
      });
    }

    // 3. Validar que el aviso exista (con su cuadrilla y proyecto, para validar estados y pertenencia)
    const aviso = await avisoRepository.findOne({
      where: { id_aviso: Number(id_aviso) },
      relations: ["cuadrilla", "cuadrilla.proyecto"],
    });
    if (!aviso) {
      return res.status(404).json({ message: "Aviso no encontrado" });
    }

    // 5. Validar que el proyecto esté activo
    if (aviso.cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede eliminar el aviso porque el proyecto no está activo",
      });
    }

    // 4. Validar que la cuadrilla esté activa
    if (aviso.cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede eliminar el aviso porque la cuadrilla no está activa",
      });
    }

    // 1. Validar quién realiza la petición: administrador (libre) o supervisor (debe pertenecer a la cuadrilla)
    if (tipo_solicitante !== "administrador") {
      if (tipo_solicitante !== "supervisor") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
      }

      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla: aviso.cuadrilla.id_cuadrilla,
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }

      // 2. Si es supervisor, solo puede eliminar sus propios avisos
      if (aviso.id_autor !== id_solicitante) {
        return res.status(403).json({
          message: "Un supervisor solo puede eliminar sus propios avisos",
        });
      }
    }

    // 6. Eliminar el aviso (physical delete)
    await avisoRepository.remove(aviso);

    return res.status(200).json({
      message: "Aviso eliminado correctamente",
    });
  } catch (error) {
    console.error("Error en eliminarAviso:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};