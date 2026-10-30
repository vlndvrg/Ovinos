import { Router } from 'express';
import * as catalogoController from '../controllers/catalogo.controller';
import { authenticate, requireRole } from '../middleware/auth';

export const catalogoRouter = Router();

catalogoRouter.use(authenticate);

catalogoRouter.get('/libertades', catalogoController.listarLibertades);
catalogoRouter.get('/indicadores', catalogoController.listarIndicadores);
catalogoRouter.put(
  '/indicadores/:id',
  requireRole('ADMIN'),
  catalogoController.actualizarIndicador,
);
