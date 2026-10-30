import type { Request, Response } from 'express';
import * as usuarioService from '../services/usuario.service';
import { asyncHandler } from '../utils/asyncHandler';
import {
  asignarPrediosSchema,
  idParamSchema,
  usuarioCreateSchema,
  usuarioEstadoSchema,
  usuarioUpdateSchema,
  usuariosQuerySchema,
} from '../validation/schemas';

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const filtros = usuariosQuerySchema.parse(req.query);
  res.json(await usuarioService.listar(filtros));
});

export const listarResponsables = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await usuarioService.listarResponsables());
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const input = usuarioCreateSchema.parse(req.body);
  const usuario = await usuarioService.crear(input);
  res.status(201).json(usuario);
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = usuarioUpdateSchema.parse(req.body);
  const usuario = await usuarioService.actualizar(id, input, req.user!);
  res.json(usuario);
});

export const cambiarEstado = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const { activo } = usuarioEstadoSchema.parse(req.body);
  const usuario = await usuarioService.cambiarEstado(id, activo, req.user!);
  res.json(usuario);
});

export const asignarPredios = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const input = asignarPrediosSchema.parse(req.body);
  const predios = await usuarioService.asignarPredios(id, input, req.user!);
  res.json(predios);
});
