import { AppDataSource }    from "../config/configDb.js";
import { InventarioSchema } from "../entities/inventario.entity.js";
import { MaterialLimpiezaSchema } from "../entities/material_limpieza.entity.js";

const inventarioRepo = AppDataSource.getRepository(InventarioSchema);
const materialRepo = AppDataSource.getRepository(MaterialLimpiezaSchema);




/*
 * Crea un inventario asociado al proyecto activo del supervisor autenticado.
 *
 * Recibe:
 *   body : { nombre_inventario (string) }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 201:
 *   {
 *     status:  "success",
 *     message: "Inventario creado exitosamente."
 *   }
 */
export async function crearInventario(req, res) {
  try {
    const { nombre_inventario }      = req.body;
    const { id_proyecto }            = req.proyectoValidado;

    const nuevoInventario = inventarioRepo.create({
      id_proyecto,
      nombre_inventario: nombre_inventario.trim(),
    });

    await inventarioRepo.save(nuevoInventario);

    return res.status(201).json({
      status:  "success",
      message: "Inventario creado exitosamente.",
    });

  } catch (error) {
    console.error("[crearInventario]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}




/*
 * Elimina físicamente un inventario y todos sus materiales asociados.
 *
 * Recibe:
 *   body : { id_inventario (int) }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status:  "success",
 *     message: "Inventario eliminado exitosamente."
 *   }
 */
export async function eliminarInventario(req, res) {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { id_inventario } = req.inventarioValidado;

    // Paso 1: eliminar materiales del inventario
    await queryRunner.manager
      .getRepository(MaterialLimpiezaSchema)
      .delete({ id_inventario });

    // Paso 2: eliminar el inventario
    await queryRunner.manager
      .getRepository(InventarioSchema)
      .delete({ id_inventario });

    await queryRunner.commitTransaction();

    return res.status(200).json({
      status:  "success",
      message: "Inventario eliminado exitosamente.",
    });

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("[eliminarInventario]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  } finally {
    await queryRunner.release();
  }
}




/*
 * Retorna todos los inventarios del proyecto supervisado por el usuario autenticado.
 *
 * Recibe:
 *   query: { page (int, default 1), limit (int, default 10) }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status: "success",
 *     data: [{ id_inventario, nombre_inventario }],
 *     meta: { total, page, limit, totalPages }
 *   }
 */
export async function getAllInventariosFromMyProyecto(req, res) {
  try {
    const { id_proyecto } = req.proyectoValidado;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [inventarios, total] = await inventarioRepo.findAndCount({
      where:  { id_proyecto },
      select: ["id_inventario", "nombre_inventario"],
      order:  { nombre_inventario: "ASC" },
      skip,
      take:   limit,
    });

    return res.status(200).json({
      status: "success",
      data:   inventarios,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("[getAllInventariosFromMyProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}




/*
 * Retorna los inventarios del proyecto supervisado que tengan al menos
 * un material con stock_actual < stock_minimo.
 *
 * Recibe:
 *   query: { page (int, default 1), limit (int, default 10) }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status: "success",
 *     data: [{ id_inventario, nombre_inventario }],
 *     meta: { total, page, limit, totalPages }
 *   }
 */
export async function getAllLowStockInventariosFromMyProyecto(req, res) {
  try {
    const { id_proyecto } = req.proyectoValidado;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [inventarios, total] = await inventarioRepo
      .createQueryBuilder("i")
      .select(["i.id_inventario", "i.nombre_inventario"])
      .innerJoin("i.materiales", "m")
      .where("i.id_proyecto = :id_proyecto", { id_proyecto })
      .andWhere("m.stock_actual < m.stock_minimo")
      .groupBy("i.id_inventario")
      .orderBy("i.nombre_inventario", "ASC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.status(200).json({
      status: "success",
      data:   inventarios,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("[getAllLowStockInventariosFromMyProyecto]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}




/*
 * Retorna todos los materiales de un inventario específico.
 *
 * Recibe:
 *   params: { id_inventario (int) }
 *   query:  { page (int, default 1), limit (int, default 10) }
 *   token:  { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status: "success",
 *     data: [
 *       {
 *         id_inventario,
 *         id_material,
 *         nombre_material,
 *         tipo_material,
 *         stock_actual,
 *         stock_minimo
 *       }
 *     ],
 *     meta: { total, page, limit, totalPages }
 *   }
 */
export async function getAllMaterialesFromAnInventario(req, res) {
  try {
    const { id_inventario } = req.inventarioValidado;

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [materiales, total] = await materialRepo.findAndCount({
      where:  { id_inventario },
      select: [
        "id_inventario",
        "id_material",
        "nombre_material",
        "tipo_material",
        "stock_actual",
        "stock_minimo",
      ],
      order: { nombre_material: "ASC" },
      skip,
      take:  limit,
    });

    return res.status(200).json({
      status: "success",
      data:   materiales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("[getAllMaterialesFromAnInventario]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}




/*
 * Actualiza los campos de un material de limpieza de un inventario.
 *
 * Recibe:
 *   params: { id_material (int) }
 *   body:   {
 *     nombre_material (string, opcional),
 *     tipo_material   (string, opcional),
 *     stock_actual    (int,    opcional),
 *     stock_minimo    (int,    opcional)
 *   }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status:  "success",
 *     message: "Material actualizado exitosamente.",
 *     data: {
 *       id_material,
 *       id_inventario,
 *       nombre_material,
 *       tipo_material,
 *       stock_actual,
 *       stock_minimo
 *     }
 *   }
 */
export async function actualizarMaterialLimpiezaInventario(req, res) {
  try {
    const { id_material } = req.materialValidado;
    const { nombre_material, tipo_material, stock_actual, stock_minimo } = req.body;

    // Construir objeto solo con los campos enviados
    const campos = {};

    if (nombre_material !== undefined) campos.nombre_material = nombre_material;
    if (tipo_material    !== undefined) campos.tipo_material   = tipo_material;

    if (stock_actual !== undefined) {
      if (isNaN(Number(stock_actual)) || Number(stock_actual) < 0) {
        return res.status(400).json({
          status:  "error",
          message: "stock_actual debe ser un número entero mayor o igual a 0.",
        });
      }
      campos.stock_actual = Number(stock_actual);
    }

    if (stock_minimo !== undefined && stock_minimo !== null) {
      if (isNaN(Number(stock_minimo)) || Number(stock_minimo) < 0) {
        return res.status(400).json({
          status:  "error",
          message: "stock_minimo debe ser un número entero mayor o igual a 0.",
        });
      }
      campos.stock_minimo = Number(stock_minimo);
    }

    if (!Object.keys(campos).length) {
      return res.status(400).json({
        status:  "error",
        message: "Debes enviar al menos un campo para actualizar.",
      });
    }

    await materialRepo.update({ id_material }, campos);

    const materialActualizado = await materialRepo.findOne({
      where: { id_material },
    });

    return res.status(200).json({
      status:  "success",
      message: "Material actualizado exitosamente.",
      data:    materialActualizado,
    });

  } catch (error) {
    console.error("[actualizarMaterialLimpiezaInventario]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}




/*
 * Elimina físicamente un material de limpieza de un inventario.
 *
 * Recibe:
 *   params: { id_material (int) }
 *   token:  { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 200:
 *   {
 *     status:  "success",
 *     message: "Material eliminado exitosamente."
 *   }
 */
export async function eliminarMaterialLimpiezaInventario(req, res) {
  try {
    const { id_material } = req.materialValidado;

    await materialRepo.delete({ id_material });

    return res.status(200).json({
      status:  "success",
      message: "Material eliminado exitosamente.",
    });

  } catch (error) {
    console.error("[eliminarMaterialLimpiezaInventario]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}




/*
 * Crea un material de limpieza en un inventario existente.
 *
 * Recibe:
 *   body:  {
 *     id_inventario  (int),
 *     nombre_material (string),
 *     tipo_material   (string),
 *     stock_actual    (int),
 *     stock_minimo    (int)
 *   }
 *   token: { id_trabajador, tipo_usuario }  <- via authMiddleware
 *
 * Retorna 201:
 *   {
 *     status:  "success",
 *     message: "Material creado exitosamente.",
 *     data: {
 *       id_material,
 *       id_inventario,
 *       nombre_material,
 *       tipo_material,
 *       stock_actual,
 *       stock_minimo
 *     }
 *   }
 */
export async function crearMaterialLimpiezaInventario(req, res) {
  try {
    const { nombre_material, tipo_material, stock_actual, stock_minimo } = req.body;
    const { id_inventario } = req.inventarioValidado;

    const nuevoMaterial = materialRepo.create({
      id_inventario,
      nombre_material,
      tipo_material,
      stock_actual:  Number(stock_actual),
      stock_minimo:  Number(stock_minimo),
    });

    const materialGuardado = await materialRepo.save(nuevoMaterial);

    return res.status(201).json({
      status:  "success",
      message: "Material creado exitosamente.",
      data:    materialGuardado,
    });

  } catch (error) {
    console.error("[crearMaterialLimpiezaInventario]", error);
    return res.status(500).json({ status: "error", message: "Error interno del servidor." });
  }
}