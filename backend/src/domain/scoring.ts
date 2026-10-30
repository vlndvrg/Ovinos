import type {
  Clasificacion,
  Especie,
  Indicador,
  Libertad,
  Predio,
  Puntaje,
  ResumenEvaluacion,
  ResumenLibertad,
  SistemaProductivo,
} from '../types/domain';

export const PUNTAJES_VALIDOS = [0, 20, 55, 100] as const;

export function esPuntajeValido(valor: unknown): valor is Puntaje {
  return PUNTAJES_VALIDOS.includes(valor as Puntaje);
}

const CAMPO_APLICABILIDAD: Record<
  SistemaProductivo,
  'aplica_extensivo' | 'aplica_semi_intensivo' | 'aplica_intensivo' | 'aplica_familiar'
> = {
  EXTENSIVO: 'aplica_extensivo',
  SEMI_INTENSIVO: 'aplica_semi_intensivo',
  INTENSIVO: 'aplica_intensivo',
  FAMILIAR: 'aplica_familiar',
};

function esVerdadero(valor: boolean | number): boolean {
  return valor === true || valor === 1;
}

/**
 * Determina si un indicador aplica a un predio según:
 *  - sistema productivo,
 *  - especie (OVINO / CAPRINO),
 *  - condición de ovino de lana.
 */
export function indicadorAplicaA(
  indicador: Indicador,
  predio: Pick<Predio, 'especie' | 'sistema_productivo' | 'es_ovino_de_lana'>,
): boolean {
  const campo = CAMPO_APLICABILIDAD[predio.sistema_productivo];
  if (!esVerdadero(indicador[campo])) return false;

  if (indicador.solo_especie && indicador.solo_especie !== predio.especie) return false;

  if (esVerdadero(indicador.solo_ovino_lana)) {
    const esOvinoDeLana = predio.especie === 'OVINO' && esVerdadero(predio.es_ovino_de_lana);
    if (!esOvinoDeLana) return false;
  }

  return true;
}

/** Filtra y ordena por número los indicadores que aplican a un predio. */
export function filtrarIndicadoresAplicables<T extends Indicador>(
  indicadores: T[],
  predio: Pick<Predio, 'especie' | 'sistema_productivo' | 'es_ovino_de_lana'>,
): T[] {
  return indicadores
    .filter((indicador) => indicadorAplicaA(indicador, predio))
    .sort((a, b) => a.numero - b.numero);
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * PUNTAJE DE UNA LIBERTAD (función aislada y reemplazable).
 *
 * Regla actual: promedio simple de los puntajes de los indicadores aplicables
 * que ya fueron calificados. Si ningún indicador tiene puntaje, retorna null.
 *
 * Si en el futuro la metodología exige otra regla (por ejemplo, ponderar
 * indicadores o usar el peor puntaje), este es el único lugar que debe cambiar.
 */
export function calcularPuntajeLibertad(puntajes: Array<Puntaje | number | null>): number | null {
  const validos = puntajes.filter((p): p is number => typeof p === 'number');
  if (validos.length === 0) return null;
  const suma = validos.reduce((acumulado, puntaje) => acumulado + puntaje, 0);
  return redondear(suma / validos.length);
}

/**
 * PUNTAJE TOTAL: suma de (puntaje de cada libertad × peso de la libertad).
 * Los pesos se manejan como fracción (0.20 = 20 %). Las libertades sin puntaje
 * aportan 0; para la vista parcial use calcularPuntajeProyectado.
 */
export function calcularPuntajeTotal(
  entradas: Array<{ peso: number; puntaje: number | null }>,
): number {
  return redondear(
    entradas.reduce((total, entrada) => total + (entrada.puntaje ?? 0) * entrada.peso, 0),
  );
}

/**
 * Proyección para borradores: igual fórmula ponderada, pero renormalizada por
 * el peso de las libertades que ya tienen al menos un indicador calificado.
 * Cuando la evaluación está completa coincide con calcularPuntajeTotal.
 */
export function calcularPuntajeProyectado(
  entradas: Array<{ peso: number; puntaje: number | null }>,
): number | null {
  const conPuntaje = entradas.filter(
    (entrada): entrada is { peso: number; puntaje: number } => entrada.puntaje !== null,
  );
  const pesoCalificado = conPuntaje.reduce((total, entrada) => total + entrada.peso, 0);
  if (pesoCalificado === 0) return null;
  const ponderado = conPuntaje.reduce(
    (total, entrada) => total + entrada.puntaje * entrada.peso,
    0,
  );
  return redondear(ponderado / pesoCalificado);
}

/** Clasificación oficial EBA-ICA. */
export function clasificar(puntaje: number | null): Clasificacion | null {
  if (puntaje === null) return null;
  if (puntaje >= 90) return 'EXCELENTE BIENESTAR';
  if (puntaje >= 75) return 'ALTO';
  if (puntaje >= 50) return 'MEDIO';
  return 'BAJO';
}

export interface ItemParaResumen {
  libertad_id: number;
  puntaje: Puntaje | null;
}

/**
 * Construye el resumen de una evaluación (por libertad y total).
 * Para borradores el total es una proyección; al completar todos los
 * indicadores se usa la fórmula oficial de suma ponderada.
 */
export function calcularResumen(
  items: ItemParaResumen[],
  libertades: Libertad[],
): ResumenEvaluacion {
  const libertadesOrdenadas = [...libertades].sort((a, b) => a.id - b.id);

  const resumenLibertades: ResumenLibertad[] = libertadesOrdenadas.map((libertad) => {
    const itemsLibertad = items.filter((item) => item.libertad_id === libertad.id);
    const calificados = itemsLibertad.filter((item) => item.puntaje !== null).length;
    return {
      libertad_id: libertad.id,
      libertad_nombre: libertad.nombre,
      peso: libertad.peso,
      puntaje: calcularPuntajeLibertad(itemsLibertad.map((item) => item.puntaje)),
      calificados,
      total: itemsLibertad.length,
    };
  });

  const total = items.length;
  const calificados = items.filter((item) => item.puntaje !== null).length;
  const completo = total > 0 && calificados === total;

  const entradas = resumenLibertades.map((libertad) => ({
    peso: libertad.peso,
    puntaje: libertad.puntaje,
  }));

  const puntajeTotal = completo
    ? calcularPuntajeTotal(entradas)
    : calcularPuntajeProyectado(entradas);

  return {
    libertades: resumenLibertades,
    puntaje_total: puntajeTotal,
    clasificacion: clasificar(puntajeTotal),
    calificados,
    total,
    completo,
  };
}

/** Normaliza el valor booleano que llega de MySQL (0/1) para la API. */
export function normalizarBooleano(valor: boolean | number): boolean {
  return esVerdadero(valor);
}

export function esEspecie(valor: string): valor is Especie {
  return valor === 'OVINO' || valor === 'CAPRINO';
}
