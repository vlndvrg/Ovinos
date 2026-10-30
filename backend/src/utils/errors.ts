export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, message, details);
export const unauthorized = (message = 'Debe iniciar sesión.') => new AppError(401, message);
export const forbidden = (message = 'No tiene permisos para realizar esta acción.') => new AppError(403, message);
export const notFound = (message = 'Recurso no encontrado.') => new AppError(404, message);
export const conflict = (message: string, details?: unknown) => new AppError(409, message, details);
