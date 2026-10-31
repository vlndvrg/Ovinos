import type { z } from 'zod';
import {
  calcularPuntajeLibertad,
  calcularPuntajeTotal,
  calcularResumen,
  clasificar,
  filtrarIndicadoresAplicables,
} from '../domain/scoring';
import * as evaluacionRepository from '../repositories/evaluacion.repository';
import * as indicadorRepository from '../repositories/indicador.repository';
import * as libertadRepository from '../repositories/libertad.repository';
import * as predioRepository from '../repositories/predio.repository';
import * as usuarioRepository from '../repositories/usuario.repository';
import type {
  AuthUser,
  Evaluacion,
  EvaluacionDetalle,
  Libertad,
  PredioConResumen,
  ResumenEvaluacion,
} from '../types/domain';
import { conflict, forbidden, notFound } from '../utils/errors';
import {
  evaluacionCreateSchema,
  evaluacionUpdateSchema,
  evaluacionesQuerySchema,
  historialGlobalQuerySchema,
  puntajeSchema,
} from '../validation/schemas';

type CrearEvaluacionInput = z.infer<typeof evaluacionCreateSchema>;
type ActualizarEvaluacionInput = z.infer<typeof evaluacionUpdateSchema>;
type CalificarInput = z.infer<typeof puntajeSchema>;
type EvaluacionesQuery = z.infer<typeof evaluacionesQuerySchema>;
type HistorialGlobalQuery = z.infer<typeof historialGlobalQuerySchema>;

