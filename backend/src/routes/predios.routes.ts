import { Router } from 'express';
import * as predioController from '../controllers/predio.controller';
import { authenticate, requireRole } from '../middleware/auth';

export const prediosRouter = Router();

prediosRouter.use(authenticate);

prediosRouter.get('/', predioController.listar);
prediosRouter.get('/:id', predioController.obtener);
prediosRouter.get('/:id/historial', predioController.historial);

prediosRouter.post('/', requireRole('ADMIN', 'EVALUADOR'), predioController.crear);
prediosRouter.put('/:id', requireRole('ADMIN', 'EVALUADOR'), predioController.actualizar);
prediosRouter.delete('/:id', requireRole('ADMIN'), predioController.eliminar);
