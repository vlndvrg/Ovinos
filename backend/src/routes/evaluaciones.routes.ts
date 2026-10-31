import { Router } from 'express';
import * as evaluacionController from '../controllers/evaluacion.controller';
import { authenticate, requireRole } from '../middleware/auth';

export const evaluacionesRouter = Router();

evaluacionesRouter.use(authenticate);

evaluacionesRouter.get('/', evaluacionController.listar);
evaluacionesRouter.get(
  '/historial-global',
  requireRole('ADMIN'),
  evaluacionController.historialGlobal,
);
evaluacionesRouter.get('/:id', evaluacionController.detalle);
evaluacionesRouter.get('/:id/reporte.pdf', evaluacionController.reporte);

evaluacionesRouter.post(
  '/',
  requireRole('ADMIN', 'EVALUADOR'),
  evaluacionController.crear,
);
evaluacionesRouter.patch(
  '/:id',
  requireRole('ADMIN', 'EVALUADOR'),
  evaluacionController.actualizarCabecera,
);
evaluacionesRouter.patch(
  '/:id/indicadores/:indicadorId',
  requireRole('ADMIN', 'EVALUADOR'),
  evaluacionController.calificar,
);
evaluacionesRouter.post(
  '/:id/cerrar',
  requireRole('ADMIN', 'EVALUADOR'),
  evaluacionController.cerrar,
);
evaluacionesRouter.delete(
  '/:id',
  requireRole('ADMIN', 'EVALUADOR'),
  evaluacionController.eliminar,
);
