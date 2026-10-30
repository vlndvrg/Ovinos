import type { Request, Response } from 'express';
import * as predioService from '../services/predio.service';
import { asyncHandler } from '../utils/asyncHandler';
import { idParamSchema, predioSchema, prediosQuerySchema } from '../validation/schemas';

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const filtros = prediosQuerySchema.parse(req.query);
  res.json(await predioService.listar(req.user!, filtros));
});

export const obtener = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await predioService.obtener(id, req.user!));
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const input = predioSchema.parse(req.body);
  const predio = await predioService.crear(input, req.user!);
  res.status(201).json(predio);
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = predioSchema.parse(req.body);
  res.json(await predioService.actualizar(id, input, req.user!));
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await predioService.eliminar(id, req.user!);
  res.status(204).send();
});

export const historial = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await predioService.historial(id, req.user!));
});
