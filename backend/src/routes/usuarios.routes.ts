import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller';
import { authenticate, requireRole } from '../middleware/auth';

export const usuariosRouter = Router();

usuariosRouter.use(authenticate);

usuariosRouter.get(
  '/responsables',
  requireRole('ADMIN', 'EVALUADOR'),
  usuarioController.listarResponsables,
);

usuariosRouter.get('/', requireRole('ADMIN'), usuarioController.listar);
usuariosRouter.post('/', requireRole('ADMIN'), usuarioController.crear);
usuariosRouter.put('/:id', requireRole('ADMIN'), usuarioController.actualizar);
usuariosRouter.patch('/:id/estado', requireRole('ADMIN'), usuarioController.cambiarEstado);
usuariosRouter.patch('/:id/predios', requireRole('ADMIN'), usuarioController.asignarPredios);
