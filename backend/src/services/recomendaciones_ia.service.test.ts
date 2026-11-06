import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser, Evaluacion, ItemEvaluacion } from '../types/domain';
import * as evaluacionRepository from '../repositories/evaluacion.repository';
import * as predioRepository from '../repositories/predio.repository';
import * as recomendacionesIaRepository from '../repositories/recomendaciones_ia.repository';
import * as geminiService from './gemini.service';
import * as recomendacionesIaService from './recomendaciones_ia.service';
import { AppError, conflict, forbidden, notFound } from '../utils/errors';

vi.mock('../repositories/evaluacion.repository', () => ({
  findById: vi.fn(),
  findItems: vi.fn(),
}));
vi.mock('../repositories/predio.repository', () => ({
  findById: vi.fn(),
}));
vi.mock('../repositories/recomendaciones_ia.repository', () => ({
  encontrarPorEvaluacion: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  eliminar: vi.fn(),
}));
vi.mock('./gemini.service', () => ({
  generarContenidoGemini: vi.fn(),
  construirSystemPrompt: vi.fn(() => 'system prompt'),
  construirPromptUsuario: vi.fn(() => 'user prompt'),
}));

const administrador: AuthUser = {
  id: 1,
  nombre: 'Admin',
  correo: 'admin@test.co',
  rol: 'ADMIN',
};

const evaluador: AuthUser = {
  id: 2,
  nombre: 'Evaluador',
  correo: 'evaluador@test.co',
  rol: 'EVALUADOR',
};

const responsable: AuthUser = {
  id: 3,
  nombre: 'Responsable',
  correo: 'responsable@test.co',
  rol: 'RESPONSABLE',
};

const otroResponsable: AuthUser = {
  id: 99,
  nombre: 'Otro Responsable',
  correo: 'otro@test.co',
  rol: 'RESPONSABLE',
};

const evaluacion: Evaluacion = {
  id: 1,
  predio_id: 10,
  evaluador_id: 2,
  fecha: '2026-01-15',
  estado: 'CERRADA',
  puntaje_total: 72.25,
  clasificacion: 'MEDIO',
  observaciones: null,
  cerrada_en: '2026-01-16 10:00:00',
  created_at: '2026-01-15 00:00:00',
  updated_at: '2026-01-15 00:00:00',
};

const evaluacionBorrador: Evaluacion = {
  ...evaluacion,
  estado: 'BORRADOR',
  puntaje_total: null,
  clasificacion: null,
};

const predioResponsable = {
  id: 10,
  responsable_id: 3,
  especie: 'OVINO',
  sistema_productivo: 'SEMI_INTENSIVO',
};

const predioOtroResponsable = {
  id: 10,
  responsable_id: 99,
  especie: 'OVINO',
  sistema_productivo: 'SEMI_INTENSIVO',
};

const items: ItemEvaluacion[] = [
  {
    id: 1,
    indicador_id: 1,
    numero: 1,
    nombre: 'Agua',
    descripcion: null,
    metodo_evaluacion: 'VISUAL',
    libertad_id: 1,
    libertad_nombre: 'L1',
    libertad_peso: 0.2,
    seccion: '7.1.1',
    criterio_100: 'Criterio 100',
    criterio_55: 'Criterio 55',
    criterio_20: null,
    criterio_0: 'Criterio 0',
    puntaje: 55,
    observacion: 'Falta agua limpia',
  },
  {
    id: 2,
    indicador_id: 2,
    numero: 2,
    nombre: 'Alimento',
    descripcion: null,
    metodo_evaluacion: 'VISUAL',
    libertad_id: 1,
    libertad_nombre: 'L1',
    libertad_peso: 0.2,
    seccion: '7.1.2',
    criterio_100: 'Criterio 100',
    criterio_55: null,
    criterio_20: null,
    criterio_0: 'Criterio 0',
    puntaje: 100,
    observacion: null,
  },
];

