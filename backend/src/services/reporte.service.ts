import PDFDocument from 'pdfkit';
import type { Clasificacion, EvaluacionDetalle } from '../types/domain';

const COLORS = {
  primary: '#1e5a3a',
  primarySoft: '#e7f1ea',
  accent: '#348d58',
  earth: '#8a6f4d',
  text: '#24332a',
  muted: '#66756b',
  border: '#dfe8e2',
  white: '#ffffff',
};

const COLOR_CLASIFICACION: Record<Clasificacion, string> = {
  'EXCELENTE BIENESTAR': '#1f7a4d',
  ALTO: '#2563a8',
  MEDIO: '#b7791f',
  BAJO: '#b23b3b',
};

const ETIQUETA_ESPECIE: Record<string, string> = {
  OVINO: 'Ovino',
  CAPRINO: 'Caprino',
};

const ETIQUETA_SISTEMA: Record<string, string> = {
  EXTENSIVO: 'Extensivo',
  SEMI_INTENSIVO: 'Semi intensivo',
  INTENSIVO: 'Intensivo',
  FAMILIAR: 'Familiar',
};

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

function porcentaje(peso: number): string {
  return `${Math.round(peso * 100)} %`;
}

function ensureSpace(doc: PDFKit.PDFDocument, alto: number) {
  if (doc.y + alto > doc.page.height - 70) {
    doc.addPage();
  }
}

function etiquetaDato(doc: PDFKit.PDFDocument, etiqueta: string, valor: string) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text(etiqueta.toUpperCase());
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(valor);
  doc.moveDown(0.35);
}

