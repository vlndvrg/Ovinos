import type { ItemEvaluacion, PlanMejoraItem, Puntaje } from '../types/domain';

function criterioSegunPuntaje(item: ItemEvaluacion, puntaje: Puntaje): string | null {
  switch (puntaje) {
    case 100:
      return item.criterio_100;
    case 55:
      return item.criterio_55;
    case 20:
      return item.criterio_20;
    case 0:
      return item.criterio_0;
  }
}

/**
 * Plan de mejora para todos los indicadores con puntaje menor o igual a 55.
 * Se ordena de menor a mayor puntaje y, a igual puntaje, por peso de libertad
 * (mayor peso primero), que es el orden en que conviene priorizar el trabajo.
 */
export function construirPlanMejora(items: ItemEvaluacion[]): PlanMejoraItem[] {
  return items
    .filter((item): item is ItemEvaluacion & { puntaje: Puntaje } => {
      return item.puntaje !== null && item.puntaje <= 55;
    })
    .map((item) => ({
      indicador_id: item.indicador_id,
      numero: item.numero,
      nombre: item.nombre,
      libertad_id: item.libertad_id,
      libertad_nombre: item.libertad_nombre,
      libertad_peso: item.libertad_peso,
      seccion: item.seccion,
      puntaje: item.puntaje,
      criterio_actual: criterioSegunPuntaje(item, item.puntaje),
      criterio_100: item.criterio_100,
      observacion: item.observacion,
    }))
    .sort((a, b) => {
      if (a.puntaje !== b.puntaje) return a.puntaje - b.puntaje;
      if (a.libertad_peso !== b.libertad_peso) return b.libertad_peso - a.libertad_peso;
      return a.numero - b.numero;
    });
}
