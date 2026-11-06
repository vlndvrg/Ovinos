import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db/pool';
import type {
  CriterioIndicador,
  Especie,
  IndicadorConLibertad,
  MetodoEvaluacion,
  TipoPredioCriterio,
} from '../types/domain';

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

interface CriterioRow extends RowDataPacket {
  indicador_id: number;
  tipo_predio: TipoPredioCriterio;
  seccion: string;
  criterio_100: string;
  criterio_55: string;
  criterio_20: string;
  criterio_0: string;
}

function mapCriterio(row: CriterioRow): CriterioIndicador {
  return {
    indicador_id: row.indicador_id,
    tipo_predio: row.tipo_predio,
    seccion: row.seccion,
    criterio_100: row.criterio_100,
    criterio_55: row.criterio_55,
    criterio_20: row.criterio_20,
    criterio_0: row.criterio_0,
  };
}

function mapIndicador(row: IndicadorRow, criterios: CriterioIndicador[]): IndicadorConLibertad {
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
    criterios,
  };
}

function ordenarCriterios(criterios: CriterioIndicador[]): CriterioIndicador[] {
  const orden: Record<TipoPredioCriterio, number> = { PRODUCTIVO: 0, FAMILIAR: 1 };
  return [...criterios].sort((a, b) => orden[a.tipo_predio] - orden[b.tipo_predio]);
}

async function cargarCriterios(indicadorIds?: number[]): Promise<Map<number, CriterioIndicador[]>> {
  const parametros: number[] = [];
  const where =
    indicadorIds && indicadorIds.length > 0
      ? `WHERE indicador_id IN (${indicadorIds.map(() => '?').join(', ')})`
      : '';
  if (indicadorIds && indicadorIds.length > 0) parametros.push(...indicadorIds);

  const [rows] = await pool.execute<CriterioRow[]>(
    `SELECT indicador_id, tipo_predio, seccion, criterio_100, criterio_55, criterio_20, criterio_0
     FROM indicador_criterios ${where}`,
    parametros,
  );

  const porIndicador = new Map<number, CriterioIndicador[]>();
  for (const row of rows) {
    const lista = porIndicador.get(row.indicador_id) ?? [];
    lista.push(mapCriterio(row));
    porIndicador.set(row.indicador_id, lista);
  }
  for (const [id, lista] of porIndicador) {
    porIndicador.set(id, ordenarCriterios(lista));
  }
  return porIndicador;
}

const SELECT_INDICADOR = `
  SELECT i.*, l.nombre AS libertad_nombre, l.peso AS libertad_peso
  FROM indicadores i
  JOIN libertades l ON l.id = i.libertad_id
`;

export async function findAll(): Promise<IndicadorConLibertad[]> {
  const [rows, criterios] = await Promise.all([
    pool.execute<IndicadorRow[]>(`${SELECT_INDICADOR} ORDER BY i.numero ASC`),
    cargarCriterios(),
  ]);
  return rows[0].map((row) => mapIndicador(row, criterios.get(row.id) ?? []));
}

export async function findById(id: number): Promise<IndicadorConLibertad | null> {
  const [rows, criterios] = await Promise.all([
    pool.execute<IndicadorRow[]>(`${SELECT_INDICADOR} WHERE i.id = ? LIMIT 1`, [id]),
    cargarCriterios([id]),
  ]);
  return rows[0].length > 0 ? mapIndicador(rows[0][0], criterios.get(id) ?? []) : null;
}

export interface ActualizarIndicador {
  descripcion?: string | null;
  metodo_evaluacion?: MetodoEvaluacion;
  criterio_100?: string | null;
  criterio_55?: string | null;
  criterio_20?: string | null;
  criterio_0?: string | null;
}

export interface ActualizarCriterio {
  tipo_predio: TipoPredioCriterio;
  seccion?: string;
  criterio_100?: string;
  criterio_55?: string;
  criterio_20?: string;
  criterio_0?: string;
}

export async function upsertCriterios(
  indicadorId: number,
  criterios: ActualizarCriterio[],
): Promise<void> {
  for (const criterio of criterios) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM indicador_criterios WHERE indicador_id = ? AND tipo_predio = ? LIMIT 1`,
      [indicadorId, criterio.tipo_predio],
    );

    if (rows.length === 0) {
      await pool.execute<ResultSetHeader>(
        `INSERT INTO indicador_criterios
          (indicador_id, tipo_predio, seccion, criterio_100, criterio_55, criterio_20, criterio_0)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          indicadorId,
          criterio.tipo_predio,
          criterio.seccion ?? '',
          criterio.criterio_100 ?? '',
          criterio.criterio_55 ?? '',
          criterio.criterio_20 ?? '',
          criterio.criterio_0 ?? '',
        ],
      );
      continue;
    }

    const campos: string[] = [];
    const parametros: Array<string | number> = [];
    for (const [campo, valor] of Object.entries(criterio)) {
      if (campo === 'tipo_predio' || valor === undefined) continue;
      campos.push(`${campo} = ?`);
      parametros.push(valor as string);
    }
    if (campos.length === 0) continue;
    parametros.push(indicadorId, criterio.tipo_predio);
    await pool.execute(
      `UPDATE indicador_criterios SET ${campos.join(', ')}
       WHERE indicador_id = ? AND tipo_predio = ?`,
      parametros,
    );
  }
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
