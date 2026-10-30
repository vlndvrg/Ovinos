import bcrypt from 'bcryptjs';
import type { z } from 'zod';
import * as predioRepository from '../repositories/predio.repository';
import * as usuarioRepository from '../repositories/usuario.repository';
import type { AuthUser, Rol } from '../types/domain';
import { conflict, forbidden, notFound } from '../utils/errors';
import {
  asignarPrediosSchema,
  usuarioCreateSchema,
  usuarioUpdateSchema,
} from '../validation/schemas';

type CrearUsuarioInput = z.infer<typeof usuarioCreateSchema>;
type ActualizarUsuarioInput = z.infer<typeof usuarioUpdateSchema>;
type AsignarPrediosInput = z.infer<typeof asignarPrediosSchema>;

export async function listar(filtros: { rol?: Rol; search?: string }) {
  return usuarioRepository.findAll(filtros);
}

export async function listarResponsables() {
  return usuarioRepository.findResponsables();
}

export async function crear(input: CrearUsuarioInput) {
  const existente = await usuarioRepository.findByCorreo(input.correo);
  if (existente) {
    throw conflict('Ya existe un usuario con ese correo.');
  }

  const password_hash = await bcrypt.hash(input.password, 10);
  const id = await usuarioRepository.create({
    nombre: input.nombre,
    correo: input.correo,
    password_hash,
    rol: input.rol,
    activo: input.activo,
  });

  const creado = await usuarioRepository.findById(id);
  if (!creado) throw notFound('No se pudo crear el usuario.');
  return creado;
}

export async function actualizar(
  id: number,
  input: ActualizarUsuarioInput,
  actor: AuthUser,
) {
  const actual = await usuarioRepository.findById(id);
  if (!actual) throw notFound('Usuario no encontrado.');

  if (input.correo && input.correo !== actual.correo) {
    const existente = await usuarioRepository.findByCorreo(input.correo);
    if (existente && existente.id !== id) {
      throw conflict('Ya existe un usuario con ese correo.');
    }
  }

  const pierdeAdmin =
    actual.rol === 'ADMIN' &&
    actual.activo &&
    (input.rol !== undefined && input.rol !== 'ADMIN' ? true : input.activo === false);

  if (pierdeAdmin) {
    const admins = await usuarioRepository.countAdminsActivos();
    if (admins <= 1) {
      throw conflict('No es posible desactivar o cambiar el rol del último administrador activo.');
    }
  }

  if (id === actor.id && input.activo === false) {
    throw conflict('No puede desactivar su propio usuario.');
  }
  if (id === actor.id && input.rol !== undefined && input.rol !== 'ADMIN') {
    throw conflict('No puede cambiar su propio rol de administrador.');
  }

  if (actual.rol === 'RESPONSABLE' && input.rol && input.rol !== 'RESPONSABLE') {
    const prediosAsignados = await predioRepository.findAll({ responsableId: id });
    if (prediosAsignados.length > 0) {
      throw conflict(
        'El usuario tiene predios asignados. Reasígnelos antes de cambiar su rol.',
      );
    }
  }

  const datos: usuarioRepository.ActualizarUsuario = {
    nombre: input.nombre,
    correo: input.correo,
    rol: input.rol,
    activo: input.activo,
  };

  if (input.password) {
    datos.password_hash = await bcrypt.hash(input.password, 10);
  }

  await usuarioRepository.update(id, datos);
  const actualizado = await usuarioRepository.findById(id);
  if (!actualizado) throw notFound('Usuario no encontrado.');
  return actualizado;
}

export async function cambiarEstado(id: number, activo: boolean, actor: AuthUser) {
  const actual = await usuarioRepository.findById(id);
  if (!actual) throw notFound('Usuario no encontrado.');

  if (!activo && id === actor.id) {
    throw conflict('No puede desactivar su propio usuario.');
  }

  if (!activo && actual.rol === 'ADMIN') {
    const admins = await usuarioRepository.countAdminsActivos();
    if (admins <= 1) {
      throw conflict('No es posible desactivar el último administrador activo.');
    }
  }

  await usuarioRepository.setActivo(id, activo);
  return usuarioRepository.findById(id);
}

export async function asignarPredios(
  id: number,
  input: AsignarPrediosInput,
  actor: AuthUser,
) {
  if (id === actor.id) {
    throw forbidden('No puede asignarse predios a sí mismo desde esta opción.');
  }

  const responsable = await usuarioRepository.findById(id);
  if (!responsable) throw notFound('Usuario no encontrado.');
  if (responsable.rol !== 'RESPONSABLE') {
    throw conflict('Solo se pueden asignar predios a usuarios con rol RESPONSABLE.');
  }

  const predios = await predioRepository.findByIds(input.predioIds);
  if (predios.length !== input.predioIds.length) {
    throw conflict('Uno o más predios seleccionados no existen.');
  }

  await predioRepository.reasignarPrediosAUsuario(id, input.predioIds);
  return predioRepository.findAll({ responsableId: id });
}
