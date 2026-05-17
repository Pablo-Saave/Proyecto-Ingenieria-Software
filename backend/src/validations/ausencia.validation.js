export const validarRevisionAusencia = (req, res, next) => {

  const {
    estado,
    comentario_revision,
    revisado_por,
  } = req.body;

  if (!estado) {
    return res.status(400).json({
      error: "El estado es obligatorio",
    });
  }

  if (
    estado !== "Aprobada" &&
    estado !== "Rechazada"
  ) {
    return res.status(400).json({
      error: "Estado inválido",
    });
  }

  if (!comentario_revision) {
    return res.status(400).json({
      error: "Debe ingresar comentario",
    });
  }

  if (!revisado_por) {
    return res.status(400).json({
      error: "Debe indicar revisor",
    });
  }

  next();
};

export const validarCrearAusencia = (req, res, next) => {

  const {
    fecha_inicio,
    fecha_termino,
    tipo_ausencia,
    motivo,
    id_trabajador,
  } = req.body;

  // fecha inicio obligatoria
  if (!fecha_inicio) {
    return res.status(400).json({
      error: "La fecha de inicio es obligatoria",
    });
  }

  // fecha término obligatoria
  if (!fecha_termino) {
    return res.status(400).json({
      error: "La fecha de término es obligatoria",
    });
  }

  // tipo ausencia obligatorio
  if (!tipo_ausencia) {
    return res.status(400).json({
      error: "El tipo de ausencia es obligatorio",
    });
  }

  // motivo obligatorio
  if (!motivo || !motivo.trim()) {
    return res.status(400).json({
      error: "El motivo es obligatorio",
    });
  }

  // trabajador obligatorio
  if (!id_trabajador) {
    return res.status(400).json({
      error: "Debe indicar trabajador",
    });
  }

  // validar fechas
  const inicio = new Date(fecha_inicio);
  const termino = new Date(fecha_termino);

  if (termino < inicio) {
    return res.status(400).json({
      error:
        "La fecha término no puede ser menor a la fecha inicio",
    });
  }

  next();
};