import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Rol } from '../types/domain';
import { unauthorized } from '../utils/errors';

export interface TokenPayload {
  sub: number;
  rol: Rol;
}

export function signToken(usuario: { id: number; rol: Rol }): string {
  return jwt.sign({ rol: usuario.rol }, env.JWT_SECRET, {
    subject: String(usuario.id),
    expiresIn: '12h',
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || !payload.sub) {
      throw unauthorized('Token inválido.');
    }
    return {
      sub: Number(payload.sub),
      rol: payload.rol as Rol,
    };
  } catch {
    throw unauthorized('Su sesión expiró o el token no es válido. Inicie sesión nuevamente.');
  }
}
