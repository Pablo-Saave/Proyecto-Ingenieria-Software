// src/utils/generarPDFContrato.js
// Genera y descarga un PDF con los datos del contrato usando jsPDF puro (sin html2canvas).

import jsPDF from 'jspdf';

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function calcularAntiguedad(fechaInicio) {
  if (!fechaInicio) return '—';
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const hoy    = new Date();
  let years  = hoy.getFullYear() - inicio.getFullYear();
  let months = hoy.getMonth()    - inicio.getMonth();
  if (months < 0) { years--; months += 12; }
  return `${years} año${years !== 1 ? 's' : ''}, ${months} mes${months !== 1 ? 'es' : ''}`;
}

export function generarPDFContrato(contrato) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();   // 210
  const esIndefinido = contrato.tipo_contrato === 'Indefinido';

  // ── Paleta ────────────────────────────────────────────────────────────────
  const AZUL     = [79, 70, 229];   // #4F46E5
  const GRIS_OSC = [17, 24, 39];    // #111827
  const GRIS_MED = [107, 114, 128]; // #6B7280
  const GRIS_CLR = [243, 244, 246]; // #F3F4F6
  const BLANCO   = [255, 255, 255];

  // ── Encabezado azul ───────────────────────────────────────────────────────
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ancho, 38, 'F');

  doc.setTextColor(...BLANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('AseoCorp', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento de Contrato Laboral', 14, 24);

  // Fecha de emisión (derecha)
  const hoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(9);
  doc.text(`Emitido: ${hoy}`, ancho - 14, 24, { align: 'right' });

  // ── Título del tipo de contrato ───────────────────────────────────────────
  doc.setTextColor(...GRIS_OSC);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Contrato de Trabajo — ${contrato.tipo_contrato}`, 14, 52);

  // Línea separadora
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(14, 56, ancho - 14, 56);

  // ── Datos del trabajador ──────────────────────────────────────────────────
  let y = 66;

  // Subtítulo sección
  doc.setFillColor(...GRIS_CLR);
  doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_MED);
  doc.text('DATOS DEL TRABAJADOR', 18, y);
  y += 10;

  // Si el contrato tiene datos de trabajador (admin/supervisor lo tienen; trabajador no)
  const trab = contrato.trabajador;
  if (trab) {
    fila(doc, 14, y, ancho, 'Nombre completo', trab.nombre ?? '—', GRIS_OSC, GRIS_MED);  y += 9;
    fila(doc, 14, y, ancho, 'RUT',             trab.rut ?? '—',    GRIS_OSC, GRIS_MED);  y += 9;
  }

  y += 4;

  // ── Datos del contrato ────────────────────────────────────────────────────
  doc.setFillColor(...GRIS_CLR);
  doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_MED);
  doc.text('DATOS DEL CONTRATO', 18, y);
  y += 10;

  fila(doc, 14, y, ancho, 'Tipo de contrato', contrato.tipo_contrato, GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Estado',           contrato.estado ?? contrato.estado_contrato ?? '—', GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Fecha de inicio',  formatearFecha(contrato.fecha_inicio), GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Fecha de término', esIndefinido ? 'Sin vencimiento (contrato indefinido)' : formatearFecha(contrato.fecha_termino), GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Antigüedad',       calcularAntiguedad(contrato.fecha_inicio), GRIS_OSC, GRIS_MED); y += 9;

  if (!esIndefinido && contrato.diasRestantes !== null && contrato.diasRestantes !== undefined) {
    fila(doc, 14, y, ancho, 'Días restantes', `${contrato.diasRestantes} días`, GRIS_OSC, GRIS_MED); y += 9;
  }

  // ── Observaciones ─────────────────────────────────────────────────────────
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
    doc.text(lineas, 14, y);
    y += lineas.length * 6 + 4;
  }

  // ── Pie de página ─────────────────────────────────────────────────────────
  const alturaPagina = doc.internal.pageSize.getHeight(); // 297
  doc.setFillColor(...GRIS_CLR);
  doc.rect(0, alturaPagina - 18, ancho, 18, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_MED);
  doc.text(`Página 1 de 1`, ancho - 14, alturaPagina - 9, { align: 'right' });

  // ── Descargar ─────────────────────────────────────────────────────────────
  const nombreArchivo = `contrato_${contrato.tipo_contrato.toLowerCase().replace(' ', '_')}_${contrato.id_contrato}.pdf`;
  doc.save(nombreArchivo);
}

// ── Helper: fila clave / valor ─────────────────────────────────────────────
function fila(doc, x, y, ancho, clave, valor, colorValor, colorClave) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colorClave);
  doc.text(clave, x + 4, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colorValor);
  doc.text(String(valor ?? '—'), x + 70, y);
}