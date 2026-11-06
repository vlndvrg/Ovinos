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

  const { criterios, ...camposIndicador } = input;
  await indicadorRepository.update(id, camposIndicador);
  if (criterios && criterios.length > 0) {
    await indicadorRepository.upsertCriterios(id, criterios);
  }
  return indicadorRepository.findById(id);
}
