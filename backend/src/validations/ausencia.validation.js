// validations/ausencia.validation.js

// Validación para crear ausencia (flujo normal — trabajador la solicita)
export const validarCrearAusencia = (req, res, next) => {
  const { fecha_inicio, fecha_termino, motivo, id_trabajador } = req.body;

  if (!fecha_inicio)
    return res.status(400).json({ error: "La fecha de inicio es obligatoria" });

  if (!fecha_termino)
    return res.status(400).json({ error: "La fecha de término es obligatoria" });

  if (!motivo || !motivo.trim())
    return res.status(400).json({ error: "El motivo es obligatorio" });

  if (!id_trabajador)
    return res.status(400).json({ error: "Debe indicar trabajador" });

  const inicio = new Date(fecha_inicio);
  const termino = new Date(fecha_termino);

  if (termino < inicio)
    return res.status(400).json({ error: "La fecha término no puede ser menor a la fecha inicio" });

  next();
};

// Validación para crear ausencia por supervisor (flujo espontáneo)
// El motivo es opcional aquí porque el controlador pone un texto por defecto
export const validarCrearAusenciaSupervisor = (req, res, next) => {
  const { fecha_inicio, fecha_termino, id_trabajador } = req.body;

  if (!fecha_inicio)
    return res.status(400).json({ error: "La fecha de inicio es obligatoria" });

  if (!fecha_termino)
    return res.status(400).json({ error: "La fecha de término es obligatoria" });

  if (!id_trabajador)
    return res.status(400).json({ error: "Debe indicar el trabajador afectado" });

  const inicio = new Date(fecha_inicio);
  const termino = new Date(fecha_termino);

  if (termino < inicio)
    return res.status(400).json({ error: "La fecha término no puede ser menor a la fecha inicio" });

  next();
};

// Validación para justificar ausencia (el trabajador completa su motivo)
export const validarJustificarAusencia = (req, res, next) => {
  const { motivo } = req.body;

  if (!motivo || !motivo.trim())
    return res.status(400).json({ error: "Debes ingresar tu justificación" });

  next();
};

// Validación al revisar (aprobar/rechazar) — sin cambios
export const validarRevisionAusencia = (req, res, next) => {
  const { estado, comentario_revision, revisado_por } = req.body;

  if (!estado) {
    return res.status(400).json({ error: "El estado es obligatorio" });
  }

  if (estado !== "Aprobada" && estado !== "Rechazada") {
    return res.status(400).json({ error: "Estado inválido" });
  }

  if (!comentario_revision) {
    return res.status(400).json({ error: "Debe ingresar comentario" });
  }

  if (!revisado_por) {
    return res.status(400).json({ error: "Debe indicar revisor" });
  }

  next();
};