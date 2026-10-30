import type { z } from 'zod';
import * as indicadorRepository from '../repositories/indicador.repository';
import * as libertadRepository from '../repositories/libertad.repository';
import { notFound } from '../utils/errors';
import { indicadorUpdateSchema } from '../validation/schemas';

type ActualizarIndicadorInput = z.infer<typeof indicadorUpdateSchema>;

export async function listarLibertades() {
  return libertadRepository.findAll();
}

export async function listarIndicadores() {
  return indicadorRepository.findAll();
}

export async function actualizarIndicador(id: number, input: ActualizarIndicadorInput) {
  const indicador = await indicadorRepository.findById(id);
  if (!indicador) throw notFound('Indicador no encontrado.');

  await indicadorRepository.update(id, input);
  return indicadorRepository.findById(id);
}