export function generarReportePdf(data: EvaluacionDetalle): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 46, bottom: 58, left: 48, right: 48 },
    bufferPages: true,
    info: {
      Title: `Informe EBA - ${data.predio.nombre}`,
      Author: 'Sistema de Evaluación de Bienestar Animal (EBA)',
      Subject: 'Evaluación de bienestar animal en ovinos y caprinos',
    },
  });

  const ancho = doc.page.width - 96;

  // Encabezado
  doc.rect(0, 0, doc.page.width, 92).fill(COLORS.primary);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(20).text('EBA · Bienestar Animal', 48, 28);
  doc.font('Helvetica').fontSize(9).fillColor('#d7eadf').text(
    'Sistema de Evaluación de Bienestar Animal en ovinos y caprinos · Metodología ICA',
    48,
    54,
  );
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white).text(
    'INFORME DE EVALUACIÓN',
    48,
    70,
    { width: ancho, align: 'right' },
  );

  doc.y = 112;

  // Datos del predio
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.primary).text(data.predio.nombre);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(
      `${data.predio.municipio}${data.predio.direccion ? ` · ${data.predio.direccion}` : ''}`,
    );
  doc.moveDown(0.8);

  const columnaIzquierda = 48;
  const columnaDerecha = 320;
  const yDatos = doc.y;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text('INFORMACIÓN DEL PREDIO', columnaIzquierda, yDatos);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text('DATOS DE LA EVALUACIÓN', columnaDerecha, yDatos);
  doc.y = yDatos + 15;

  const yInicioColumnas = doc.y;
  doc.x = columnaIzquierda;
  etiquetaDato(doc, 'Especie', ETIQUETA_ESPECIE[data.predio.especie] ?? data.predio.especie);
  etiquetaDato(doc, 'Sistema productivo', ETIQUETA_SISTEMA[data.predio.sistema_productivo] ?? data.predio.sistema_productivo);
  etiquetaDato(
    doc,
    'Ovino de lana',
    data.predio.especie === 'OVINO' ? (data.predio.es_ovino_de_lana ? 'Sí' : 'No') : 'No aplica',
  );
  etiquetaDato(doc, 'Número de animales', String(data.predio.numero_animales));
  etiquetaDato(doc, 'Responsable', data.predio.responsable_nombre ?? 'Sin asignar');

  doc.x = columnaDerecha;
  doc.y = yInicioColumnas;
  etiquetaDato(doc, 'Fecha de evaluación', formatearFecha(data.fecha));
  etiquetaDato(doc, 'Evaluador', data.evaluador.nombre);
  etiquetaDato(doc, 'Estado', 'Cerrada');
  etiquetaDato(doc, 'Indicadores calificados', `${data.resumen.calificados} de ${data.resumen.total}`);

  doc.x = 48;
  doc.y = Math.max(doc.y, yInicioColumnas + 115);
  doc.moveDown(0.4);

  // Puntaje y clasificación
  const yPuntaje = doc.y;
  doc.roundedRect(48, yPuntaje, ancho, 74, 10).fill(COLORS.primarySoft);
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(9).text('PUNTAJE TOTAL', 66, yPuntaje + 14);
  doc.font('Helvetica-Bold').fontSize(30).fillColor(COLORS.primary).text(
    `${(data.puntaje_total ?? 0).toFixed(2)} / 100`,
    66,
    yPuntaje + 28,
  );

  const clasificacion = data.clasificacion ?? 'SIN CLASIFICACIÓN';
  const colorClasificacion =
    COLOR_CLASIFICACION[data.clasificacion as Clasificacion] ?? COLORS.muted;
  const anchoBadge = 190;
  doc.roundedRect(48 + ancho - anchoBadge - 18, yPuntaje + 20, anchoBadge, 34, 8).fill(colorClasificacion);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(11).text(clasificacion, 48 + ancho - anchoBadge - 18, yPuntaje + 31, {
    width: anchoBadge,
    align: 'center',
  });

  doc.y = yPuntaje + 92;
  doc.x = 48;

  // Tabla por libertad
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('Resultados por libertad');
  doc.moveDown(0.5);

  const yTabla = doc.y;
  doc.rect(48, yTabla, ancho, 20).fill(COLORS.primary);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8);
  doc.text('LIBERTAD', 58, yTabla + 6, { width: 300 });
  doc.text('PESO', 380, yTabla + 6, { width: 60, align: 'right' });
  doc.text('PUNTAJE', 460, yTabla + 6, { width: 80, align: 'right' });

  let y = yTabla + 20;
  data.resumen.libertades.forEach((libertad, indice) => {
    const alto = 24;
    doc.rect(48, y, ancho, alto).fill(indice % 2 === 0 ? '#f7faf8' : COLORS.white);
    doc
      .fillColor(COLORS.text)
      .font('Helvetica')
      .fontSize(8)
      .text(`L${indice + 1} · ${libertad.libertad_nombre}`, 58, y + 8, { width: 310 });
    doc.text(porcentaje(libertad.peso), 380, y + 8, { width: 60, align: 'right' });
    doc
      .font('Helvetica-Bold')
      .fillColor(COLORS.primary)
      .text(libertad.puntaje === null ? '—' : libertad.puntaje.toFixed(2), 460, y + 8, {
        width: 80,
        align: 'right',
      });
    y += alto;
  });

  doc
    .moveTo(48, y)
    .lineTo(48 + ancho, y)
    .strokeColor(COLORS.border)
    .stroke();

  doc.y = y + 18;
  doc.x = 48;

  // Detalle por indicador
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('Detalle de indicadores');
  doc.moveDown(0.4);

  const grupos = data.resumen.libertades
    .map((libertad) => ({
      libertad,
      items: data.items.filter((item) => item.libertad_id === libertad.libertad_id),
    }))
    .filter((grupo) => grupo.items.length > 0);

  grupos.forEach((grupo, indiceGrupo) => {
    ensureSpace(doc, 48);
    doc.roundedRect(48, doc.y, ancho, 20, 4).fill(COLORS.primarySoft);
    doc
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(
        `L${indiceGrupo + 1} · ${grupo.libertad.libertad_nombre} · ${porcentaje(grupo.libertad.peso)}`,
        58,
        doc.y + 6,
        { width: ancho - 20 },
      );
    doc.y += 26;

    grupo.items.forEach((item) => {
      const altoObservacion = item.observacion ? 18 : 0;
      ensureSpace(doc, 26 + altoObservacion);
      const yItem = doc.y;
      doc
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(`${item.numero}. ${item.nombre}`, 58, yItem, { width: ancho - 130 });
      doc
        .font('Helvetica-Bold')
        .fillColor(item.puntaje !== null && item.puntaje < 55 ? COLOR_CLASIFICACION.BAJO : COLORS.primary)
        .text(item.puntaje === null ? 'Sin calificar' : String(item.puntaje), 48 + ancho - 70, yItem, {
          width: 60,
          align: 'right',
        });
      let siguienteY = yItem + 13;
      if (item.observacion) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(7.5)
          .fillColor(COLORS.muted)
          .text(`Observación: ${item.observacion}`, 58, siguienteY, { width: ancho - 130 });
        siguienteY += 14;
      }
      doc.y = siguienteY + 4;
    });
    doc.moveDown(0.5);
  });

  // Observaciones generales
  if (data.observaciones) {
    ensureSpace(doc, 70);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('Observaciones generales');
    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(data.observaciones, { width: ancho, align: 'justify' });
    doc.moveDown(1);
  }

  // Recomendaciones generadas con IA
  if (data.recomendacion_ia?.contenido) {
    ensureSpace(doc, 70);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary).text('Recomendaciones generadas con IA');
    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.text)
      .text(data.recomendacion_ia.contenido, { width: ancho, align: 'justify' });
    doc.moveDown(0.3);
    doc
      .font('Helvetica-Oblique')
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(`Modelo utilizado: ${data.recomendacion_ia.modelo}. Orientación generada con IA a partir de la evaluación; no reemplaza el concepto del ICA ni de un veterinario.`, {
        width: ancho,
        align: 'justify',
      });
    doc.moveDown(1);
  }

  // Firmas
  ensureSpace(doc, 90);
  doc.moveDown(1);
  const yFirmas = doc.y + 20;
  doc
    .moveTo(48, yFirmas)
    .lineTo(238, yFirmas)
    .strokeColor(COLORS.muted)
    .stroke();
  doc
    .moveTo(320, yFirmas)
    .lineTo(510, yFirmas)
    .strokeColor(COLORS.muted)
    .stroke();
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text('Firma del evaluador', 48, yFirmas + 6, { width: 190 })
    .text(data.evaluador.nombre, 48, yFirmas + 18, { width: 190 })
    .text('Firma del responsable del predio', 320, yFirmas + 6, { width: 190 })
    .text(data.predio.responsable_nombre ?? 'Responsable del predio', 320, yFirmas + 18, {
      width: 190,
    });

  // Pie de página en todas las páginas
  const rango = doc.bufferedPageRange();
  for (let i = rango.start; i < rango.start + rango.count; i += 1) {
    doc.switchToPage(i);
    const margenInferiorOriginal = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .moveTo(48, doc.page.height - 38)
      .lineTo(doc.page.width - 48, doc.page.height - 38)
      .strokeColor(COLORS.border)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(
        'Sistema EBA · Instituto Colombiano Agropecuario (ICA) · Documento generado automáticamente',
        48,
        doc.page.height - 30,
        { width: ancho - 90, lineBreak: false },
      );
    doc.text(`Página ${i + 1} de ${rango.count}`, 48, doc.page.height - 30, {
      width: ancho,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = margenInferiorOriginal;
  }

  return doc;
}
