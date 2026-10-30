import type { NextFunction, Request, Response } from 'express';
import type { ResultSetHeader } from 'mysql2';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

interface MysqlError {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos. Revise los campos e intente nuevamente.',
      details: error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensaje: issue.message,
      })),
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  const mysqlError = error as MysqlError;
  if (mysqlError?.code === 'ER_DUP_ENTRY') {
    res.status(409).json({
      error: 'Ya existe un registro con esos datos. Verifique el correo o el número del indicador.',
    });
    return;
  }

  if (mysqlError?.code === 'ER_ROW_IS_REFERENCED_2') {
    res.status(409).json({
      error: 'No se puede eliminar el registro porque tiene información asociada.',
    });
    return;
  }

  if (mysqlError?.code === 'ER_NO_REFERENCED_ROW_2') {
    res.status(400).json({ error: 'Uno de los registros relacionados no existe.' });
    return;
  }

  console.error('Error no controlado:', error);
  res.status(500).json({
    error: 'Ocurrió un error interno. Intente nuevamente o contacte al administrador.',
  });
}

export type InsertResult = ResultSetHeader;
