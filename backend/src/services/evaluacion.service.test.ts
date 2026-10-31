import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AuthUser,
  Evaluacion,
  ItemEvaluacion,
  Libertad,
  PredioConResumen,
  Puntaje,
} from '../types/domain';
import * as evaluacionRepository from '../repositories/evaluacion.repository';
import type { HistorialGlobalEvaluacion } from '../repositories/evaluacion.repository';
import * as indicadorRepository from '../repositories/indicador.repository';
import * as libertadRepository from '../repositories/libertad.repository';
import * as predioRepository from '../repositories/predio.repository';
import * as usuarioRepository from '../repositories/usuario.repository';
import * as evaluacionService from './evaluacion.service';

vi.mock('../repositories/evaluacion.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findItems: vi.fn(),
  findItem: vi.fn(),
  createWithIndicators: vi.fn(),
  updatePuntaje: vi.fn(),
  updateHeader: vi.fn(),
  cerrar: vi.fn(),
  remove: vi.fn(),
  findHistorial: vi.fn(),
  findHistorialGlobal: vi.fn(),
}));

vi.mock('../repositories/predio.repository', () => ({
  findById: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  countEvaluaciones: vi.fn(),
  findByIds: vi.fn(),
  reasignarPrediosAUsuario: vi.fn(),
}));

vi.mock('../repositories/indicador.repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../repositories/libertad.repository', () => ({
  findAll: vi.fn(),
}));

vi.mock('../repositories/usuario.repository', () => ({
  findById: vi.fn(),
  findByCorreo: vi.fn(),
  findAll: vi.fn(),
  findResponsables: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setActivo: vi.fn(),
  countAdminsActivos: vi.fn(),
}));

const administrador: AuthUser = {
  id: 1,
  nombre: 'Administrador de prueba',
  correo: 'admin@test.co',
  rol: 'ADMIN',
};

const evaluador: AuthUser = {
  id: 2,
  nombre: 'Evaluador de prueba',
  correo: 'evaluador@test.co',
  rol: 'EVALUADOR',
};

const responsable: AuthUser = {
  id: 3,
  nombre: 'Responsable de prueba',
  correo: 'responsable@test.co',
  rol: 'RESPONSABLE',
};

const predio: PredioConResumen = {
  id: 10,
  nombre: 'Predio de prueba',
  municipio: 'Municipio',
  direccion: null,
  especie: 'OVINO',
  sistema_productivo: 'SEMI_INTENSIVO',
  es_ovino_de_lana: true,
  numero_animales: 50,
  responsable_id: 3,
  creado_por: 2,
  created_at: '2026-01-01 00:00:00',
  updated_at: '2026-01-01 00:00:00',
  responsable_nombre: 'Responsable de prueba',
  ultima_clasificacion: null,
  ultima_fecha: null,
  total_evaluaciones: 0,
  borradores: 1,
};

const evaluacion: Evaluacion = {
  id: 1,
  predio_id: 10,
  evaluador_id: 2,
  fecha: '2026-01-15',
  estado: 'BORRADOR',
  puntaje_total: null,
  clasificacion: null,
  observaciones: null,
  cerrada_en: null,
  created_at: '2026-01-15 00:00:00',
  updated_at: '2026-01-15 00:00:00',
};

const libertades: Libertad[] = [
  { id: 1, nombre: 'L1', peso: 0.2 },
  { id: 2, nombre: 'L2', peso: 0.2 },
  { id: 3, nombre: 'L3', peso: 0.35 },
  { id: 4, nombre: 'L4', peso: 0.1 },
  { id: 5, nombre: 'L5', peso: 0.15 },
];

function crearItems(puntajes: Array<Puntaje | null>): ItemEvaluacion[] {
  return puntajes.map((puntaje, indice) => ({
    id: indice + 1,
    indicador_id: 100 + indice,
    numero: indice + 1,
    nombre: `Indicador ${indice + 1}`,
    descripcion: null,
    metodo_evaluacion: 'VISUAL',
    libertad_id: indice + 1,
    libertad_nombre: `L${indice + 1}`,
    libertad_peso: libertades[indice].peso,
    criterio_100: null,
    criterio_55: null,
    criterio_20: null,
    criterio_0: null,
    puntaje,
    observacion: null,
  }));
}

