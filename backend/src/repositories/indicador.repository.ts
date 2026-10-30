import type { RowDataPacket } from 'mysql2';
import { pool } from '../db/pool';
import type { Especie, IndicadorConLibertad, MetodoEvaluacion } from '../types/domain';

interface IndicadorRow extends RowDataPacket {
  id: number;
  numero: number;
  libertad_id: number;
  nombre: string;
  descripcion: string | null;
  metodo_evaluacion: MetodoEvaluacion;
  aplica_extensivo: number;
  aplica_semi_intensivo: number;
  aplica_intensivo: number;
  aplica_familiar: number;
  solo_especie: Especie | null;
  solo_ovino_lana: number;
  criterio_100: string | null;
  criterio_55: string | null;
  criterio_20: string | null;
  criterio_0: string | null;
  libertad_nombre: string;
  libertad_peso: number;
}

function mapIndicador(row: IndicadorRow): IndicadorConLibertad {
  return {
    id: row.id,
    numero: Number(row.numero),
    libertad_id: row.libertad_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    metodo_evaluacion: row.metodo_evaluacion,
    aplica_extensivo: Boolean(row.aplica_extensivo),
    aplica_semi_intensivo: Boolean(row.aplica_semi_intensivo),
    aplica_intensivo: Boolean(row.aplica_intensivo),
    aplica_familiar: Boolean(row.aplica_familiar),
    solo_especie: row.solo_especie,
    solo_ovino_lana: Boolean(row.solo_ovino_lana),
    criterio_100: row.criterio_100,
    criterio_55: row.criterio_55,
    criterio_20: row.criterio_20,
    criterio_0: row.criterio_0,
    libertad_nombre: row.libertad_nombre,
    libertad_peso: Number(row.libertad_peso),
  };
}

const SELECT_INDICADOR = `
  SELECT i.*, l.nombre AS libertad_nombre, l.peso AS libertad_peso
  FROM indicadores i
  JOIN libertades l ON l.id = i.libertad_id
`;

export async function findAll(): Promise<IndicadorConLibertad[]> {
  const [rows] = await pool.execute<IndicadorRow[]>(
    `${SELECT_INDICADOR} ORDER BY i.numero ASC`,
  );
  return rows.map(mapIndicador);
}

export async function findById(id: number): Promise<IndicadorConLibertad | null> {
  const [rows] = await pool.execute<IndicadorRow[]>(
    `${SELECT_INDICADOR} WHERE i.id = ? LIMIT 1`,
    [id],
  );
  return rows.length > 0 ? mapIndicador(rows[0]) : null;
}

export interface ActualizarIndicador {
  descripcion?: string | null;
  metodo_evaluacion?: MetodoEvaluacion;
  criterio_100?: string | null;
  criterio_55?: string | null;
  criterio_20?: string | null;
  criterio_0?: string | null;
}

export async function update(id: number, data: ActualizarIndicador): Promise<void> {
  const campos: string[] = [];
  const parametros: Array<string | number | boolean | null> = [];

  for (const [campo, valor] of Object.entries(data)) {
    if (valor !== undefined) {
      campos.push(`${campo} = ?`);
      parametros.push(valor);
    }
  }

  if (campos.length === 0) return;
  parametros.push(id);
  await pool.execute(`UPDATE indicadores SET ${campos.join(', ')} WHERE id = ?`, parametros);
}
