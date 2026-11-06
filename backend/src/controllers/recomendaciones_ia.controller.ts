import type { Request, Response } from 'express';
import * as recomendacionesIaService from '../services/recomendaciones_ia.service';
import { asyncHandler } from '../utils/asyncHandler';
import { idParamSchema } from '../validation/schemas';

export const obtenerOGenerar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const regenerar = req.query.regenerar === 'true';
  const resultado = await recomendacionesIaService.obtenerOGenerarRecomendacion(
    req.user!,
    id,
    regenerar,
  );
  res.json({
    recomendacion: resultado.recomendacion,
    modelo: resultado.modelo,
    regenerado: regenerar,
  });
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  await recomendacionesIaService.eliminarRecomendacion(id);
  res.status(204).send();
});
