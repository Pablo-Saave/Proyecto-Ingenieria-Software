import express from "express";

const router = express.Router();

/**
 * @route   GET /api/contratos
 * @desc    Obtener todos los contratos
 * @access  Public (placeholder)
 */
router.get("/", (req, res) => {
  res.json({
    message: "GET - Obtener todos los contratos",
    status: "success",
    data: [],
  });
});

/**
 * @route   GET /api/contratos/:id
 * @desc    Obtener un contrato por ID
 * @access  Public (placeholder)
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({
    message: "GET - Obtener contrato por ID",
    id,
    status: "success",
    data: null,
  });
});

/**
 * @route   POST /api/contratos
 * @desc    Crear un nuevo contrato
 * @access  Public (placeholder)
 */
router.post("/", (req, res) => {
  res.status(201).json({
    message: "POST - Crear nuevo contrato",
    status: "success",
    data: null,
  });
});

/**
 * @route   PUT /api/contratos/:id
 * @desc    Actualizar un contrato
 * @access  Public (placeholder)
 */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  res.json({
    message: "PUT - Actualizar contrato",
    id,
    status: "success",
    data: null,
  });
});

/**
 * @route   DELETE /api/contratos/:id
 * @desc    Eliminar un contrato
 * @access  Public (placeholder)
 */
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  res.json({
    message: "DELETE - Eliminar contrato",
    id,
    status: "success",
  });
});

export default router;
