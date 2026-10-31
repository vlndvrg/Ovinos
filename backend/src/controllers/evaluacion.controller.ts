import type { Request, Response } from 'express';
import * as evaluacionService from '../services/evaluacion.service';
import { generarReportePdf } from '../services/reporte.service';
import { asyncHandler } from '../utils/asyncHandler';
import {
  evaluacionCreateSchema,
  evaluacionUpdateSchema,
  evaluacionesQuerySchema,
  historialGlobalQuerySchema,
  idIndicadorParamSchema,
  idParamSchema,
  puntajeSchema,
} from '../validation/schemas';

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const filtros = evaluacionesQuerySchema.parse(req.query);
  res.json(await evaluacionService.listar(req.user!, filtros));
});

export const historialGlobal = asyncHandler(async (req: Request, res: Response) => {
  const filtros = historialGlobalQuerySchema.parse(req.query);
  res.json(await evaluacionService.historialGlobal(req.user!, filtros));
});

export const detalle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await evaluacionService.detalle(req.user!, id));
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const input = evaluacionCreateSchema.parse(req.body);
  const evaluacion = await evaluacionService.crear(req.user!, input);
  res.status(201).json(evaluacion);
});

export const actualizarCabecera = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = evaluacionUpdateSchema.parse(req.body);
  res.json(await evaluacionService.actualizarCabecera(req.user!, id, input));
});

export const calificar = asyncHandler(async (req: Request, res: Response) => {
  const { id, indicadorId } = idIndicadorParamSchema.parse(req.params);
  const input = puntajeSchema.parse(req.body);
  res.json(await evaluacionService.calificar(req.user!, id, indicadorId, input));
});

export const cerrar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await evaluacionService.cerrar(req.user!, id));
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await evaluacionService.eliminar(req.user!, id);
  res.status(204).send();
});

export const reporte = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const data = await evaluacionService.datosReporte(req.user!, id);
  const doc = generarReportePdf(data);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="reporte-eba-${data.predio.id}-${data.id}.pdf"`,
  );
  doc.pipe(res);
  doc.end();
});
