import * as evaluacionRepository from '../repositories/evaluacion.repository';
import * as predioRepository from '../repositories/predio.repository';
import * as usuarioRepository from '../repositories/usuario.repository';
import type { AuthUser, Clasificacion } from '../types/domain';

export type ClaveDistribucion = Clasificacion | 'SIN EVALUACIÓN';

export async function obtener(user: AuthUser) {
  const alcance = { rol: user.rol, userId: user.id };
  const filtrosPredios: predioRepository.FiltrosPredios =
    user.rol === 'RESPONSABLE' ? { soloResponsableId: user.id } : {};

  const [predios, evaluaciones, usuarios] = await Promise.all([
    predioRepository.findAll(filtrosPredios),
    evaluacionRepository.findAll({}, alcance),
    user.rol === 'ADMIN' ? usuarioRepository.findAll() : Promise.resolve([]),
  ]);

  const borradores = evaluaciones.filter((evaluacion) => evaluacion.estado === 'BORRADOR').length;
  const cerradas = evaluaciones.filter((evaluacion) => evaluacion.estado === 'CERRADA').length;

  const distribucion: Record<ClaveDistribucion, number> = {
    'EXCELENTE BIENESTAR': 0,
    ALTO: 0,
    MEDIO: 0,
    BAJO: 0,
    'SIN EVALUACIÓN': 0,
  };

  for (const predio of predios) {
    if (predio.ultima_clasificacion) {
      distribucion[predio.ultima_clasificacion] += 1;
    } else {
      distribucion['SIN EVALUACIÓN'] += 1;
    }
  }

  const metricas: Record<string, number> = {
    predios: predios.length,
    evaluaciones: evaluaciones.length,
    borradores,
    cerradas,
    predios_sin_responsable: predios.filter((predio) => predio.responsable_id === null).length,
    predios_evaluados: predios.filter((predio) => predio.ultima_clasificacion !== null).length,
  };

  if (user.rol === 'ADMIN') {
    metricas.usuarios = usuarios.length;
    metricas.usuarios_activos = usuarios.filter((usuario) => usuario.activo).length;
    metricas.evaluadores = usuarios.filter(
      (usuario) => usuario.rol === 'EVALUADOR' && usuario.activo,
    ).length;
    metricas.responsables = usuarios.filter(
      (usuario) => usuario.rol === 'RESPONSABLE' && usuario.activo,
    ).length;
  }

  return {
    rol: user.rol,
    metricas,
    distribucion,
    ultimas_evaluaciones: evaluaciones.slice(0, 8),
    predios: predios.slice(0, 6),
  };
}
