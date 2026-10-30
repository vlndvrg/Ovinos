import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema } from '../validation/schemas';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const resultado = await authService.login(input.correo, input.password);
  res.json(resultado);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ usuario: authService.perfil(req.user!) });
});
