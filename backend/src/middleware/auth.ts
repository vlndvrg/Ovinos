import type { NextFunction, Request, RequestHandler, Response } from 'express';
import * as usuarioRepository from '../repositories/usuario.repository';
import type { Rol } from '../types/domain';
import { asyncHandler } from '../utils/asyncHandler';
import { forbidden, unauthorized } from '../utils/errors';
import { verifyToken } from '../utils/jwt';

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw unauthorized();
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  const usuario = await usuarioRepository.findById(payload.sub);

  if (!usuario || !usuario.activo) {
    throw unauthorized('El usuario no existe o está inactivo.');
  }

  req.user = {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
  };
  next();
});

export function requireRole(...roles: Rol[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.user.rol)) {
      next(forbidden('Su rol no tiene permisos para esta operación.'));
      return;
    }
    next();
  };
}
