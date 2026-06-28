// Inventario Controller


import { AppDataSource } from "../config/configDb";
import { InventarioSchema } from "../entities/inventario.entity";
import { MaterialLimpiezaSchema } from "../entities/material_limpieza.entity";
import { In } from "typeorm";

const inventarioRepository = AppDataSource.getRepository(InventarioSchema)
const materialLimpiezaRepository = AppDataSource.getRepository(MaterialLimpiezaSchema);

/***
 * Crea un inventario para una cuadrilla
 * Recibe: id_cuadrilla, nombre_inventario
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla
 * - El proyecto debe existir
 * - La cuadrilla debe existir
 * - El proyecto debe tener estado "activo"
 * - La cuadrilla debe tener estado "activa"
 * - No deben existir campos vacios
 * - No debe existir ya un inventario con el mismo nombre dentro de la misma cuadrilla
 */
export const crearInventario = async (req, res) => {
  try {
    const { id_cuadrilla, nombre_inventario } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    // Validar que los campos no estén vacíos
    if (!id_cuadrilla || !nombre_inventario) {
      return res.status(400).json({
        message: "Los campos id_cuadrilla y nombre_inventario son obligatorios",
      });
    }

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // Validar que la cuadrilla exista (con su proyecto, ya que "el proyecto
    // debe existir" depende de que la cuadrilla cargue esa relación)
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // El proyecto siempre existe si la cuadrilla existe (FK not nullable),
    // pero se valida explícitamente por completitud según lo solicitado.
    if (!cuadrilla.proyecto) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    // Validar que el proyecto esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede crear el inventario porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede crear el inventario porque la cuadrilla no está activa",
      });
    }

    // Validar quién realiza la petición: administrador (libre) o supervisor (debe pertenecer a la cuadrilla)
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

    // Validar que no exista ya un inventario con el mismo nombre en esta cuadrilla
    const inventarioExistente = await inventarioRepository.findOne({
      where: {
        id_cuadrilla: Number(id_cuadrilla),
        nombre_inventario,
      },
    });
    if (inventarioExistente) {
      return res.status(409).json({
        message: "Ya existe un inventario con ese nombre en esta cuadrilla",
      });
    }

    // Crear el inventario
    const nuevoInventario = inventarioRepository.create({
      id_cuadrilla: Number(id_cuadrilla),
      nombre_inventario,
    });

    await inventarioRepository.save(nuevoInventario);

    return res.status(201).json({
      message: "Inventario creado correctamente",
      data: nuevoInventario,
    });
  } catch (error) {
    console.error("Error en crearInventario:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};









/***
 * Elimina un inventario (physical delete)
 * Recibe: id_inventario (body)
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador o tipo_usuario = supervisor, si es supervisor debe pertenecer a la cuadrilla del inventario
 * - El inventario debe existir
 * - El proyecto debe tener estado "activo"
 * - La cuadrilla debe tener estado "activa"
 * - No deben existir campos vacios
 * - No se puede eliminar un inventario que posea materiales (solo inventarios vacíos)
 */
export const eliminarInventario = async (req, res) => {
  try {
    const { id_inventario } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    // Validar que los campos no estén vacíos
    if (!id_inventario) {
      return res.status(400).json({
        message: "El campo id_inventario es obligatorio",
      });
    }

    if (isNaN(Number(id_inventario))) {
      return res.status(400).json({
        message: "id_inventario debe ser numérico",
      });
    }

    // Validar que el inventario exista (con su cuadrilla y proyecto, para validar estados y pertenencia)
    const inventario = await inventarioRepository.findOne({
      where: { id_inventario: Number(id_inventario) },
      relations: ["cuadrilla", "cuadrilla.proyecto"],
    });
    if (!inventario) {
      return res.status(404).json({ message: "Inventario no encontrado" });
    }

    // Validar que el proyecto esté activo
    if (inventario.cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede eliminar el inventario porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (inventario.cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede eliminar el inventario porque la cuadrilla no está activa",
      });
    }

    // Validar quién realiza la petición: administrador (libre) o supervisor (debe pertenecer a la cuadrilla del inventario)
    if (tipo_solicitante !== "administrador") {
      if (tipo_solicitante !== "supervisor") {
        return res.status(403).json({
          message: "No tiene permisos para realizar esta acción",
        });
      }

      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla: inventario.cuadrilla.id_cuadrilla,
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla del inventario",
        });
      }
    }

    // Validar que el inventario no tenga materiales asociados
    const cantidadMateriales = await materialLimpiezaRepository.count({
      where: { id_inventario: Number(id_inventario) },
    });
    if (cantidadMateriales > 0) {
      return res.status(409).json({
        message: "No se puede eliminar el inventario porque tiene materiales asociados",
      });
    }

    // Eliminar el inventario (physical delete)
    await inventarioRepository.remove(inventario);

    return res.status(200).json({
      message: "Inventario eliminado correctamente",
    });
  } catch (error) {
    console.error("Error en eliminarInventario:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};
















/***
 * Obtiene todos los inventarios y materiales de limpieza de una cuadrilla (paginado por inventario)
 * Recibe: id_cuadrilla (param), page, limit (query params)
 * Retorna una lista de: { id_inventario, nombre_inventario, materiales: [...] }
 * Inventarios ordenados alfabéticamente por nombre_inventario,
 * y materiales de cada inventario ordenados alfabéticamente por nombre_material
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador,
 *   o tipo_usuario = supervisor (debe pertenecer a la cuadrilla),
 *   o tipo_usuario = trabajador (debe pertenecer a la cuadrilla y ser bodeguero, es_bodeguero = true)
 * - La cuadrilla debe existir
 * - El proyecto debe tener estado activo
 * - La cuadrilla debe tener estado activa
 */
export const getAllInventariosAndMaterialesFromCuadrilla = async (req, res) => {
  try {
    const { id_cuadrilla } = req.params;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    if (isNaN(Number(id_cuadrilla))) {
      return res.status(400).json({
        message: "id_cuadrilla debe ser numérico",
      });
    }

    // Validar que la cuadrilla exista (con su proyecto, para validar estados)
    const cuadrilla = await cuadrillaRepository.findOne({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      relations: ["proyecto"],
    });
    if (!cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // Validar que el proyecto esté activo
    if (cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se pueden ver los inventarios porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se pueden ver los inventarios porque la cuadrilla no está activa",
      });
    }

    // Validar quién realiza la petición
    if (tipo_solicitante === "administrador") {
      // libre acceso
    } else if (tipo_solicitante === "supervisor") {
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
    } else if (tipo_solicitante === "trabajador") {
      const trabajadorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla: Number(id_cuadrilla),
        },
      });

      if (!trabajadorPertenece || !trabajadorPertenece.es_bodeguero) {
        return res.status(403).json({
          message: "No tiene permisos para ver los inventarios de esta cuadrilla",
        });
      }
    } else {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    let { page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    // Obtener inventarios de la cuadrilla, paginados y ordenados alfabéticamente
    const [inventarios, total] = await inventarioRepository.findAndCount({
      where: { id_cuadrilla: Number(id_cuadrilla) },
      order: { nombre_inventario: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const idsInventarios = inventarios.map((inv) => inv.id_inventario);

    // Obtener todos los materiales de los inventarios de la página actual
    // en una sola consulta, ordenados alfabéticamente por nombre_material
    let materiales = [];
    if (idsInventarios.length > 0) {
      materiales = await materialLimpiezaRepository.find({
        where: { id_inventario: In(idsInventarios) },
        order: { nombre_material: "ASC" },
      });
    }

    // Agrupar materiales por id_inventario
    const materialesPorInventario = {};
    for (const material of materiales) {
      if (!materialesPorInventario[material.id_inventario]) {
        materialesPorInventario[material.id_inventario] = [];
      }
      materialesPorInventario[material.id_inventario].push(material);
    }

    // Armar la respuesta final
    const data = inventarios.map((inventario) => ({
      id_inventario: inventario.id_inventario,
      nombre_inventario: inventario.nombre_inventario,
      materiales: materialesPorInventario[inventario.id_inventario] || [],
    }));

    return res.status(200).json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error en getAllInventariosAndMaterialesFromCuadrilla:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};








/***
 * Crea un material de limpieza para un inventario
 * Recibe: id_inventario, nombre_material, tipo_material, stock_actual, stock_minimo (body)
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador,
 *   o tipo_usuario = supervisor (debe pertenecer a la cuadrilla),
 *   o tipo_usuario = trabajador (debe pertenecer a la cuadrilla y ser bodeguero, es_bodeguero = true)
 * - El inventario debe existir
 * - La cuadrilla debe existir
 * - El proyecto debe tener estado activo
 * - La cuadrilla debe tener estado activa
 * - No deben existir campos vacios
 * - No debe existir ya un material con el mismo nombre dentro del mismo inventario
 * - Los valores numéricos (stock_actual, stock_minimo) no pueden ser negativos
 */
export const crearMaterialLimpiezaInventario = async (req, res) => {
  try {
    const { id_inventario, nombre_material, tipo_material, stock_actual, stock_minimo } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    // Validar que los campos no estén vacíos
    if (
      !id_inventario ||
      !nombre_material ||
      !tipo_material ||
      stock_actual === undefined ||
      stock_actual === null ||
      stock_actual === "" ||
      stock_minimo === undefined ||
      stock_minimo === null ||
      stock_minimo === ""
    ) {
      return res.status(400).json({
        message:
          "Los campos id_inventario, nombre_material, tipo_material, stock_actual y stock_minimo son obligatorios",
      });
    }

    if (
      isNaN(Number(id_inventario)) ||
      isNaN(Number(stock_actual)) ||
      isNaN(Number(stock_minimo))
    ) {
      return res.status(400).json({
        message: "id_inventario, stock_actual y stock_minimo deben ser numéricos",
      });
    }

    // Validar que stock_actual y stock_minimo no sean negativos
    if (Number(stock_actual) < 0 || Number(stock_minimo) < 0) {
      return res.status(400).json({
        message: "stock_actual y stock_minimo no pueden ser negativos",
      });
    }

    // Validar que el inventario exista (con su cuadrilla y proyecto, para validar estados)
    const inventario = await inventarioRepository.findOne({
      where: { id_inventario: Number(id_inventario) },
      relations: ["cuadrilla", "cuadrilla.proyecto"],
    });
    if (!inventario) {
      return res.status(404).json({ message: "Inventario no encontrado" });
    }

    // Validar que la cuadrilla exista
    if (!inventario.cuadrilla) {
      return res.status(404).json({ message: "Cuadrilla no encontrada" });
    }

    // Validar que el proyecto esté activo
    if (inventario.cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede crear el material porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (inventario.cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede crear el material porque la cuadrilla no está activa",
      });
    }

    const id_cuadrilla = inventario.cuadrilla.id_cuadrilla;

    // Validar quién realiza la petición
    if (tipo_solicitante === "administrador") {
      // libre acceso
    } else if (tipo_solicitante === "supervisor") {
      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla,
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }
    } else if (tipo_solicitante === "trabajador") {
      const trabajadorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla,
        },
      });

      if (!trabajadorPertenece || !trabajadorPertenece.es_bodeguero) {
        return res.status(403).json({
          message: "No tiene permisos para crear materiales en este inventario",
        });
      }
    } else {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // Validar que no exista ya un material con el mismo nombre en este inventario
    const materialExistente = await materialLimpiezaRepository.findOne({
      where: {
        id_inventario: Number(id_inventario),
        nombre_material,
      },
    });
    if (materialExistente) {
      return res.status(409).json({
        message: "Ya existe un material con ese nombre en este inventario",
      });
    }

    // Crear el material de limpieza
    const nuevoMaterial = materialLimpiezaRepository.create({
      id_inventario: Number(id_inventario),
      nombre_material,
      tipo_material,
      stock_actual: Number(stock_actual),
      stock_minimo: Number(stock_minimo),
    });

    await materialLimpiezaRepository.save(nuevoMaterial);

    return res.status(201).json({
      message: "Material de limpieza creado correctamente",
      data: nuevoMaterial,
    });
  } catch (error) {
    console.error("Error en crearMaterialLimpiezaInventario:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};










/***
 * Actualiza un material de limpieza
 * Recibe: id_material (body, obligatorio), y opcionalmente uno o varios de:
 * nombre_material, tipo_material, stock_actual, stock_minimo
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador,
 *   o tipo_usuario = supervisor (debe pertenecer a la cuadrilla),
 *   o tipo_usuario = trabajador (debe pertenecer a la cuadrilla y ser bodeguero, es_bodeguero = true)
 * - El material_limpieza debe existir
 * - El proyecto debe tener estado activo
 * - La cuadrilla debe tener estado activa
 * - No deben existir campos vacios
 * - No deben existir dos material_limpieza con el mismo nombre en el mismo inventario
 * - Los valores numéricos no pueden ser negativos
 */
export const actualizarMaterialLimpiezaInventario = async (req, res) => {
  try {
    const { id_material, nombre_material, tipo_material, stock_actual, stock_minimo } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    if (!id_material) {
      return res.status(400).json({
        message: "El campo id_material es obligatorio",
      });
    }

    if (isNaN(Number(id_material))) {
      return res.status(400).json({
        message: "id_material debe ser numérico",
      });
    }

    // Validar que al menos un campo actualizable haya sido enviado
    if (
      nombre_material === undefined &&
      tipo_material === undefined &&
      stock_actual === undefined &&
      stock_minimo === undefined
    ) {
      return res.status(400).json({
        message: "Debe enviar al menos un campo para actualizar",
      });
    }

    // Validar que los campos enviados no estén vacíos (si vienen, no pueden ser "")
    if (nombre_material !== undefined && !nombre_material) {
      return res.status(400).json({ message: "nombre_material no puede estar vacío" });
    }
    if (tipo_material !== undefined && !tipo_material) {
      return res.status(400).json({ message: "tipo_material no puede estar vacío" });
    }
    if (stock_actual !== undefined && (stock_actual === null || stock_actual === "")) {
      return res.status(400).json({ message: "stock_actual no puede estar vacío" });
    }
    if (stock_minimo !== undefined && (stock_minimo === null || stock_minimo === "")) {
      return res.status(400).json({ message: "stock_minimo no puede estar vacío" });
    }

    if (stock_actual !== undefined && isNaN(Number(stock_actual))) {
      return res.status(400).json({ message: "stock_actual debe ser numérico" });
    }
    if (stock_minimo !== undefined && isNaN(Number(stock_minimo))) {
      return res.status(400).json({ message: "stock_minimo debe ser numérico" });
    }

    // Validar que los valores numéricos no sean negativos
    if (stock_actual !== undefined && Number(stock_actual) < 0) {
      return res.status(400).json({ message: "stock_actual no puede ser negativo" });
    }
    if (stock_minimo !== undefined && Number(stock_minimo) < 0) {
      return res.status(400).json({ message: "stock_minimo no puede ser negativo" });
    }

    // Validar que el material_limpieza exista (con su inventario, cuadrilla y proyecto, para validar estados y permisos)
    const material = await materialLimpiezaRepository.findOne({
      where: { id_material: Number(id_material) },
      relations: ["inventario", "inventario.cuadrilla", "inventario.cuadrilla.proyecto"],
    });
    if (!material) {
      return res.status(404).json({ message: "Material no encontrado" });
    }

    // Validar que el proyecto esté activo
    if (material.inventario.cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede actualizar el material porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (material.inventario.cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede actualizar el material porque la cuadrilla no está activa",
      });
    }

    const id_cuadrilla = material.inventario.cuadrilla.id_cuadrilla;

    // Validar quién realiza la petición
    if (tipo_solicitante === "administrador") {
      // libre acceso
    } else if (tipo_solicitante === "supervisor") {
      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla,
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }
    } else if (tipo_solicitante === "trabajador") {
      const trabajadorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla,
        },
      });

      if (!trabajadorPertenece || !trabajadorPertenece.es_bodeguero) {
        return res.status(403).json({
          message: "No tiene permisos para actualizar materiales en este inventario",
        });
      }
    } else {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // Validar que no exista otro material con el mismo nombre en el mismo inventario
    if (nombre_material !== undefined) {
      const materialExistente = await materialLimpiezaRepository.findOne({
        where: {
          id_inventario: material.id_inventario,
          nombre_material,
        },
      });
      if (materialExistente && materialExistente.id_material !== material.id_material) {
        return res.status(409).json({
          message: "Ya existe otro material con ese nombre en este inventario",
        });
      }
    }

    // Aplicar solo los campos enviados
    if (nombre_material !== undefined) material.nombre_material = nombre_material;
    if (tipo_material !== undefined) material.tipo_material = tipo_material;
    if (stock_actual !== undefined) material.stock_actual = Number(stock_actual);
    if (stock_minimo !== undefined) material.stock_minimo = Number(stock_minimo);

    await materialLimpiezaRepository.save(material);

    return res.status(200).json({
      message: "Material actualizado correctamente",
      data: material,
    });
  } catch (error) {
    console.error("Error en actualizarMaterialLimpiezaInventario:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};











/***
 * Elimina un material de limpieza de un inventario (physical delete)
 * Recibe: id_material (body)
 * Validaciones:
 * - El que realiza la peticion debe tener tipo_usuario = administrador,
 *   o tipo_usuario = supervisor (debe pertenecer a la cuadrilla),
 *   o tipo_usuario = trabajador (debe pertenecer a la cuadrilla y ser bodeguero, es_bodeguero = true)
 * - El material_limpieza debe existir
 * - El proyecto debe tener estado activo
 * - La cuadrilla debe tener estado activa
 */
export const eliminarMaterialLimpiezaInventario = async (req, res) => {
  try {
    const { id_material } = req.body;
    const { id_trabajador: id_solicitante, tipo_usuario: tipo_solicitante } = req.user;

    if (!id_material) {
      return res.status(400).json({
        message: "El campo id_material es obligatorio",
      });
    }

    if (isNaN(Number(id_material))) {
      return res.status(400).json({
        message: "id_material debe ser numérico",
      });
    }

    // Validar que el material_limpieza exista (con su inventario, cuadrilla y proyecto, para validar estados y permisos)
    const material = await materialLimpiezaRepository.findOne({
      where: { id_material: Number(id_material) },
      relations: ["inventario", "inventario.cuadrilla", "inventario.cuadrilla.proyecto"],
    });
    if (!material) {
      return res.status(404).json({ message: "Material no encontrado" });
    }

    // Validar que el proyecto esté activo
    if (material.inventario.cuadrilla.proyecto.estado !== "activo") {
      return res.status(409).json({
        message: "No se puede eliminar el material porque el proyecto no está activo",
      });
    }

    // Validar que la cuadrilla esté activa
    if (material.inventario.cuadrilla.estado !== "activa") {
      return res.status(409).json({
        message: "No se puede eliminar el material porque la cuadrilla no está activa",
      });
    }

    const id_cuadrilla = material.inventario.cuadrilla.id_cuadrilla;

    // Validar quién realiza la petición
    if (tipo_solicitante === "administrador") {
      // libre acceso
    } else if (tipo_solicitante === "supervisor") {
      const supervisorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla,
        },
      });

      if (!supervisorPertenece) {
        return res.status(403).json({
          message: "El supervisor no pertenece a la cuadrilla indicada",
        });
      }
    } else if (tipo_solicitante === "trabajador") {
      const trabajadorPertenece = await asignadoRepository.findOne({
        where: {
          id_trabajador: id_solicitante,
          id_cuadrilla,
        },
      });

      if (!trabajadorPertenece || !trabajadorPertenece.es_bodeguero) {
        return res.status(403).json({
          message: "No tiene permisos para eliminar materiales de este inventario",
        });
      }
    } else {
      return res.status(403).json({
        message: "No tiene permisos para realizar esta acción",
      });
    }

    // Eliminar el material (physical delete)
    await materialLimpiezaRepository.remove(material);

    return res.status(200).json({
      message: "Material eliminado correctamente",
    });
  } catch (error) {
    console.error("Error en eliminarMaterialLimpiezaInventario:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};





