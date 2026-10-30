import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool, withTransaction } from '../db/pool';
import type {
  Clasificacion,
  Especie,
  Predio,
  PredioConResumen,
  SistemaProductivo,
} from '../types/domain';

interface PredioRow extends RowDataPacket {
  id: number;
  nombre: string;
  municipio: string;
  direccion: string | null;
  especie: Especie;
  sistema_productivo: SistemaProductivo;
  es_ovino_de_lana: number;
  numero_animales: number;
  responsable_id: number | null;
  creado_por: number | null;
  created_at: string;
  updated_at: string;
  responsable_nombre?: string | null;
  ultima_clasificacion?: Clasificacion | null;
  ultima_fecha?: string | null;
  total_evaluaciones?: number;
  borradores?: number;
}

function mapPredio(row: PredioRow): Predio {
  return {
    id: row.id,
    nombre: row.nombre,
    municipio: row.municipio,
    direccion: row.direccion,
    especie: row.especie,
    sistema_productivo: row.sistema_productivo,
    es_ovino_de_lana: Boolean(row.es_ovino_de_lana),
    numero_animales: Number(row.numero_animales),
    responsable_id: row.responsable_id,
    creado_por: row.creado_por,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPredioConResumen(row: PredioRow): PredioConResumen {
  return {
    ...mapPredio(row),
    responsable_nombre: row.responsable_nombre ?? null,
    ultima_clasificacion: row.ultima_clasificacion ?? null,
    ultima_fecha: row.ultima_fecha ?? null,
    total_evaluaciones: Number(row.total_evaluaciones ?? 0),
    borradores: Number(row.borradores ?? 0),
  };
}

const SELECT_CON_RESUMEN = `
  SELECT p.*,
    u.nombre AS responsable_nombre,
    (
      SELECT e.clasificacion FROM evaluaciones e
      WHERE e.predio_id = p.id AND e.estado = 'CERRADA'
      ORDER BY e.fecha DESC, e.id DESC LIMIT 1
    ) AS ultima_clasificacion,
    (
      SELECT e.fecha FROM evaluaciones e
      WHERE e.predio_id = p.id AND e.estado = 'CERRADA'
      ORDER BY e.fecha DESC, e.id DESC LIMIT 1
    ) AS ultima_fecha,
    (
      SELECT COUNT(*) FROM evaluaciones e
      WHERE e.predio_id = p.id AND e.estado = 'CERRADA'
    ) AS total_evaluaciones,
    (
      SELECT COUNT(*) FROM evaluaciones e
      WHERE e.predio_id = p.id AND e.estado = 'BORRADOR'
    ) AS borradores
  FROM predios p
  LEFT JOIN usuarios u ON u.id = p.responsable_id
`;

export interface FiltrosPredios {
  search?: string;
  especie?: Especie;
  sistema?: SistemaProductivo;
  responsableId?: number;
  soloResponsableId?: number;
}

export async function findAll(filtros: FiltrosPredios = {}): Promise<PredioConResumen[]> {
  const condiciones: string[] = [];
  const parametros: Array<string | number | boolean | null> = [];

  if (filtros.soloResponsableId !== undefined) {
    condiciones.push('p.responsable_id = ?');
    parametros.push(filtros.soloResponsableId);
  }
  if (filtros.responsableId !== undefined) {
    condiciones.push('p.responsable_id = ?');
    parametros.push(filtros.responsableId);
  }
  if (filtros.especie) {
    condiciones.push('p.especie = ?');
    parametros.push(filtros.especie);
  }
  if (filtros.sistema) {
    condiciones.push('p.sistema_productivo = ?');
    parametros.push(filtros.sistema);
  }
  if (filtros.search) {
    condiciones.push('(p.nombre LIKE ? OR p.municipio LIKE ?)');
    const termino = `%${filtros.search}%`;
    parametros.push(termino, termino);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [rows] = await pool.execute<PredioRow[]>(
    `${SELECT_CON_RESUMEN} ${where} ORDER BY p.nombre ASC`,
    parametros,
  );
  return rows.map(mapPredioConResumen);
}

export async function findById(id: number): Promise<PredioConResumen | null> {
  const [rows] = await pool.execute<PredioRow[]>(
    `${SELECT_CON_RESUMEN} WHERE p.id = ? LIMIT 1`,
    [id],
  );
  return rows.length > 0 ? mapPredioConResumen(rows[0]) : null;
}

export async function findByIds(ids: number[]): Promise<Predio[]> {
  if (ids.length === 0) return [];
  const [rows] = await pool.query<PredioRow[]>(
    'SELECT * FROM predios WHERE id IN (?)',
    [ids],
  );
  return rows.map(mapPredio);
}

export interface NuevoPredio {
  nombre: string;
  municipio: string;
  direccion: string | null;
  especie: Especie;
  sistema_productivo: SistemaProductivo;
  es_ovino_de_lana: boolean;
  numero_animales: number;
  responsable_id: number | null;
  creado_por: number;
}

export async function create(data: NuevoPredio): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO predios
      (nombre, municipio, direccion, especie, sistema_productivo, es_ovino_de_lana, numero_animales, responsable_id, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.nombre,
      data.municipio,
      data.direccion,
      data.especie,
      data.sistema_productivo,
      data.es_ovino_de_lana ? 1 : 0,
      data.numero_animales,
      data.responsable_id,
      data.creado_por,
    ],
  );
  return result.insertId;
}

export type ActualizarPredio = Omit<NuevoPredio, 'creado_por'>;

export async function update(id: number, data: ActualizarPredio): Promise<void> {
  await pool.execute(
    `UPDATE predios SET
      nombre = ?, municipio = ?, direccion = ?, especie = ?, sistema_productivo = ?,
      es_ovino_de_lana = ?, numero_animales = ?, responsable_id = ?
     WHERE id = ?`,
    [
      data.nombre,
      data.municipio,
      data.direccion,
      data.especie,
      data.sistema_productivo,
      data.es_ovino_de_lana ? 1 : 0,
      data.numero_animales,
      data.responsable_id,
      id,
    ],
  );
}

export async function remove(id: number): Promise<void> {
  await pool.execute('DELETE FROM predios WHERE id = ?', [id]);
}

export async function countEvaluaciones(predioId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM evaluaciones WHERE predio_id = ?',
    [predioId],
  );
  return Number(rows[0].total);
}

/**
 * Asigna exactamente los predios indicados al responsable y libera los que
 * tenía asignados y ya no están en la lista.
 */
export async function reasignarPrediosAUsuario(
  usuarioId: number,
  predioIds: number[],
): Promise<void> {
  await withTransaction(async (connection) => {
    if (predioIds.length > 0) {
      await connection.query(
        'UPDATE predios SET responsable_id = ? WHERE id IN (?)',
        [usuarioId, predioIds],
      );
      await connection.query(
        'UPDATE predios SET responsable_id = NULL WHERE responsable_id = ? AND id NOT IN (?)',
        [usuarioId, predioIds],
      );
    } else {
      await connection.query('UPDATE predios SET responsable_id = NULL WHERE responsable_id = ?', [
        usuarioId,
      ]);
    }
  });
}
