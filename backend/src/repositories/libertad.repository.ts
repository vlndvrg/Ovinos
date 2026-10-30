import type { RowDataPacket } from 'mysql2';
import { pool } from '../db/pool';
import type { Libertad } from '../types/domain';

interface LibertadRow extends RowDataPacket {
  id: number;
  nombre: string;
  peso: number;
}

export async function findAll(): Promise<Libertad[]> {
  const [rows] = await pool.execute<LibertadRow[]>(
    'SELECT id, nombre, peso FROM libertades ORDER BY id ASC',
  );
  return rows.map((row) => ({ id: row.id, nombre: row.nombre, peso: Number(row.peso) }));
}
