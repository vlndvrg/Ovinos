import { describe, expect, it } from 'vitest';
import type { Indicador, Libertad, Predio } from '../types/domain';
import {
  calcularPuntajeLibertad,
  calcularPuntajeProyectado,
  calcularPuntajeTotal,
  calcularResumen,
  clasificar,
  filtrarIndicadoresAplicables,
  indicadorAplicaA,
} from './scoring';

function indicador(overrides: Partial<Indicador> & Pick<Indicador, 'numero'>): Indicador {
  return {
    id: overrides.numero,
    numero: overrides.numero,
    libertad_id: 1,
    nombre: `Indicador ${overrides.numero}`,
    descripcion: null,
    metodo_evaluacion: 'VISUAL',
    aplica_extensivo: true,
    aplica_semi_intensivo: true,
    aplica_intensivo: true,
    aplica_familiar: true,
    solo_especie: null,
    solo_ovino_lana: false,
    criterio_100: null,
    criterio_55: null,
    criterio_20: null,
    criterio_0: null,
    ...overrides,
  };
}

const indicadores: Indicador[] = [
  indicador({ numero: 1 }),
  indicador({ numero: 7, aplica_familiar: false }),
  indicador({ numero: 15, aplica_extensivo: false }),
  indicador({ numero: 16, aplica_extensivo: false }),
  indicador({ numero: 20, solo_especie: 'CAPRINO' }),
  indicador({ numero: 25, solo_especie: 'OVINO' }),
  indicador({ numero: 26, solo_especie: 'OVINO', solo_ovino_lana: true }),
  indicador({ numero: 30, aplica_familiar: false }),
  indicador({ numero: 31, aplica_familiar: false }),
  indicador({ numero: 34, aplica_familiar: false }),
  indicador({ numero: 35, aplica_familiar: false }),
  indicador({ numero: 36, aplica_extensivo: false, aplica_familiar: false }),
  indicador({ numero: 37, aplica_extensivo: false, aplica_semi_intensivo: false, aplica_intensivo: false }),
  indicador({ numero: 38, aplica_extensivo: false, aplica_semi_intensivo: false, aplica_intensivo: false }),
];

function predio(overrides: Partial<Predio>): Pick<Predio, 'especie' | 'sistema_productivo' | 'es_ovino_de_lana'> {
  return {
    especie: 'OVINO',
    sistema_productivo: 'SEMI_INTENSIVO',
    es_ovino_de_lana: true,
    ...overrides,
  };
}

describe('filtrado de indicadores aplicables', () => {
  it('aplica especie, sistema productivo y condición de ovino de lana', () => {
    const aplicables = filtrarIndicadoresAplicables(indicadores, predio({}));
    const numeros = aplicables.map((item) => item.numero);

    expect(numeros).toContain(7);
    expect(numeros).toContain(15);
    expect(numeros).toContain(25);
    expect(numeros).toContain(26);
    expect(numeros).not.toContain(20);
    expect(numeros).not.toContain(37);
    expect(numeros).not.toContain(38);
  });

  it('en caprino intensivo incluye topizado y excluye indicadores ovinos', () => {
    const aplicables = filtrarIndicadoresAplicables(
      indicadores,
      predio({ especie: 'CAPRINO', sistema_productivo: 'INTENSIVO', es_ovino_de_lana: false }),
    );
    const numeros = aplicables.map((item) => item.numero);

    expect(numeros).toContain(20);
    expect(numeros).toContain(30);
    expect(numeros).toContain(34);
    expect(numeros).not.toContain(25);
    expect(numeros).not.toContain(26);
    expect(numeros).not.toContain(37);
  });

  it('en familiar excluye instalaciones y almacenamiento, e incluye indicadores de manejo social', () => {
    const aplicables = filtrarIndicadoresAplicables(
      indicadores,
      predio({ sistema_productivo: 'FAMILIAR', es_ovino_de_lana: false }),
    );
    const numeros = aplicables.map((item) => item.numero);

    expect(numeros).toContain(37);
    expect(numeros).toContain(38);
    expect(numeros).not.toContain(7);
    expect(numeros).toContain(15);
    expect(numeros).toContain(16);
    expect(numeros).not.toContain(30);
    expect(numeros).not.toContain(34);
    expect(numeros).not.toContain(36);
    expect(numeros).not.toContain(26);
  });

  it('excluye el indicador de lana en ovinos sin lana', () => {
    expect(indicadorAplicaA(indicadores[6], predio({ es_ovino_de_lana: false }))).toBe(false);
    expect(indicadorAplicaA(indicadores[6], predio({ es_ovino_de_lana: true }))).toBe(true);
  });

  it('ordena por número y no muta el arreglo original', () => {
    const desordenados = [indicadores[3], indicadores[0], indicadores[2]];
    const resultado = filtrarIndicadoresAplicables(desordenados, predio({}));
    expect(resultado.map((item) => item.numero)).toEqual([1, 15, 16]);
    expect(desordenados.map((item) => item.numero)).toEqual([16, 1, 15]);
  });
});

