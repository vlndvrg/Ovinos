import { Router } from 'express';
import { authRouter } from './auth.routes';
import { catalogoRouter } from './catalogo.routes';
import { dashboardRouter } from './dashboard.routes';
import { evaluacionesRouter } from './evaluaciones.routes';
import { prediosRouter } from './predios.routes';
import { usuariosRouter } from './usuarios.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ estado: 'ok', servicio: 'EBA API' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/usuarios', usuariosRouter);
apiRouter.use('/predios', prediosRouter);
apiRouter.use('/evaluaciones', evaluacionesRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/', catalogoRouter);
