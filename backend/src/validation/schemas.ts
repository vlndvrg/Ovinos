import { z } from 'zod';

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD');

const textoOpcional = (max: number) =>
  z
    .string()
    .max(max, `Máximo ${max} caracteres`)
    .transform((valor) => valor.trim())
    .nullable()
    .optional();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Identificador inválido'),
});

export const idIndicadorParamSchema = z.object({
  id: z.coerce.number().int().positive('Identificador inválido'),
  indicadorId: z.coerce.number().int().positive('Indicador inválido'),
});

export const loginSchema = z.object({
  correo: z.string().trim().toLowerCase().email('Ingrese un correo válido'),
  password: z.string().min(1, 'Ingrese la contraseña'),
});

export const usuarioCreateSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio').max(120),
  correo: z.string().trim().toLowerCase().email('Correo inválido').max(160),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
  rol: z.enum(['ADMIN', 'EVALUADOR', 'RESPONSABLE']),
  activo: z.boolean().optional().default(true),
});

export const usuarioUpdateSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es obligatorio').max(120).optional(),
  correo: z.string().trim().toLowerCase().email('Correo inválido').max(160).optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100).optional(),
  rol: z.enum(['ADMIN', 'EVALUADOR', 'RESPONSABLE']).optional(),
  activo: z.boolean().optional(),
});

export const usuarioEstadoSchema = z.object({
  activo: z.boolean(),
});

export const asignarPrediosSchema = z.object({
  predioIds: z.array(z.number().int().positive()).max(500),
});

export const predioSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre del predio es obligatorio').max(150),
  municipio: z.string().trim().min(2, 'El municipio es obligatorio').max(120),
  direccion: textoOpcional(200),
  especie: z.enum(['OVINO', 'CAPRINO']),
  sistema_productivo: z.enum(['EXTENSIVO', 'SEMI_INTENSIVO', 'INTENSIVO', 'FAMILIAR']),
  es_ovino_de_lana: z.boolean().optional().default(false),
  numero_animales: z.coerce
    .number()
    .int('Debe ser un número entero')
    .positive('Debe ser mayor que cero')
    .max(10_000_000),
  responsable_id: z.number().int().positive().nullable().optional().default(null),
});

export const evaluacionCreateSchema = z.object({
  predio_id: z.number().int().positive('Seleccione un predio'),
  fecha: fechaISO.optional(),
  observaciones: textoOpcional(2000),
});

export const evaluacionUpdateSchema = z.object({
  fecha: fechaISO.optional(),
  observaciones: textoOpcional(2000),
});

export const puntajeSchema = z.object({
  puntaje: z.union([z.literal(0), z.literal(20), z.literal(55), z.literal(100)], {
    errorMap: () => ({ message: 'El puntaje debe ser 0, 20, 55 o 100' }),
  }),
  observacion: textoOpcional(1000),
});

export const criterioIndicadorSchema = z.object({
  tipo_predio: z.enum(['PRODUCTIVO', 'FAMILIAR']),
  seccion: z.string().trim().min(1, 'La sección de la norma es obligatoria').max(20),
  criterio_100: z.string().trim().min(1, 'El criterio 100 es obligatorio').max(3000),
  criterio_55: z.string().trim().min(1, 'El criterio 55 es obligatorio').max(3000),
  criterio_20: z.string().trim().min(1, 'El criterio 20 es obligatorio').max(3000),
  criterio_0: z.string().trim().min(1, 'El criterio 0 es obligatorio').max(3000),
});

export const indicadorUpdateSchema = z.object({
  descripcion: textoOpcional(3000),
  metodo_evaluacion: z.enum(['DOCUMENTAL', 'VISUAL', 'VISUAL_MUESTREO']).optional(),
  criterio_100: textoOpcional(3000),
  criterio_55: textoOpcional(3000),
  criterio_20: textoOpcional(3000),
  criterio_0: textoOpcional(3000),
  criterios: z.array(criterioIndicadorSchema).max(2).optional(),
});

export const prediosQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  especie: z.enum(['OVINO', 'CAPRINO']).optional(),
  sistema: z.enum(['EXTENSIVO', 'SEMI_INTENSIVO', 'INTENSIVO', 'FAMILIAR']).optional(),
  responsableId: z.coerce.number().int().positive().optional(),
});

export const evaluacionesQuerySchema = z.object({
  predioId: z.coerce.number().int().positive().optional(),
  estado: z.enum(['BORRADOR', 'CERRADA']).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const historialGlobalQuerySchema = z
  .object({
    predioId: z.coerce.number().int().positive().optional(),
    fechaDesde: fechaISO.optional(),
    fechaHasta: fechaISO.optional(),
    clasificacion: z
      .enum(['EXCELENTE BIENESTAR', 'ALTO', 'MEDIO', 'BAJO'])
      .optional(),
  })
  .refine(
    (filtros) =>
      !filtros.fechaDesde || !filtros.fechaHasta || filtros.fechaDesde <= filtros.fechaHasta,
    {
      message: 'La fecha desde no puede ser posterior a la fecha hasta.',
      path: ['fechaHasta'],
    },
  );

export const usuariosQuerySchema = z.object({
  rol: z.enum(['ADMIN', 'EVALUADOR', 'RESPONSABLE']).optional(),
  search: z.string().trim().max(120).optional(),
});