function configurarBase(evaluacionMock: Evaluacion, predioMock: any, recomendacionMock: any = null) {
  vi.mocked(evaluacionRepository.findById).mockResolvedValue(evaluacionMock);
  vi.mocked(predioRepository.findById).mockResolvedValue(predioMock);
  vi.mocked(recomendacionesIaRepository.encontrarPorEvaluacion).mockResolvedValue(recomendacionMock);
  vi.mocked(evaluacionRepository.findItems).mockResolvedValue(items);
}

function configurarCreacion(recomendacionCreada: any) {
  vi.mocked(recomendacionesIaRepository.crear).mockResolvedValue(recomendacionCreada);
  // Primero no existe (se genera), luego se encuentra la recién creada
  vi.mocked(recomendacionesIaRepository.encontrarPorEvaluacion)
    .mockResolvedValueOnce(null)
    .mockResolvedValue(recomendacionCreada);
}

describe('RecomendacionesIAService - permisos y caché', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve la recomendación guardada sin llamar a Gemini', async () => {
    const guardada = {
      evaluacion_id: 1,
      contenido: 'Recomendación previa',
      modelo: 'gemini-1.5-flash-latest',
      created_at: '2026-01-16',
      updated_at: '2026-01-16',
    };
    configurarBase(evaluacion, predioResponsable, guardada);

    const resultado = await recomendacionesIaService.obtenerOGenerarRecomendacion(
      administrador,
      1,
    );

    expect(resultado.recomendacion).toEqual(guardada);
    expect(geminiService.generarContenidoGemini).not.toHaveBeenCalled();
  });

  it('genera una nueva recomendación y la guarda cuando no existe', async () => {
    vi.mocked(geminiService.generarContenidoGemini).mockResolvedValue('Contenido generado por IA.');
    const creada = {
      evaluacion_id: 1,
      contenido: 'Contenido generado por IA.',
      modelo: 'gemini-1.5-flash-latest',
      created_at: '2026-01-16',
      updated_at: '2026-01-16',
    };
    configurarBase(evaluacion, predioResponsable, null);
    configurarCreacion(creada);

    const resultado = await recomendacionesIaService.obtenerOGenerarRecomendacion(
      evaluador,
      1,
    );

    expect(geminiService.generarContenidoGemini).toHaveBeenCalled();
    const prompt = (geminiService.construirPromptUsuario as any).mock.calls[0][0];
    expect(prompt.especie).toBe('OVINO');
    expect(prompt.sistemaProductivo).toBe('SEMI_INTENSIVO');
    expect(prompt.indicadoresBajos.length).toBe(1);
    expect(prompt.indicadoresBajos[0].numero).toBe(1);
    expect(prompt.indicadoresBajos[0].puntaje).toBe(55);
    expect(prompt.indicadoresBajos[0].observacion).toBe('Falta agua limpia');
    // No debe incluir datos personales del propietario
    const promptTexto = JSON.stringify(prompt);
    expect(promptTexto).not.toContain('torre');
    expect(promptTexto).not.toContain('@');
    expect(resultado.recomendacion.contenido).toBe('Contenido generado por IA.');
  });

  it('regenera cuando se solicita aunque ya exista', async () => {
    const guardada = {
      evaluacion_id: 1,
      contenido: 'Vieja',
      modelo: 'gemini-1.5-flash-latest',
      created_at: '2026-01-16',
      updated_at: '2026-01-16',
    };
    vi.mocked(geminiService.generarContenidoGemini).mockResolvedValue('Nueva.');
    vi.mocked(recomendacionesIaRepository.actualizar).mockResolvedValue({
      evaluacion_id: 1,
      contenido: 'Nueva.',
      modelo: 'gemini-1.5-flash-latest',
      created_at: '2026-01-16',
      updated_at: '2026-01-16',
    });
    configurarBase(evaluacion, predioResponsable, guardada);

    await recomendacionesIaService.obtenerOGenerarRecomendacion(
      administrador,
      1,
      true,
    );

    expect(recomendacionesIaRepository.actualizar).toHaveBeenCalled();
  });

  it('rechaza evaluación inexistente', async () => {
    vi.mocked(evaluacionRepository.findById).mockResolvedValue(null);
    await expect(
      recomendacionesIaService.obtenerOGenerarRecomendacion(administrador, 999),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rechaza acceso a evaluación de otro responsable', async () => {
    configurarBase(evaluacion, predioOtroResponsable, null);
    await expect(
      recomendacionesIaService.obtenerOGenerarRecomendacion(responsable, 1),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rechaza recomendación para borrador de responsable', async () => {
    configurarBase(evaluacionBorrador, predioResponsable, null);
    await expect(
      recomendacionesIaService.obtenerOGenerarRecomendacion(responsable, 1),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('permite acceso al evaluador dueño de la evaluación', async () => {
    vi.mocked(geminiService.generarContenidoGemini).mockResolvedValue('Contenido.');
    const creada = {
      evaluacion_id: 1,
      contenido: 'Contenido.',
      modelo: 'gemini-1.5-flash-latest',
      created_at: '2026-01-16',
      updated_at: '2026-01-16',
    };
    configurarBase(evaluacion, predioResponsable, null);
    configurarCreacion(creada);

    await expect(
      recomendacionesIaService.obtenerOGenerarRecomendacion(evaluador, 1),
    ).resolves.toBeDefined();
  });

  it('aplica límite de 5 solicitudes por hora por usuario (mock directo)', async () => {
    // El límite se aplica en verificarLimiteUsuario; aquí solo verificamos que
    // el servicio propaga el error 409 cuando el cliente de Gemini lo lanza.
    vi.mocked(geminiService.generarContenidoGemini).mockRejectedValue(
      new AppError(429, 'Se alcanzó la cuota de la API de Gemini. Intente más tarde.'),
    );
    vi.mocked(recomendacionesIaRepository.encontrarPorEvaluacion).mockResolvedValue(null);
    configurarBase(evaluacion, predioResponsable, null);

    await expect(
      recomendacionesIaService.obtenerOGenerarRecomendacion(administrador, 1),
    ).rejects.toMatchObject({ status: 429 });
  });

  it('lanza 503 cuando no hay API key de Gemini', async () => {
    // Forzar que generarContenidoGemini lance 503 simulando falta de clave
    vi.mocked(geminiService.generarContenidoGemini).mockRejectedValue(
      new AppError(503, 'Función de recomendaciones con IA no configurada.'),
    );
    configurarBase(evaluacion, predioResponsable, null);

    // Usar evaluador (id 2) para no compartir contador de rate limit con administrador
    await expect(
      recomendacionesIaService.obtenerOGenerarRecomendacion(evaluador, 1),
    ).rejects.toMatchObject({ status: 503 });
  });
});

describe('RecomendacionesIAService - prompt sin datos personales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no incluye correo ni ubicación en el prompt', async () => {
    vi.mocked(geminiService.generarContenidoGemini).mockResolvedValue('Contenido.');
    const creada = {
      evaluacion_id: 1,
      contenido: 'Contenido.',
      modelo: 'gemini-1.5-flash-latest',
      created_at: '2026-01-16',
      updated_at: '2026-01-16',
    };
    configurarBase(evaluacion, predioResponsable, null);
    configurarCreacion(creada);

    await recomendacionesIaService.obtenerOGenerarRecomendacion(administrador, 1);

    const prompt = (geminiService.construirPromptUsuario as any).mock.calls[0][0];
    const texto = JSON.stringify(prompt);
    expect(texto).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    // No debe incluir datos personales: municipio, dirección, nombre del propietario.
    expect(texto).not.toContain('Municipio');
    expect(texto).not.toContain('responsable');
    // El prompt debe incluir especie y sistema pero no datos personales
    expect(texto).toContain('OVINO');
    expect(texto).toContain('SEMI_INTENSIVO');
  });
});