describe('cálculo de puntajes', () => {
  it('promedia los indicadores calificados de una libertad', () => {
    expect(calcularPuntajeLibertad([100, 55, 20, 0])).toBe(43.75);
    expect(calcularPuntajeLibertad([100, null, 55])).toBe(77.5);
    expect(calcularPuntajeLibertad([])).toBeNull();
    expect(calcularPuntajeLibertad([null, null])).toBeNull();
  });

  it('suma ponderada del puntaje total', () => {
    const total = calcularPuntajeTotal([
      { peso: 0.2, puntaje: 90 },
      { peso: 0.2, puntaje: 80 },
      { peso: 0.35, puntaje: 70 },
      { peso: 0.1, puntaje: 60 },
      { peso: 0.15, puntaje: 50 },
    ]);
    expect(total).toBe(72);
  });

  it('proyecta el total de un borrador renormalizando por libertades calificadas', () => {
    const proyectado = calcularPuntajeProyectado([
      { peso: 0.2, puntaje: 100 },
      { peso: 0.2, puntaje: null },
      { peso: 0.35, puntaje: 50 },
      { peso: 0.1, puntaje: null },
      { peso: 0.15, puntaje: null },
    ]);
    // (100*0.2 + 50*0.35) / (0.2 + 0.35) = 68.18
    expect(proyectado).toBe(68.18);
    expect(calcularPuntajeProyectado([{ peso: 0.2, puntaje: null }])).toBeNull();
  });
});

describe('clasificación', () => {
  it.each([
    [100, 'EXCELENTE BIENESTAR'],
    [90, 'EXCELENTE BIENESTAR'],
    [89.99, 'ALTO'],
    [75, 'ALTO'],
    [74.99, 'MEDIO'],
    [50, 'MEDIO'],
    [49.99, 'BAJO'],
    [0, 'BAJO'],
  ])('clasifica %s como %s', (puntaje, esperado) => {
    expect(clasificar(puntaje)).toBe(esperado);
  });

  it('retorna null cuando no hay puntaje', () => {
    expect(clasificar(null)).toBeNull();
  });
});

describe('resumen de evaluación', () => {
  const libertades: Libertad[] = [
    { id: 1, nombre: 'L1', peso: 0.2 },
    { id: 2, nombre: 'L2', peso: 0.2 },
    { id: 3, nombre: 'L3', peso: 0.35 },
    { id: 4, nombre: 'L4', peso: 0.1 },
    { id: 5, nombre: 'L5', peso: 0.15 },
  ];

  it('marca completo y aplica la fórmula oficial cuando todo está calificado', () => {
    const items = [
      { libertad_id: 1, puntaje: 100 as const },
      { libertad_id: 2, puntaje: 80 as const },
      { libertad_id: 3, puntaje: 55 as const },
      { libertad_id: 4, puntaje: 20 as const },
      { libertad_id: 5, puntaje: 100 as const },
    ];
    const resumen = calcularResumen(items, libertades);

    expect(resumen.completo).toBe(true);
    expect(resumen.calificados).toBe(5);
    expect(resumen.total).toBe(5);
    expect(resumen.puntaje_total).toBe(72.25);
    expect(resumen.clasificacion).toBe('MEDIO');
    expect(resumen.libertades.map((libertad) => libertad.puntaje)).toEqual([
      100, 80, 55, 20, 100,
    ]);
  });

  it('proyecta el total cuando faltan indicadores', () => {
    const items = [
      { libertad_id: 1, puntaje: 100 as const },
      { libertad_id: 1, puntaje: null },
      { libertad_id: 2, puntaje: 50 as const },
      { libertad_id: 2, puntaje: null },
    ];
    const resumen = calcularResumen(items, libertades);

    expect(resumen.completo).toBe(false);
    expect(resumen.calificados).toBe(2);
    expect(resumen.total).toBe(4);
    expect(resumen.libertades[0]).toMatchObject({ calificados: 1, total: 2, puntaje: 100 });
    expect(resumen.libertades[2]).toMatchObject({ calificados: 0, total: 0, puntaje: null });
    expect(resumen.puntaje_total).toBe(75);
    expect(resumen.clasificacion).toBe('ALTO');
  });
});
