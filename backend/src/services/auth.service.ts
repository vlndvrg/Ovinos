import bcrypt from 'bcryptjs';
import * as usuarioRepository from '../repositories/usuario.repository';
import type { AuthUser } from '../types/domain';
import { unauthorized } from '../utils/errors';
import { signToken } from '../utils/jwt';

export async function login(correo: string, password: string) {
  const usuario = await usuarioRepository.findByCorreo(correo);
  if (!usuario || !usuario.activo) {
    throw unauthorized('Correo o contraseña incorrectos.');
  }

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) {
    throw unauthorized('Correo o contraseña incorrectos.');
  }

  const { password_hash: _omit, ...usuarioSeguro } = usuario;
  return {
    token: signToken(usuario),
    usuario: usuarioSeguro,
  };
}

export function perfil(user: AuthUser): AuthUser {
  return user;
}
