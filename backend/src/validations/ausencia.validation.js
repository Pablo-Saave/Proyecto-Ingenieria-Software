// validations/ausencia.validation.js

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

  if (new Date(fecha_termino) < new Date(fecha_inicio))
    return res.status(400).json({ error: "La fecha término no puede ser menor a la fecha inicio" });

  next();
};

export const validarCrearAusenciaSupervisor = (req, res, next) => {
  const { fecha_inicio, fecha_termino, id_trabajador } = req.body;

  if (!fecha_inicio)
    return res.status(400).json({ error: "La fecha de inicio es obligatoria" });
  if (!fecha_termino)
    return res.status(400).json({ error: "La fecha de término es obligatoria" });
  if (!id_trabajador)
    return res.status(400).json({ error: "Debe indicar el trabajador afectado" });

  if (new Date(fecha_termino) < new Date(fecha_inicio))
    return res.status(400).json({ error: "La fecha término no puede ser menor a la fecha inicio" });

  next();
};

export const validarJustificarAusencia = (req, res, next) => {
  const { motivo } = req.body;

  if (!motivo || !motivo.trim())
    return res.status(400).json({ error: "Debes ingresar tu justificación" });

  next();
};

// El resvisor se toma de req.user en el controlador

export const validarRevisionAusencia = (req, res, next) => {
  const { estado_aprobacion, comentario_revision } = req.body;

  if (!estado_aprobacion) {
    return res.status(400).json({ error: "El estado es obligatorio" });
  }

  if (estado_aprobacion !== "Aprobado" && estado_aprobacion !== "Rechazado") {
    return res.status(400).json({ error: "Estado inválido" });
  }

  if (!comentario_revision) {
    return res.status(400).json({ error: "Debe ingresar comentario" });
  }

  next();
};