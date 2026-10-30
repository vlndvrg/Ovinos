import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../db/pool';
import type { Rol, Usuario } from '../types/domain';

export interface UsuarioConHash extends Usuario {
  password_hash: string;
}

interface UsuarioRow extends RowDataPacket {
  id: number;
  nombre: string;
  correo: string;
  password_hash?: string;
  rol: Rol;
  activo: number;
  created_at: string;
  updated_at: string;
}

function mapUsuario(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    nombre: row.nombre,
    correo: row.correo,
    rol: row.rol,
    activo: Boolean(row.activo),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function findByCorreo(correo: string): Promise<UsuarioConHash | null> {
  const [rows] = await pool.execute<UsuarioRow[]>(
    'SELECT id, nombre, correo, password_hash, rol, activo, created_at, updated_at FROM usuarios WHERE correo = ? LIMIT 1',
    [correo],
  );
  if (rows.length === 0) return null;
  return { ...mapUsuario(rows[0]), password_hash: rows[0].password_hash ?? '' };
}

export async function findById(id: number): Promise<Usuario | null> {
  const [rows] = await pool.execute<UsuarioRow[]>(
    'SELECT id, nombre, correo, rol, activo, created_at, updated_at FROM usuarios WHERE id = ? LIMIT 1',
    [id],
  );
  return rows.length > 0 ? mapUsuario(rows[0]) : null;
}

export interface FiltrosUsuarios {
  rol?: Rol;
  search?: string;
}

export async function findAll(filtros: FiltrosUsuarios = {}): Promise<Usuario[]> {
  const condiciones: string[] = [];
  const parametros: Array<string | number | boolean | null> = [];

  if (filtros.rol) {
    condiciones.push('rol = ?');
    parametros.push(filtros.rol);
  }
  if (filtros.search) {
    condiciones.push('(nombre LIKE ? OR correo LIKE ?)');
    const termino = `%${filtros.search}%`;
    parametros.push(termino, termino);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [rows] = await pool.execute<UsuarioRow[]>(
    `SELECT id, nombre, correo, rol, activo, created_at, updated_at FROM usuarios ${where} ORDER BY nombre ASC`,
    parametros,
  );
  return rows.map(mapUsuario);
}

export async function findResponsables(): Promise<Array<Pick<Usuario, 'id' | 'nombre' | 'correo'>>> {
  const [rows] = await pool.execute<UsuarioRow[]>(
    "SELECT id, nombre, correo, rol, activo, created_at, updated_at FROM usuarios WHERE rol = 'RESPONSABLE' AND activo = 1 ORDER BY nombre ASC",
  );
  return rows.map((row) => ({ id: row.id, nombre: row.nombre, correo: row.correo }));
}

export interface NuevoUsuario {
  nombre: string;
  correo: string;
  password_hash: string;
  rol: Rol;
  activo: boolean;
}

export async function create(data: NuevoUsuario): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO usuarios (nombre, correo, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)',
    [data.nombre, data.correo, data.password_hash, data.rol, data.activo ? 1 : 0],
  );
  return result.insertId;
}

export interface ActualizarUsuario {
  nombre?: string;
  correo?: string;
  password_hash?: string;
  rol?: Rol;
  activo?: boolean;
}

export async function update(id: number, data: ActualizarUsuario): Promise<void> {
  const campos: string[] = [];
  const parametros: Array<string | number | boolean | null> = [];

  if (data.nombre !== undefined) {
    campos.push('nombre = ?');
    parametros.push(data.nombre);
  }
  if (data.correo !== undefined) {
    campos.push('correo = ?');
    parametros.push(data.correo);
  }
  if (data.password_hash !== undefined) {
    campos.push('password_hash = ?');
    parametros.push(data.password_hash);
  }
  if (data.rol !== undefined) {
    campos.push('rol = ?');
    parametros.push(data.rol);
  }
  if (data.activo !== undefined) {
    campos.push('activo = ?');
    parametros.push(data.activo ? 1 : 0);
  }

  if (campos.length === 0) return;
  parametros.push(id);
  await pool.execute(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, parametros);
}

export async function setActivo(id: number, activo: boolean): Promise<void> {
  await pool.execute('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}

export async function countAdminsActivos(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'ADMIN' AND activo = 1",
  );
  return Number(rows[0].total);
}
