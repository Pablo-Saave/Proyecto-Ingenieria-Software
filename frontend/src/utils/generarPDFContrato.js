import jsPDF from 'jspdf';

function formatearFecha(fecha) {
  if (!fecha) return '-';
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function calcularAntiguedad(fechaInicio) {
  if (!fechaInicio) return '-';
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const hoy = new Date();
  let years = hoy.getFullYear() - inicio.getFullYear();
  let months = hoy.getMonth() - inicio.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  return `${years} año${years !== 1 ? 's' : ''}, ${months} mes${months !== 1 ? 'es' : ''}`;
}

function getDatosTrabajador(contrato) {
  const trab = contrato.trabajador || {};
  const nombre =
    trab.nombre ||
    `${trab.nombres || ''} ${trab.apellidos || ''}`.trim() ||
    contrato.nombre_trabajador ||
    '-';

  return {
    nombre,
    rut: trab.rut || contrato.rut_trabajador || '-',
    correo: trab.correo || contrato.correo_trabajador || '',
    telefono: trab.telefono || contrato.telefono_trabajador || '',
  };
}

function formatearMonto(monto) {
  if (monto === null || monto === undefined || monto === '') return '-';
  return Number(monto).toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}

export function generarPDFContrato(contrato) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const esIndefinido = contrato.tipo_contrato === 'Indefinido';

  const AZUL = [79, 70, 229];
  const GRIS_OSC = [17, 24, 39];
  const GRIS_MED = [107, 114, 128];
  const GRIS_CLR = [243, 244, 246];
  const BLANCO = [255, 255, 255];

  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ancho, 38, 'F');

  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('AseoCorp', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento de Contrato Laboral', 14, 24);

  const hoy = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(9);
  doc.text(`Emitido: ${hoy}`, ancho - 14, 24, { align: 'right' });

  doc.setTextColor(...GRIS_OSC);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Contrato de Trabajo - ${contrato.tipo_contrato}`, 14, 52);

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(14, 56, ancho - 14, 56);

  let y = 66;

  doc.setFillColor(...GRIS_CLR);
  doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_MED);
  doc.text('DATOS DEL TRABAJADOR', 18, y);
  y += 10;

  const trabajador = getDatosTrabajador(contrato);
  fila(doc, 14, y, ancho, 'Nombre completo', trabajador.nombre, GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'RUT', trabajador.rut, GRIS_OSC, GRIS_MED); y += 9;
  if (trabajador.correo) {
    fila(doc, 14, y, ancho, 'Correo', trabajador.correo, GRIS_OSC, GRIS_MED); y += 9;
  }
  if (trabajador.telefono) {
    fila(doc, 14, y, ancho, 'Telefono', trabajador.telefono, GRIS_OSC, GRIS_MED); y += 9;
  }

  y += 4;

  doc.setFillColor(...GRIS_CLR);
  doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_MED);
  doc.text('DATOS DEL CONTRATO', 18, y);
  y += 10;

  fila(doc, 14, y, ancho, 'Tipo de contrato', contrato.tipo_contrato, GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Estado', contrato.estado ?? contrato.estado_contrato ?? '-', GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Fecha de inicio', formatearFecha(contrato.fecha_inicio), GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Fecha de termino', esIndefinido ? 'Sin vencimiento (contrato indefinido)' : formatearFecha(contrato.fecha_termino), GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Sueldo', formatearMonto(contrato.monto), GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Antiguedad', calcularAntiguedad(contrato.fecha_inicio), GRIS_OSC, GRIS_MED); y += 9;

  if (!esIndefinido && contrato.diasRestantes !== null && contrato.diasRestantes !== undefined) {
    fila(doc, 14, y, ancho, 'Dias restantes', `${contrato.diasRestantes} dias`, GRIS_OSC, GRIS_MED); y += 9;
  }

  if (contrato.observaciones) {
    y += 4;
    doc.setFillColor(...GRIS_CLR);
    doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS_MED);
    doc.text('OBSERVACIONES', 18, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRIS_OSC);
    const lineas = doc.splitTextToSize(contrato.observaciones, ancho - 28);
    doc.text(lineas, 18, y);
    y += lineas.length * 6 + 4;
  }

  const alturaPagina = doc.internal.pageSize.getHeight();
  doc.setFillColor(...GRIS_CLR);
  doc.rect(0, alturaPagina - 18, ancho, 18, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_MED);
  doc.text('Pagina 1 de 1', ancho - 14, alturaPagina - 9, { align: 'right' });

  const tipoArchivo = String(contrato.tipo_contrato || 'contrato').toLowerCase().replace(/\s+/g, '_');
  const nombreArchivo = `contrato_${tipoArchivo}_${contrato.id_contrato}.pdf`;
  doc.save(nombreArchivo);
}

function fila(doc, x, y, ancho, clave, valor, colorValor, colorClave) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colorClave);
  doc.text(clave, x + 4, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colorValor);
  doc.text(String(valor ?? '-'), x + 70, y);
}
