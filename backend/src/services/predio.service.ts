import type { z } from 'zod';
import * as evaluacionRepository from '../repositories/evaluacion.repository';
import * as predioRepository from '../repositories/predio.repository';
import * as usuarioRepository from '../repositories/usuario.repository';
import type { AuthUser, PredioConResumen } from '../types/domain';
import { conflict, forbidden, notFound } from '../utils/errors';
import { predioSchema, prediosQuerySchema } from '../validation/schemas';

type PredioInput = z.infer<typeof predioSchema>;
type PrediosQuery = z.infer<typeof prediosQuerySchema>;

async function validarResponsable(responsableId: number | null | undefined) {
  if (responsableId === null || responsableId === undefined) return null;
  const responsable = await usuarioRepository.findById(responsableId);
  if (!responsable || responsable.rol !== 'RESPONSABLE') {
    throw conflict('El responsable seleccionado no existe o no tiene rol RESPONSABLE.');
  }
  if (!responsable.activo) {
    throw conflict('El responsable seleccionado está inactivo.');
  }
  return responsableId;
}

function asegurarAcceso(predio: PredioConResumen, user: AuthUser) {
  if (user.rol === 'RESPONSABLE' && predio.responsable_id !== user.id) {
    throw forbidden('No tiene acceso a este predio.');
  }
}

export async function listar(user: AuthUser, filtros: PrediosQuery) {
  const filtrosRepo: predioRepository.FiltrosPredios = {
    search: filtros.search,
    especie: filtros.especie,
    sistema: filtros.sistema,
    responsableId: filtros.responsableId,
  };

  if (user.rol === 'RESPONSABLE') {
    filtrosRepo.soloResponsableId = user.id;
    delete filtrosRepo.responsableId;
  }

  return predioRepository.findAll(filtrosRepo);
}

export async function obtener(id: number, user: AuthUser) {
  const predio = await predioRepository.findById(id);
  if (!predio) throw notFound('Predio no encontrado.');
  asegurarAcceso(predio, user);
  return predio;
}

export async function crear(input: PredioInput, user: AuthUser) {
  if (user.rol === 'RESPONSABLE') {
    throw forbidden('Los responsables de predio no pueden crear predios.');
  }

  const responsableId = await validarResponsable(input.responsable_id);
  const id = await predioRepository.create({
    nombre: input.nombre,
    municipio: input.municipio,
    direccion: input.direccion ?? null,
    especie: input.especie,
    sistema_productivo: input.sistema_productivo,
    es_ovino_de_lana: input.especie === 'OVINO' ? input.es_ovino_de_lana : false,
    numero_animales: input.numero_animales,
    responsable_id: responsableId,
    creado_por: user.id,
  });

  return obtener(id, user);
}

export async function actualizar(id: number, input: PredioInput, user: AuthUser) {
  if (user.rol === 'RESPONSABLE') {
    throw forbidden('Los responsables de predio no pueden editar predios.');
  }

  const existente = await predioRepository.findById(id);
  if (!existente) throw notFound('Predio no encontrado.');

  const responsableId = await validarResponsable(input.responsable_id);
  await predioRepository.update(id, {
    nombre: input.nombre,
    municipio: input.municipio,
    direccion: input.direccion ?? null,
    especie: input.especie,
    sistema_productivo: input.sistema_productivo,
    es_ovino_de_lana: input.especie === 'OVINO' ? input.es_ovino_de_lana : false,
    numero_animales: input.numero_animales,
    responsable_id: responsableId,
  });

  return obtener(id, user);
}

export async function eliminar(id: number, user: AuthUser) {
  if (user.rol !== 'ADMIN') {
    throw forbidden('Solo el administrador puede eliminar predios.');
  }
  const predio = await predioRepository.findById(id);
  if (!predio) throw notFound('Predio no encontrado.');

  const totalEvaluaciones = await predioRepository.countEvaluaciones(id);
  if (totalEvaluaciones > 0) {
    throw conflict('No se puede eliminar un predio que tiene evaluaciones asociadas.');
  }

  await predioRepository.remove(id);
}

export async function historial(id: number, user: AuthUser) {
  const predio = await obtener(id, user);
  const evaluaciones = await evaluacionRepository.findHistorial(id);
  return { predio, evaluaciones };
}
