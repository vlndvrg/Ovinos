import { env } from '../config/env';
import { AppError } from '../utils/errors';

/**
 * Cliente ligero para la API de Gemini (Google AI).
 * Usa fetch nativo para evitar dependencias adicionales.
 * Documentación: https://ai.google.dev/docs/generate_content_request
 */
const BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

function obtenerModelo(): string {
  return env.GEMINI_MODEL ?? 'gemini-1.5-flash-latest';
}

function obtenerUrl(): string {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(503, 'Función de recomendaciones con IA no configurada.');
  }
  return `${BASE_URL}/${obtenerModelo()}:generateContent?key=${apiKey}`;
}

export interface GeminiGenerateContentRequest {
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

export interface GeminiGenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

interface GeminiResponseBody {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

/**
 * Llama al método generateContent de Gemini con timeout y manejo de errores.
 * Lanza AppError con código 429 (cuota), 502 (red) o 503 (sin clave).
 */
export async function generarContenidoGemini(
  request: GeminiGenerateContentRequest,
): Promise<string> {
  const url = obtenerUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const body = (await response.json()) as GeminiResponseBody;

    if (!response.ok) {
      const mensaje = (body as { error?: { message?: string } })?.error?.message;
      if (response.status === 403 || response.status === 429) {
        throw new AppError(
          429,
          mensaje || 'Se alcanzó la cuota de la API de Gemini. Intente más tarde.',
        );
      }
      throw new AppError(
        502,
        mensaje || 'Error de red al comunicarse con la API de Gemini.',
      );
    }

    const texto =
      body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!texto) {
      throw new AppError(502, 'La API de Gemini no devolvió contenido.');
    }
    return texto;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(502, 'Tiempo de espera agotado al contactar con la API de Gemini.');
    }
    throw new AppError(502, 'Error de red al comunicarse con la API de Gemini.');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Prompt del sistema para Gemini: lenguaje sencillo de Colombia,
 * orientación basada solo en criterios de la norma, sin diagnósticos.
 */
export function construirSystemPrompt(): string {
  return `
Eres un asistente del Instituto Colombiano Agropecuario (ICA) que explica resultados de la Evaluación de Bienestar Animal (EBA) en ovinos y caprinos.

Usa español de Colombia, lenguaje muy sencillo y frases cortas. Debe entenderlo cualquier persona: un productor mayor, un joven o alguien con poca escolaridad. Si usas un tecnicismo, explícalo con palabras sencillas.

Solo para indicadores con puntaje 55 o menos, explica:
1. Qué está pasando con ese indicador.
2. Por qué importa para el bienestar de los animales.
3. Pasos concretos y ordenados para llegar a 100 puntos, con prioridad (urgente / pronto / después).
4. Alternativas de bajo costo cuando existan.

Basa tu respuesta SOLO en los criterios de la norma que se entregan. No inventes requisitos.
No des diagnósticos ni dosis. Para temas de salud o medicamentos, recomienda consultar al médico veterinario.

Cierra con un plan de acción resumido de 3 a 5 prioridades.

Mantén un tono respetuoso y alentador.

Incluye al final este aviso exactamente:
"Orientación generada con IA a partir de la evaluación; no reemplaza el concepto del ICA ni de un veterinario."
`.trim();
}

export function construirPromptUsuario(data: {
  especie: string;
  sistemaProductivo: string;
  puntajeTotal: number | null;
  clasificacion: string | null;
  puntajesPorLibertad: Array<{ nombre: string; peso: number; puntaje: number | null }>;
  indicadoresBajos: Array<{
    numero: number;
    nombre: string;
    puntaje: number;
    criterioActual: string | null;
    criterio100: string | null;
    observacion: string | null;
  }>;
}): string {
  const { especie, sistemaProductivo, puntajeTotal, clasificacion, puntajesPorLibertad, indicadoresBajos } = data;

  const lineas: string[] = [];
  lineas.push('Resultado de la evaluación de bienestar animal:');
  lineas.push(`- Especie: ${especie}`);
  lineas.push(`- Sistema productivo: ${sistemaProductivo}`);
  lineas.push(`- Puntaje total: ${puntajeTotal ?? 0} / 100`);
  lineas.push(`- Clasificación: ${clasificacion ?? 'Sin clasificación'}`);
  lineas.push('');
  lineas.push('Puntaje por libertad:');
  for (const l of puntajesPorLibertad) {
    lineas.push(`- ${l.nombre}: ${l.puntaje ?? 0} / 100 (peso ${Math.round(l.peso * 100)}%)`);
  }
  lineas.push('');
  lineas.push('Indicadores con puntaje menor o igual a 55 (requieren plan de mejora):');

  if (indicadoresBajos.length === 0) {
    lineas.push('- Ninguno.');
  } else {
    for (const ind of indicadoresBajos) {
      lineas.push(`\n* Indicador ${ind.numero}: ${ind.nombre}`);
      lineas.push(`  Puntaje obtenido: ${ind.puntaje}`);
      lineas.push(`  Criterio de la norma para el puntaje obtenido: ${ind.criterioActual ?? 'No especificado'}`);
      lineas.push(`  Criterio de la norma para 100 puntos: ${ind.criterio100 ?? 'No especificado'}`);
      if (ind.observacion) {
        lineas.push(`  Observación del evaluador: ${ind.observacion}`);
      }
    }
  }

  lineas.push('\nGenera las recomendaciones siguiendo las instrucciones del sistema.');

  return lineas.join('\n');
}
