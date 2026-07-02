// controllers/documento.controller.js
import { AppDataSource } from '../config/configDb.js';
import { JustificacionAusenciaSchema } from '../entities/justificacion_ausencia.entity.js';

const repoJustificacion = AppDataSource.getRepository(JustificacionAusenciaSchema);

// POST /api/ausencias/:id/documento
export const subirDocumento = async (req, res) => {
  try {
    const id_ausencia = Number(req.params.id);

    if (isNaN(id_ausencia)) {
      return res.status(400).json({ error: 'ID de ausencia inválido' });
    }

    const justificacion = await repoJustificacion.findOne({
      where: { id_ausencia },
    });

    if (!justificacion) {
      return res.status(404).json({ error: 'No existe justificación para esta ausencia' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    justificacion.documento_respaldo = `/uploads/documentos/${req.file.filename}`;
    const resultado = await repoJustificacion.save(justificacion);

    res.json({
      status: 'success',
      message: 'Documento subido correctamente',
      documento_respaldo: resultado.documento_respaldo,
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({ error: 'Error al subir el documento: ' + error.message });
  }
};