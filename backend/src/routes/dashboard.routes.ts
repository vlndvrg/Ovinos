import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/', dashboardController.obtener);
