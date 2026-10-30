import type { Request, Response } from 'express';
import * as catalogoService from '../services/catalogo.service';
import { asyncHandler } from '../utils/asyncHandler';
import { idParamSchema, indicadorUpdateSchema } from '../validation/schemas';

export const listarLibertades = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await catalogoService.listarLibertades());
});

export const listarIndicadores = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await catalogoService.listarIndicadores());
});

export const actualizarIndicador = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = indicadorUpdateSchema.parse(req.body);
  const indicador = await catalogoService.actualizarIndicador(id, input);
  res.json(indicador);
});
