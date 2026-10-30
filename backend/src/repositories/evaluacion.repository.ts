import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool, withTransaction } from '../db/pool';
import type {
  Clasificacion,
  Especie,
  EstadoEvaluacion,
  Evaluacion,
  EvaluacionListado,
  ItemEvaluacion,
  MetodoEvaluacion,
  Puntaje,
  Rol,
  SistemaProductivo,
} from '../types/domain';

interface EvaluacionRow extends RowDataPacket {
  id: number;
  predio_id: number;
  evaluador_id: number;
  fecha: string;
  estado: EstadoEvaluacion;
  puntaje_total: number | null;
  clasificacion: Clasificacion | null;
  observaciones: string | null;
  cerrada_en: string | null;
  created_at: string;
  updated_at: string;
  predio_nombre?: string;
  predio_especie?: Especie;
  predio_sistema_productivo?: SistemaProductivo;
  evaluador_nombre?: string;
}

function mapEvaluacion(row: EvaluacionRow): Evaluacion {
  return {
    id: row.id,
    predio_id: row.predio_id,
    evaluador_id: row.evaluador_id,
    fecha: row.fecha,
    estado: row.estado,
    puntaje_total: row.puntaje_total === null ? null : Number(row.puntaje_total),
    clasificacion: row.clasificacion,
    observaciones: row.observaciones,
    cerrada_en: row.cerrada_en,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface FiltrosEvaluaciones {
  predioId?: number;
  estado?: EstadoEvaluacion;
  search?: string;
  limit?: number;
}

export interface AlcanceEvaluaciones {
  rol: Rol;
  userId: number;
}

const SELECT_LISTADO = `
  SELECT e.*, p.nombre AS predio_nombre, p.especie AS predio_especie,
         p.sistema_productivo AS predio_sistema_productivo, u.nombre AS evaluador_nombre
  FROM evaluaciones e
  JOIN predios p ON p.id = e.predio_id
  JOIN usuarios u ON u.id = e.evaluador_id
`;

export async function findAll(
  filtros: FiltrosEvaluaciones,
  alcance: AlcanceEvaluaciones,
): Promise<EvaluacionListado[]> {
  const condiciones: string[] = [];
  const parametros: Array<string | number | boolean | null> = [];

  if (alcance.rol === 'EVALUADOR') {
    condiciones.push('e.evaluador_id = ?');
    parametros.push(alcance.userId);
  } else if (alcance.rol === 'RESPONSABLE') {
    condiciones.push("e.estado = 'CERRADA' AND p.responsable_id = ?");
    parametros.push(alcance.userId);
  }

  if (filtros.predioId !== undefined) {
    condiciones.push('e.predio_id = ?');
    parametros.push(filtros.predioId);
  }
  if (filtros.estado) {
    condiciones.push('e.estado = ?');
    parametros.push(filtros.estado);
  }
  if (filtros.search) {
    condiciones.push('(p.nombre LIKE ? OR p.municipio LIKE ?)');
    const termino = `%${filtros.search}%`;
    parametros.push(termino, termino);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const limite = filtros.limit ? `LIMIT ${Math.max(1, Math.floor(filtros.limit))}` : '';

  const [rows] = await pool.execute<EvaluacionRow[]>(
    `${SELECT_LISTADO} ${where} ORDER BY e.fecha DESC, e.id DESC ${limite}`,
    parametros,
  );

  return rows.map((row) => ({
    ...mapEvaluacion(row),
    predio_nombre: row.predio_nombre ?? '',
    predio_especie: row.predio_especie as Especie,
    predio_sistema_productivo: row.predio_sistema_productivo as SistemaProductivo,
    evaluador_nombre: row.evaluador_nombre ?? '',
  }));
}

export async function findById(id: number): Promise<Evaluacion | null> {
  const [rows] = await pool.execute<EvaluacionRow[]>(
    'SELECT * FROM evaluaciones WHERE id = ? LIMIT 1',
    [id],
  );
  return rows.length > 0 ? mapEvaluacion(rows[0]) : null;
}

interface ItemRow extends RowDataPacket {
  id: number;
  indicador_id: number;
  numero: number;
  nombre: string;
  descripcion: string | null;
  metodo_evaluacion: MetodoEvaluacion;
  libertad_id: number;
  libertad_nombre: string;
  libertad_peso: number;
  criterio_100: string | null;
  criterio_55: string | null;
  criterio_20: string | null;
  criterio_0: string | null;
  puntaje: Puntaje | null;
  observacion: string | null;
}

const SELECT_ITEM = `
  SELECT ei.id, ei.indicador_id, ei.puntaje, ei.observacion,
         i.numero, i.nombre, i.descripcion, i.metodo_evaluacion,
         i.libertad_id, l.nombre AS libertad_nombre, l.peso AS libertad_peso,
         i.criterio_100, i.criterio_55, i.criterio_20, i.criterio_0
  FROM evaluacion_indicadores ei
  JOIN indicadores i ON i.id = ei.indicador_id
  JOIN libertades l ON l.id = i.libertad_id
`;

function mapItem(row: ItemRow): ItemEvaluacion {
  return {
    id: row.id,
    indicador_id: row.indicador_id,
    numero: Number(row.numero),
    nombre: row.nombre,
    descripcion: row.descripcion,
    metodo_evaluacion: row.metodo_evaluacion,
    libertad_id: row.libertad_id,
    libertad_nombre: row.libertad_nombre,
    libertad_peso: Number(row.libertad_peso),
    criterio_100: row.criterio_100,
    criterio_55: row.criterio_55,
    criterio_20: row.criterio_20,
    criterio_0: row.criterio_0,
    puntaje: row.puntaje === null ? null : (Number(row.puntaje) as Puntaje),
    observacion: row.observacion,
  };
}

export async function findItems(evaluacionId: number): Promise<ItemEvaluacion[]> {
  const [rows] = await pool.execute<ItemRow[]>(
    `${SELECT_ITEM} WHERE ei.evaluacion_id = ? ORDER BY i.numero ASC`,
    [evaluacionId],
  );
  return rows.map(mapItem);
}

export async function findItem(
  evaluacionId: number,
  indicadorId: number,
): Promise<ItemEvaluacion | null> {
  const [rows] = await pool.execute<ItemRow[]>(
    `${SELECT_ITEM} WHERE ei.evaluacion_id = ? AND ei.indicador_id = ? LIMIT 1`,
    [evaluacionId, indicadorId],
  );
  return rows.length > 0 ? mapItem(rows[0]) : null;
}

export async function createWithIndicators(
  data: {
    predioId: number;
    evaluadorId: number;
    fecha: string;
    observaciones: string | null;
  },
  indicadorIds: number[],
): Promise<number> {
  return withTransaction(async (connection) => {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO evaluaciones (predio_id, evaluador_id, fecha, estado, observaciones)
       VALUES (?, ?, ?, 'BORRADOR', ?)`,
      [data.predioId, data.evaluadorId, data.fecha, data.observaciones],
    );
    const evaluacionId = result.insertId;

    const valores = indicadorIds.map((indicadorId) => [evaluacionId, indicadorId]);
    await connection.query(
      'INSERT INTO evaluacion_indicadores (evaluacion_id, indicador_id) VALUES ?',
      [valores],
    );

    return evaluacionId;
  });
}

export async function updatePuntaje(
  evaluacionId: number,
  indicadorId: number,
  puntaje: Puntaje,
  observacion: string | null,
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE evaluacion_indicadores SET puntaje = ?, observacion = ?
     WHERE evaluacion_id = ? AND indicador_id = ?`,
    [puntaje, observacion, evaluacionId, indicadorId],
  );
  return result.affectedRows;
}

export async function updateHeader(
  id: number,
  data: { fecha?: string; observaciones?: string | null },
): Promise<void> {
  const campos: string[] = [];
  const parametros: Array<string | number | boolean | null> = [];

  if (data.fecha !== undefined) {
    campos.push('fecha = ?');
    parametros.push(data.fecha);
  }
  if (data.observaciones !== undefined) {
    campos.push('observaciones = ?');
    parametros.push(data.observaciones);
  }
  if (campos.length === 0) return;

  parametros.push(id);
  await pool.execute(`UPDATE evaluaciones SET ${campos.join(', ')} WHERE id = ?`, parametros);
}

export async function cerrar(
  id: number,
  puntajeTotal: number,
  clasificacion: Clasificacion,
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE evaluaciones
     SET estado = 'CERRADA', puntaje_total = ?, clasificacion = ?, cerrada_en = NOW()
     WHERE id = ? AND estado = 'BORRADOR'`,
    [puntajeTotal, clasificacion, id],
  );
  return result.affectedRows;
}

export async function remove(id: number): Promise<void> {
  await pool.execute('DELETE FROM evaluaciones WHERE id = ?', [id]);
}

interface HistorialRow extends RowDataPacket {
  id: number;
  fecha: string;
  puntaje_total: number | null;
  clasificacion: Clasificacion | null;
  libertad_id: number;
  libertad_nombre: string;
  libertad_peso: number;
  promedio: number;
}

export interface HistorialLibertad {
  libertad_id: number;
  libertad_nombre: string;
  peso: number;
  puntaje: number;
}

export interface HistorialEvaluacion {
  id: number;
  fecha: string;
  puntaje_total: number | null;
  clasificacion: Clasificacion | null;
  libertades: HistorialLibertad[];
}

export async function findHistorial(predioId: number): Promise<HistorialEvaluacion[]> {
  const [rows] = await pool.execute<HistorialRow[]>(
    `SELECT e.id, e.fecha, e.puntaje_total, e.clasificacion,
            l.id AS libertad_id, l.nombre AS libertad_nombre, l.peso AS libertad_peso,
            AVG(ei.puntaje) AS promedio
     FROM evaluaciones e
     JOIN evaluacion_indicadores ei ON ei.evaluacion_id = e.id AND ei.puntaje IS NOT NULL
     JOIN indicadores i ON i.id = ei.indicador_id
     JOIN libertades l ON l.id = i.libertad_id
     WHERE e.predio_id = ? AND e.estado = 'CERRADA'
     GROUP BY e.id, e.fecha, e.puntaje_total, e.clasificacion, l.id, l.nombre, l.peso
     ORDER BY e.fecha ASC, e.id ASC`,
    [predioId],
  );

  const porEvaluacion = new Map<number, HistorialEvaluacion>();
  for (const row of rows) {
    let evaluacion = porEvaluacion.get(row.id);
    if (!evaluacion) {
      evaluacion = {
        id: row.id,
        fecha: row.fecha,
        puntaje_total: row.puntaje_total === null ? null : Number(row.puntaje_total),
        clasificacion: row.clasificacion,
        libertades: [],
      };
      porEvaluacion.set(row.id, evaluacion);
    }
    evaluacion.libertades.push({
      libertad_id: row.libertad_id,
      libertad_nombre: row.libertad_nombre,
      peso: Number(row.libertad_peso),
      puntaje: Math.round(Number(row.promedio) * 100) / 100,
    });
  }

  return Array.from(porEvaluacion.values());
}
