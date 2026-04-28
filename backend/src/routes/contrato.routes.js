import express from "express";
import {
  getAllContratos,
  getContratoById,
  createContrato,
  updateContrato,
  deleteContrato,
} from "../controllers/contratro.controller.js";

const router = express.Router();

router.get("/", getAllContratos);
router.get("/:id", getContratoById);
router.post("/", createContrato);
router.put("/:id", updateContrato);
router.delete("/:id", deleteContrato);

export default router;