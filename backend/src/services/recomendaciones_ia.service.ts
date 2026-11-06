import { env } from '../config/env';
import type { AuthUser, Evaluacion, ItemEvaluacion, Puntaje } from '../types/domain';
import * as evaluacionRepository from '../repositories/evaluacion.repository';
import * as predioRepository from '../repositories/predio.repository';
import * as recomendacionesIaRepository from '../repositories/recomendaciones_ia.repository';
import {
  construirPromptUsuario,
  construirSystemPrompt,
  generarContenidoGemini,
} from './gemini.service';
import { conflict, forbidden, notFound } from '../utils/errors';

interface PuntajePorLibertad {
  nombre: string;
  peso: number;
  puntaje: number | null;
}

interface IndicadorBajo {
  numero: number;
  nombre: string;
  puntaje: number;
  criterioActual: string | null;
  criterio100: string | null;
  observacion: string | null;
}

/**
 * Límite de solicitudes de IA por usuario por hora (ventana deslizante simple en memoria).
 * En un entorno con múltiples instancias del servidor esto debería moverse a Redis.
 */
const LIMITE_POR_HORA = 5;
const VENTANA_MS = 60 * 60 * 1000;

const solicitudesPorUsuario = new Map<number, number[]>();

function verificarLimiteUsuario(userId: number): void {
  const ahora = Date.now();
  const marcas = solicitudesPorUsuario.get(userId) ?? [];
  const ventanaInicio = ahora - VENTANA_MS;

  const recientes = marcas.filter((marca) => marca > ventanaInicio);
  if (recientes.length >= LIMITE_POR_HORA) {
    throw conflict(
      `Ha alcanzado el límite de ${LIMITE_POR_HORA} solicitudes de IA por hora. Intente nuevamente más tarde.`,
    );
  }

  recientes.push(ahora);
  solicitudesPorUsuario.set(userId, recientes);
}

function tieneAcceso(
  evaluacion: Evaluacion,
  predio: { id: number; responsable_id: number | null } | null,
  user: AuthUser,
): boolean {
  if (user.rol === 'ADMIN') return true;
  if (user.rol === 'EVALUADOR' && evaluacion.evaluador_id === user.id) return true;
  if (
    user.rol === 'RESPONSABLE' &&
    predio &&
    predio.responsable_id === user.id
  ) {
    return true;
  }
  return false;
}

export async function obtenerOGenerarRecomendacion(
  user: AuthUser,
  evaluacionId: number,
  regenerar = false,
): Promise<{ recomendacion: any; modelo: string }> {
  const evaluacion = await evaluacionRepository.findById(evaluacionId);
  if (!evaluacion) throw notFound('Evaluación no encontrada.');

  const predio = await predioRepository.findById(evaluacion.predio_id);
  if (!predio) throw notFound('Predio no encontrado.');

  if (user.rol === 'RESPONSABLE' && evaluacion.estado !== 'CERRADA') {
    throw forbidden('Solo puede consultar recomendaciones de evaluaciones cerradas.');
  }
  if (!tieneAcceso(evaluacion, predio, user)) {
    throw forbidden('No tiene acceso a esta evaluación.');
  }

  const existente = await recomendacionesIaRepository.encontrarPorEvaluacion(
    evaluacionId,
  );
  if (existente && !regenerar) {
    return { recomendacion: existente, modelo: existente.modelo };
  }

  const items = await evaluacionRepository.findItems(evaluacionId);

  const puntajesPorLibertad: PuntajePorLibertad[] = [
    { nombre: 'L1 · Libre de hambre, sed y desnutrición', peso: 0.2, puntaje: null },
    { nombre: 'L2 · Libre de molestias físicas y térmicas', peso: 0.2, puntaje: null },
    { nombre: 'L3 · Libre de dolor, lesión y enfermedad', peso: 0.35, puntaje: null },
    { nombre: 'L4 · Libre de temor y angustia', peso: 0.1, puntaje: null },
    { nombre: 'L5 · Libre de impedimentos de comportamiento natural', peso: 0.15, puntaje: null },
  ];

  for (const item of items) {
    const libertad = puntajesPorLibertad.find((l) => l.nombre.startsWith(`L${item.libertad_id} ·`));
    if (libertad && item.puntaje !== null) {
      libertad.puntaje = item.puntaje;
    }
  }

  const indicadoresBajos: IndicadorBajo[] = items
    .filter(
      (item): item is ItemEvaluacion & { puntaje: Puntaje } =>
        item.puntaje !== null && item.puntaje <= 55,
    )
    .map((item) => ({
      numero: item.numero,
      nombre: item.nombre,
      puntaje: item.puntaje,
      criterioActual: item.criterio_55 ?? item.criterio_20 ?? item.criterio_0 ?? null,
      criterio100: item.criterio_100 ?? null,
      observacion: item.observacion ?? null,
    }))
    .sort((a, b) => a.puntaje - b.puntaje);

  verificarLimiteUsuario(user.id);

  const contenido = await generarContenidoGemini({
    systemInstruction: { parts: [{ text: construirSystemPrompt() }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: construirPromptUsuario({
              especie: predio.especie,
              sistemaProductivo: predio.sistema_productivo,
              puntajeTotal: evaluacion.puntaje_total,
              clasificacion: evaluacion.clasificacion,
              puntajesPorLibertad,
              indicadoresBajos,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1500,
    },
  });

  const modelo = env.GEMINI_MODEL ?? 'gemini-1.5-flash-latest';

  if (existente) {
    await recomendacionesIaRepository.actualizar(evaluacionId, contenido, modelo);
  } else {
    await recomendacionesIaRepository.crear(evaluacionId, contenido, modelo);
  }

  const guardada = await recomendacionesIaRepository.encontrarPorEvaluacion(evaluacionId);
  if (!guardada) {
    throw new Error('No se pudo guardar la recomendación de IA.');
  }

  return { recomendacion: guardada, modelo };
}

export async function eliminarRecomendacion(evaluacionId: number): Promise<void> {
  const existente = await recomendacionesIaRepository.encontrarPorEvaluacion(
    evaluacionId,
  );
  if (!existente) throw notFound('No existe una recomendación de IA para esta evaluación.');
  await recomendacionesIaRepository.eliminar(evaluacionId);
}
