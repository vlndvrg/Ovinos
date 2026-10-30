import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';

export const obtener = asyncHandler(async (req: Request, res: Response) => {
  res.json(await dashboardService.obtener(req.user!));
});
