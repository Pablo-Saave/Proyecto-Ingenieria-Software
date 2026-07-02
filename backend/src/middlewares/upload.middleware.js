// middlewares/upload.middleware.js
// Configura multer para recibir PDFs y guardarlos en /uploads/documentos/

import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Crear carpeta si no existe
const DIR = 'uploads/documentos';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    // ausencia_3_1718234567890.pdf
    const nombre = `ausencia_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, nombre);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se aceptan archivos PDF'), false);
  }
};

export const uploadPDF = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('archivo');