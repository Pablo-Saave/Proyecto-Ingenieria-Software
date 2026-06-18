// controllers/documento.controller.js
import path from 'path';
import fs from 'fs';
import { AppDataSource } from '../config/configDb.js';
import { AusenciaSchema } from '../entities/ausencia.entity.js';

const repo = AppDataSource.getRepository(AusenciaSchema);

// POST /api/ausencias/:id/documento
export const subirDocumento = async (req, res) => {
  try {
    const ausencia = await repo.findOne({
      where: { id_ausencia: Number(req.params.id) },
    });

    if (!ausencia) {
      return res.status(404).json({ error: 'Ausencia no encontrada' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    // Guardar la ruta del archivo en la ausencia
    ausencia.url_documento = `/uploads/documentos/${req.file.filename}`;
    await repo.save(ausencia);

    res.json({
      status: 'success',
      message: 'Documento subido correctamente',
      url_documento: ausencia.url_documento,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir el documento' });
  }
};