function fechaHoy(): string {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

interface EvaluacionConPredio {
  evaluacion: Evaluacion;
  predio: PredioConResumen;
}

async function obtenerConAcceso(id: number, user: AuthUser): Promise<EvaluacionConPredio> {
  const evaluacion = await evaluacionRepository.findById(id);
  if (!evaluacion) throw notFound('Evaluación no encontrada.');

  const predio = await predioRepository.findById(evaluacion.predio_id);
  if (!predio) throw notFound('Predio no encontrado.');

  const esAdmin = user.rol === 'ADMIN';
  const esEvaluadorPropietario =
    user.rol === 'EVALUADOR' && evaluacion.evaluador_id === user.id;
  const esResponsableDelPredio =
    user.rol === 'RESPONSABLE' &&
    predio.responsable_id === user.id &&
    evaluacion.estado === 'CERRADA';

  if (!esAdmin && !esEvaluadorPropietario && !esResponsableDelPredio) {
    throw forbidden('No tiene acceso a esta evaluación.');
  }

  return { evaluacion, predio };
}

function validarEditable(evaluacion: Evaluacion, user: AuthUser) {
  if (evaluacion.estado === 'CERRADA') {
    throw conflict('La evaluación está cerrada; sus puntajes ya no pueden modificarse.');
  }
  if (user.rol === 'RESPONSABLE') {
    throw forbidden('Los responsables de predio no pueden editar evaluaciones.');
  }
  if (user.rol === 'EVALUADOR' && evaluacion.evaluador_id !== user.id) {
    throw forbidden('Solo el evaluador que creó la evaluación puede editarla.');
  }
}

async function construirDetalle(
  evaluacion: Evaluacion,
  predio: PredioConResumen,
): Promise<EvaluacionDetalle> {
  const [items, libertades, evaluador] = await Promise.all([
    evaluacionRepository.findItems(evaluacion.id),
    libertadRepository.findAll(),
    usuarioRepository.findById(evaluacion.evaluador_id),
  ]);

  if (!evaluador) {
    throw notFound('No se encontró el evaluador asociado a la evaluación.');
  }

  return {
    ...evaluacion,
    predio,
    evaluador: { id: evaluador.id, nombre: evaluador.nombre, correo: evaluador.correo },
    items,
    resumen: calcularResumen(items, libertades),
  };
}

export async function listar(user: AuthUser, filtros: EvaluacionesQuery) {
  return evaluacionRepository.findAll(filtros, { rol: user.rol, userId: user.id });
}

export async function historialGlobal(user: AuthUser, filtros: HistorialGlobalQuery) {
  if (user.rol !== 'ADMIN') {
    throw forbidden('Solo el administrador puede consultar el historial global.');
  }

  return { evaluaciones: await evaluacionRepository.findHistorialGlobal(filtros) };
}

export async function detalle(user: AuthUser, id: number): Promise<EvaluacionDetalle> {
  const { evaluacion, predio } = await obtenerConAcceso(id, user);
  return construirDetalle(evaluacion, predio);
}

export async function crear(
  user: AuthUser,
  input: CrearEvaluacionInput,
): Promise<EvaluacionDetalle> {
  if (user.rol === 'RESPONSABLE') {
    throw forbidden('Los responsables de predio no pueden crear evaluaciones.');
  }

  const predio = await predioRepository.findById(input.predio_id);
  if (!predio) throw notFound('Predio no encontrado.');

  const indicadores = await indicadorRepository.findAll();
  const aplicables = filtrarIndicadoresAplicables(indicadores, predio);

  if (aplicables.length === 0) {
    throw conflict('No hay indicadores aplicables para la especie y el sistema productivo del predio.');
  }

  const id = await evaluacionRepository.createWithIndicators(
    {
      predioId: predio.id,
      evaluadorId: user.id,
      fecha: input.fecha ?? fechaHoy(),
      observaciones: input.observaciones ?? null,
    },
    aplicables.map((indicador) => indicador.id),
  );

  return detalle(user, id);
}

export async function actualizarCabecera(
  user: AuthUser,
  id: number,
  input: ActualizarEvaluacionInput,
): Promise<EvaluacionDetalle> {
  const { evaluacion } = await obtenerConAcceso(id, user);
  validarEditable(evaluacion, user);

  await evaluacionRepository.updateHeader(id, input);
  return detalle(user, id);
}

export interface RespuestaCalificacion {
  item: EvaluacionDetalle['items'][number];
  resumen: ResumenEvaluacion;
}

export async function calificar(
  user: AuthUser,
  id: number,
  indicadorId: number,
  input: CalificarInput,
): Promise<RespuestaCalificacion> {
  const { evaluacion } = await obtenerConAcceso(id, user);
  validarEditable(evaluacion, user);

  const itemActual = await evaluacionRepository.findItem(id, indicadorId);
  if (!itemActual) {
    throw notFound('El indicador no forma parte de los indicadores aplicables de esta evaluación.');
  }

  const observacion =
    input.observacion === undefined ? itemActual.observacion : input.observacion;

  const afectadas = await evaluacionRepository.updatePuntaje(
    id,
    indicadorId,
    input.puntaje,
    observacion,
  );
  if (afectadas === 0) {
    throw notFound('No se pudo guardar la calificación del indicador.');
  }

  const [items, libertades] = await Promise.all([
    evaluacionRepository.findItems(id),
    libertadRepository.findAll(),
  ]);

  const item = items.find((fila) => fila.indicador_id === indicadorId);
  if (!item) throw notFound('No se pudo recuperar el indicador calificado.');

  return { item, resumen: calcularResumen(items, libertades) };
}

function construirPuntajesPorLibertad(
  items: EvaluacionDetalle['items'],
  libertades: Libertad[],
): Array<{ libertad: Libertad; puntaje: number | null }> {
  return libertades.map((libertad) => ({
    libertad,
    puntaje: calcularPuntajeLibertad(
      items.filter((item) => item.libertad_id === libertad.id).map((item) => item.puntaje),
    ),
  }));
}

export async function cerrar(user: AuthUser, id: number): Promise<EvaluacionDetalle> {
  const { evaluacion } = await obtenerConAcceso(id, user);
  validarEditable(evaluacion, user);

  const [items, libertades] = await Promise.all([
    evaluacionRepository.findItems(id),
    libertadRepository.findAll(),
  ]);

  const faltantes = items.filter((item) => item.puntaje === null);
  if (faltantes.length > 0) {
    throw conflict(
      `No se puede cerrar la evaluación: faltan ${faltantes.length} indicador(es) por calificar.`,
      { indicadores: faltantes.map((item) => ({ numero: item.numero, nombre: item.nombre })) },
    );
  }

  const libertadesSinIndicadores = libertades.filter(
    (libertad) => !items.some((item) => item.libertad_id === libertad.id),
  );
  if (libertadesSinIndicadores.length > 0) {
    throw conflict(
      'El catálogo de indicadores está incompleto para una o más libertades. Contacte al administrador.',
    );
  }

  const puntajes = construirPuntajesPorLibertad(items, libertades);
  const puntajeTotal = calcularPuntajeTotal(
    puntajes.map(({ libertad, puntaje }) => ({ peso: libertad.peso, puntaje })),
  );
  const clasificacion = clasificar(puntajeTotal);
  if (!clasificacion) {
    throw conflict('No fue posible calcular la clasificación de la evaluación.');
  }

  const afectadas = await evaluacionRepository.cerrar(id, puntajeTotal, clasificacion);
  if (afectadas === 0) {
    throw conflict('La evaluación ya fue cerrada por otro proceso.');
  }

  return detalle(user, id);
}

export async function eliminar(user: AuthUser, id: number): Promise<void> {
  const { evaluacion } = await obtenerConAcceso(id, user);
  validarEditable(evaluacion, user);
  await evaluacionRepository.remove(id);
}

export async function datosReporte(user: AuthUser, id: number): Promise<EvaluacionDetalle> {
  const data = await detalle(user, id);
  if (data.estado !== 'CERRADA') {
    throw conflict('El reporte solo está disponible para evaluaciones cerradas.');
  }
  return data;
}
