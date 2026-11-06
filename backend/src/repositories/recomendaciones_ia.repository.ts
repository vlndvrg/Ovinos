import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db/pool';
import type { RecomendacionIA } from '../types/domain';

interface RecomendacionRow extends RowDataPacket {
  evaluacion_id: number;
  contenido: string;
  modelo: string;
  created_at: string;
  updated_at: string;
}

function mapRecomendacion(row: RecomendacionRow): RecomendacionIA {
  return {
    evaluacion_id: row.evaluacion_id,
    contenido: row.contenido,
    modelo: row.modelo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function encontrarPorEvaluacion(
  evaluacionId: number,
): Promise<RecomendacionIA | null> {
  const [rows] = await pool.execute<RecomendacionRow[]>(
    `SELECT evaluacion_id, contenido, modelo, created_at, updated_at
     FROM recomendaciones_ia
     WHERE evaluacion_id = ? LIMIT 1`,
    [evaluacionId],
  );
  return rows.length > 0 ? mapRecomendacion(rows[0]) : null;
}

export async function crear(
  evaluacionId: number,
  contenido: string,
  modelo: string,
): Promise<RecomendacionIA> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO recomendaciones_ia (evaluacion_id, contenido, modelo)
     VALUES (?, ?, ?)`,
    [evaluacionId, contenido, modelo],
  );
  const [rows] = await pool.execute<RecomendacionRow[]>(
    `SELECT evaluacion_id, contenido, modelo, created_at, updated_at
     FROM recomendaciones_ia WHERE id = ? LIMIT 1`,
    [result.insertId],
  );
  return mapRecomendacion(rows[0]);
}

export async function actualizar(
  evaluacionId: number,
  contenido: string,
  modelo: string,
): Promise<RecomendacionIA> {
  await pool.execute(
    `UPDATE recomendaciones_ia
     SET contenido = ?, modelo = ?, updated_at = CURRENT_TIMESTAMP
     WHERE evaluacion_id = ?`,
    [contenido, modelo, evaluacionId],
  );
  const recomendacion = await encontrarPorEvaluacion(evaluacionId);
  if (!recomendacion) {
    throw new Error('No se pudo guardar la recomendación de IA.');
  }
  return recomendacion;
}

export async function eliminar(evaluacionId: number): Promise<void> {
  await pool.execute('DELETE FROM recomendaciones_ia WHERE evaluacion_id = ?', [
    evaluacionId,
  ]);
}