function configurarBase(items: ItemEvaluacion[]) {
  vi.mocked(evaluacionRepository.findById).mockResolvedValue(evaluacion);
  vi.mocked(evaluacionRepository.findItems).mockResolvedValue(items);
  vi.mocked(predioRepository.findById).mockResolvedValue(predio);
  vi.mocked(libertadRepository.findAll).mockResolvedValue(libertades);
  vi.mocked(usuarioRepository.findById).mockResolvedValue({
    id: 2,
    nombre: evaluador.nombre,
    correo: evaluador.correo,
    rol: 'EVALUADOR',
    activo: true,
    created_at: '',
    updated_at: '',
  });
}

describe('EvaluacionService - cierre de evaluación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calcula y congela puntaje y clasificación cuando todo está calificado', async () => {
    const items = crearItems([100, 80, 55, 20, 100]);
    configurarBase(items);
    vi.mocked(evaluacionRepository.cerrar).mockResolvedValue(1);

    await evaluacionService.cerrar(evaluador, 1);

    expect(evaluacionRepository.cerrar).toHaveBeenCalledWith(1, 72.25, 'MEDIO');
  });

  it('rechaza el cierre si falta algún indicador aplicable', async () => {
    const items = crearItems([100, 80, 55, 20, null]);
    configurarBase(items);

    await expect(evaluacionService.cerrar(evaluador, 1)).rejects.toMatchObject({
      status: 409,
    });
    expect(evaluacionRepository.cerrar).not.toHaveBeenCalled();
  });

  it('rechaza modificar una evaluación ya cerrada', async () => {
    configurarBase(crearItems([100, 100, 100, 100, 100]));
    vi.mocked(evaluacionRepository.findById).mockResolvedValue({
      ...evaluacion,
      estado: 'CERRADA',
      puntaje_total: 100,
      clasificacion: 'EXCELENTE BIENESTAR',
    });

    await expect(evaluacionService.cerrar(evaluador, 1)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('impide que otro evaluador cierre una evaluación ajena', async () => {
    configurarBase(crearItems([100, 100, 100, 100, 100]));
    const otroEvaluador: AuthUser = { ...evaluador, id: 99 };

    await expect(evaluacionService.cerrar(otroEvaluador, 1)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('impide que el responsable acceda a un borrador', async () => {
    configurarBase(crearItems([100, 100, 100, 100, 100]));

    await expect(evaluacionService.detalle(responsable, 1)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('EvaluacionService - calificación por indicador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guarda el puntaje y devuelve el resumen actualizado', async () => {
    const items = crearItems([null, 80, 55, 20, 100]);
    configurarBase(items);
    vi.mocked(evaluacionRepository.findItem).mockResolvedValue(items[0]);
    vi.mocked(evaluacionRepository.updatePuntaje).mockResolvedValue(1);
    vi.mocked(evaluacionRepository.findItems).mockResolvedValue(crearItems([100, 80, 55, 20, 100]));

    const resultado = await evaluacionService.calificar(evaluador, 1, items[0].indicador_id, {
      puntaje: 100,
    });

    expect(evaluacionRepository.updatePuntaje).toHaveBeenCalledWith(1, items[0].indicador_id, 100, null);
    expect(resultado.item.puntaje).toBe(100);
    expect(resultado.resumen.puntaje_total).toBe(72.25);
  });

  it('conserva la observación previa cuando solo se actualiza el puntaje', async () => {
    const items = crearItems([null, 80, 55, 20, 100]);
    items[0].observacion = 'Observación previa';
    configurarBase(items);
    vi.mocked(evaluacionRepository.findItem).mockResolvedValue(items[0]);
    vi.mocked(evaluacionRepository.updatePuntaje).mockResolvedValue(1);

    await evaluacionService.calificar(evaluador, 1, items[0].indicador_id, { puntaje: 55 });

    expect(evaluacionRepository.updatePuntaje).toHaveBeenCalledWith(
      1,
      items[0].indicador_id,
      55,
      'Observación previa',
    );
  });

  it('rechaza indicadores que no aplican a la evaluación', async () => {
    configurarBase(crearItems([null, 80, 55, 20, 100]));
    vi.mocked(evaluacionRepository.findItem).mockResolvedValue(null);

    await expect(
      evaluacionService.calificar(evaluador, 1, 999, { puntaje: 100 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('EvaluacionService - creación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea la evaluación solo con indicadores aplicables al predio', async () => {
    const indicadores = [
      {
        id: 1,
        numero: 1,
        libertad_id: 1,
        nombre: 'Agua',
        descripcion: null,
        metodo_evaluacion: 'VISUAL' as const,
        aplica_extensivo: true,
        aplica_semi_intensivo: true,
        aplica_intensivo: true,
        aplica_familiar: true,
        solo_especie: null,
        solo_ovino_lana: false,
        criterio_100: null,
        criterio_55: null,
        criterio_20: null,
        criterio_0: null,
        libertad_nombre: 'L1',
        libertad_peso: 0.2,
      },
      {
        id: 2,
        numero: 20,
        libertad_id: 3,
        nombre: 'Topizado',
        descripcion: null,
        metodo_evaluacion: 'VISUAL_MUESTREO' as const,
        aplica_extensivo: true,
        aplica_semi_intensivo: true,
        aplica_intensivo: true,
        aplica_familiar: true,
        solo_especie: 'CAPRINO' as const,
        solo_ovino_lana: false,
        criterio_100: null,
        criterio_55: null,
        criterio_20: null,
        criterio_0: null,
        libertad_nombre: 'L3',
        libertad_peso: 0.35,
      },
    ];

    vi.mocked(predioRepository.findById).mockResolvedValue(predio);
    vi.mocked(indicadorRepository.findAll).mockResolvedValue(indicadores);
    vi.mocked(evaluacionRepository.createWithIndicators).mockResolvedValue(1);
    configurarBase(crearItems([null, null, null, null, null]));

    await evaluacionService.crear(evaluador, { predio_id: 10 });

    expect(evaluacionRepository.createWithIndicators).toHaveBeenCalledWith(
      expect.objectContaining({ predioId: 10, evaluadorId: 2 }),
      [1],
    );
  });

  it('rechaza crear una evaluación sin indicadores aplicables', async () => {
    vi.mocked(predioRepository.findById).mockResolvedValue(predio);
    vi.mocked(indicadorRepository.findAll).mockResolvedValue([]);

    await expect(
      evaluacionService.crear(evaluador, { predio_id: 10 }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('EvaluacionService - historial global', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve las evaluaciones cerradas filtradas al administrador', async () => {
    const historial: HistorialGlobalEvaluacion[] = [
      {
        id: 1,
        fecha: '2026-01-15',
        puntaje_total: 82.5,
        clasificacion: 'ALTO',
        libertades: [
          {
            libertad_id: 1,
            libertad_nombre: 'L1',
            peso: 0.2,
            puntaje: 80,
          },
        ],
        predio_id: 10,
        predio_nombre: 'Predio de prueba',
        predio_municipio: 'Municipio',
        predio_especie: 'OVINO',
        predio_sistema_productivo: 'SEMI_INTENSIVO',
        evaluador_id: 2,
        evaluador_nombre: 'Evaluador de prueba',
        cerrada_en: '2026-01-16 10:00:00',
      },
    ];
    const filtros = {
      predioId: 10,
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
      clasificacion: 'ALTO' as const,
    };
    vi.mocked(evaluacionRepository.findHistorialGlobal).mockResolvedValue(historial);

    await expect(evaluacionService.historialGlobal(administrador, filtros)).resolves.toEqual({
      evaluaciones: historial,
    });
    expect(evaluacionRepository.findHistorialGlobal).toHaveBeenCalledWith(filtros);
  });

  it('rechaza el historial global para roles distintos de administrador', async () => {
    await expect(evaluacionService.historialGlobal(evaluador, {})).rejects.toMatchObject({
      status: 403,
    });
    expect(evaluacionRepository.findHistorialGlobal).not.toHaveBeenCalled();
  });
});
