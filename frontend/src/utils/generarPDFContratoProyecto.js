import jsPDF from 'jspdf';

function formatearFecha(fecha) {
  if (!fecha) return '-';
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatearMonto(monto) {
  if (monto === null || monto === undefined || monto === '') return '-';
  return Number(monto).toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}

function getDatosCliente(contrato) {
  const cli = contrato.proyecto?.cliente || {};
  const nombre = `${cli.nombres || ''} ${cli.apellidos || ''}`.trim() || 'Sin cliente';
  return {
    nombre,
    rut: cli.rut || '-',
    correo: cli.correo || '',
    telefono: cli.telefono || '',
  };
}

export function generarPDFContratoProyecto(contrato) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();

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
  doc.text('Documento de Contrato de Proyecto', 14, 24);

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
  doc.text(`Contrato de Proyecto - ${contrato.proyecto?.nombre_proyecto || 'Sin nombre'}`, 14, 52);

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(14, 56, ancho - 14, 56);

  let y = 66;

  doc.setFillColor(...GRIS_CLR);
  doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_MED);
  doc.text('DATOS DEL CLIENTE', 18, y);
  y += 10;

  const cliente = getDatosCliente(contrato);
  fila(doc, 14, y, ancho, 'Nombre completo', cliente.nombre, GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'RUT', cliente.rut, GRIS_OSC, GRIS_MED); y += 9;
  if (cliente.correo) {
    fila(doc, 14, y, ancho, 'Correo', cliente.correo, GRIS_OSC, GRIS_MED); y += 9;
  }
  if (cliente.telefono) {
    fila(doc, 14, y, ancho, 'Telefono', cliente.telefono, GRIS_OSC, GRIS_MED); y += 9;
  }

  y += 4;

  doc.setFillColor(...GRIS_CLR);
  doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_MED);
  doc.text('DATOS DEL PROYECTO', 18, y);
  y += 10;

  fila(doc, 14, y, ancho, 'Proyecto', contrato.proyecto?.nombre_proyecto || '-', GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Direccion', contrato.proyecto?.direccion || '-', GRIS_OSC, GRIS_MED); y += 9;

  y += 4;

  doc.setFillColor(...GRIS_CLR);
  doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_MED);
  doc.text('DATOS DEL CONTRATO', 18, y);
  y += 10;

  fila(doc, 14, y, ancho, 'Estado', contrato.estadoLabel ?? contrato.estado_contrato ?? '-', GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Fecha de inicio', formatearFecha(contrato.fecha_inicio), GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Fecha de termino', formatearFecha(contrato.fecha_termino), GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Fecha extension vigente', formatearFecha(contrato.fecha_extension), GRIS_OSC, GRIS_MED); y += 9;
  fila(doc, 14, y, ancho, 'Monto', formatearMonto(contrato.monto), GRIS_OSC, GRIS_MED); y += 9;

  if (contrato.diasRestantes !== null && contrato.diasRestantes !== undefined) {
    fila(doc, 14, y, ancho, 'Dias restantes', `${contrato.diasRestantes} dias`, GRIS_OSC, GRIS_MED); y += 9;
  }

  if (contrato.descripcion) {
    y += 4;
    doc.setFillColor(...GRIS_CLR);
    doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS_MED);
    doc.text('DESCRIPCION', 18, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRIS_OSC);
    const lineas = doc.splitTextToSize(contrato.descripcion, ancho - 28);
    doc.text(lineas, 14, y);
    y += lineas.length * 6 + 4;
  }

  if (contrato.anexos && contrato.anexos.length > 0) {
    y += 4;
    doc.setFillColor(...GRIS_CLR);
    doc.roundedRect(14, y - 5, ancho - 28, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS_MED);
    doc.text(`ANEXOS (${contrato.anexos.length})`, 18, y);
    y += 10;

    contrato.anexos.forEach((a) => {
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...GRIS_OSC);
      doc.text(`${formatearFecha(a.fecha_anexo)} - ${a.motivo || ''}`, 14, y);
      y += 6;

      if (a.descripcion_modificacion) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...GRIS_MED);
        const lineasAnexo = doc.splitTextToSize(a.descripcion_modificacion, ancho - 28);
        doc.text(lineasAnexo, 14, y);
        y += lineasAnexo.length * 5 + 2;
      }
      y += 4;
    });
  }

  const alturaPagina = doc.internal.pageSize.getHeight();
  doc.setFillColor(...GRIS_CLR);
  doc.rect(0, alturaPagina - 18, ancho, 18, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS_MED);
  doc.text('Pagina 1 de 1', ancho - 14, alturaPagina - 9, { align: 'right' });

  const nombreArchivo = `contrato_proyecto_${contrato.id_contrato_proyecto}.pdf`;
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