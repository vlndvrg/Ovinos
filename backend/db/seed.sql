-- =====================================================================
-- Seed obligatorio: catálogo de libertades, indicadores y administrador
-- Contraseña inicial del administrador: Admin123*
-- (cámbiela después de iniciar sesión)
-- =====================================================================
SET NAMES utf8mb4;

INSERT INTO libertades (id, nombre, peso) VALUES
  (1, 'Libre de hambre, sed y desnutrición', 0.2000),
  (2, 'Libre de molestias físicas y térmicas', 0.2000),
  (3, 'Libre de dolor, lesión y enfermedad', 0.3500),
  (4, 'Libre de temor y angustia', 0.1000),
  (5, 'Libre de impedimentos de comportamiento natural', 0.1500)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  peso = VALUES(peso);

INSERT INTO indicadores
  (id, numero, libertad_id, nombre, descripcion, metodo_evaluacion,
   aplica_extensivo, aplica_semi_intensivo, aplica_intensivo, aplica_familiar,
   solo_especie, solo_ovino_lana,
   criterio_100, criterio_55, criterio_20, criterio_0)
VALUES
  -- L1. Libre de hambre, sed y desnutrición
  (1, 1, 1, 'Acceso y disponibilidad al agua de bebida',
   'Se verifica que todos los animales tengan acceso permanente a agua de bebida en bebederos, chupos, zanjas o jagüeyes, sin barreras que lo impidan.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (2, 2, 1, 'Cantidad y calidad del agua',
   'Se comprueba que el agua disponible sea suficiente y de buena calidad (limpia, fresca y sin contaminación aparente) para todos los animales.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (3, 3, 1, 'Estado y limpieza de bebederos',
   'Se inspecciona el estado físico y la limpieza interior de bebederos, chupos y zanjas, libres de moho, heces o residuos.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (4, 4, 1, 'Acceso y disponibilidad del alimento',
   'Se verifica que todos los animales tengan acceso permanente y suficiente al alimento en corrales y praderas.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (5, 5, 1, 'Cantidad y calidad del alimento',
   'Se evalúa que la cantidad y calidad del alimento suministrado cubran los requerimientos nutricionales del hato.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (6, 6, 1, 'Estado y limpieza de comederos',
   'Se inspecciona el estado físico y la limpieza de comederos, libres de moho, lama, heces o alimento fermentado.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (7, 7, 1, 'Almacenamiento de alimentos',
   'Se verifica que los alimentos se almacenen en un lugar seco, limpio, ventilado y protegido de plagas y humedad.',
   'VISUAL', 1, 1, 1, 0, NULL, 0, NULL, NULL, NULL, NULL),
  (8, 8, 1, 'Condición corporal',
   'Se evalúa la condición corporal de una muestra de animales en una escala de 1 a 5, según la especie y etapa productiva.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),

  -- L2. Libre de molestias físicas y térmicas
  (9, 9, 2, 'Signos de estrés térmico',
   'Se observan signos de estrés térmico (jadeo, agitación, agrupamiento, búsqueda de sombra) en una muestra de animales.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (10, 10, 2, 'Acceso a sombra en corrales y potreros',
   'Se verifica que existan áreas de sombra naturales o artificiales suficientes para todos los animales.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (11, 11, 2, 'Encharcamiento',
   'Se revisa que corrales y potreros no presenten encharcamientos ni zonas de barro que afecten el descanso y la locomoción.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (12, 12, 2, 'Espacio mínimo por animal en confinamiento',
   'Se verifica que el espacio disponible por animal en confinamiento cumpla el mínimo requerido según especie y categoría.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (13, 13, 2, 'Tipo, estado del piso y limpieza de corrales',
   'Se evalúa el tipo de piso, su estado (fisuras, huecos, resbalos) y la limpieza general de los corrales.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (14, 14, 2, 'Condición e higiene de la cama',
   'Se inspecciona que la cama esté seca, limpia, suficiente y en buen estado para el descanso de los animales.',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (15, 15, 2, 'Iluminación en corrales',
   'Se verifica que los corrales cuenten con iluminación natural o artificial suficiente para la inspección y el bienestar animal.',
   'VISUAL', 0, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (16, 16, 2, 'Ventilación en corrales',
   'Se verifica que los corrales tengan ventilación adecuada, sin acumulación de gases, humedad o polvo.',
   'VISUAL', 0, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),

  -- L3. Libre de dolor, lesión y enfermedad
  (17, 17, 3, 'Sintomatología respiratoria',
   'Se observan signos respiratorios como secreción nasal, tos, disnea o ruidos anormales en una muestra de animales.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (18, 18, 3, 'Secreción ocular',
   'Se evalúa la presencia de secreción ocular, lagrimeo excesivo o inflamación en una muestra de animales.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (19, 19, 3, 'FAMACHA',
   'Se aplica la escala FAMACHA en una muestra de animales para estimar el grado de anemia por parásitos gastrointestinales.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (20, 20, 3, 'Topizado y descorne',
   'Se verifica que el topizado y descorne se realicen con técnicas, edad y analgesia adecuadas, cumpliendo la normativa.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, 'CAPRINO', 0, NULL, NULL, NULL, NULL),
  (21, 21, 3, 'Ectoparásitos',
   'Se inspecciona la presencia de tábanos, garrapatas, nuches, miasis u otros ectoparásitos en una muestra de animales.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (22, 22, 3, 'Lesiones, heridas, pérdida de pelo o lana',
   'Se observan lesiones, heridas, cicatrices, pérdida de pelo o lana y cualquier signo de maltrato físico.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (23, 23, 3, 'Mastitis clínica',
   'Se evalúa la presencia de mastitis clínica mediante inspección y palpación de la ubre en animales en producción.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (24, 24, 3, 'Castración',
   'Se verifica que la castración se realice con técnicas adecuadas, edad apropiada, analgesia y condiciones sanitarias.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (25, 25, 3, 'Descole',
   'Se verifica que el descole se realice con técnicas, edad y analgesia adecuadas, cumpliendo la normativa vigente.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, 'OVINO', 0, NULL, NULL, NULL, NULL),
  (26, 26, 3, 'Suciedad del tren posterior',
   'Se evalúa el grado de suciedad del tren posterior en ovinos de lana, asociado a diarrea o manejo sanitario.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, 'OVINO', 1, NULL, NULL, NULL, NULL),
  (27, 27, 3, 'Cojeras',
   'Se observan signos de cojera, alteraciones de la marcha o apoyo anormal en una muestra de animales.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (28, 28, 3, 'Sobrecrecimiento de pezuñas',
   'Se inspecciona el crecimiento excesivo o deformidad de pezuñas que afecte la locomoción.',
   'VISUAL_MUESTREO', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (29, 29, 3, 'Mortalidad',
   'Se revisa el registro de mortalidad del predio y se calcula la tasa frente al inventario promedio.',
   'DOCUMENTAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (30, 30, 3, 'Uso de medicamentos veterinarios',
   'Se verifica el uso responsable de medicamentos veterinarios, tiempos de retiro y registro de tratamientos.',
   'DOCUMENTAL', 1, 1, 1, 0, NULL, 0, NULL, NULL, NULL, NULL),
  (31, 31, 3, 'Plan sanitario firmado por MV/MVZ e implementado',
   'Se verifica la existencia de un plan sanitario firmado por médico veterinario o médico veterinario zootecnista y su implementación.',
   'DOCUMENTAL', 1, 1, 1, 0, NULL, 0, NULL, NULL, NULL, NULL),

  -- L4. Libre de temor y angustia
  (32, 32, 4, 'Respuesta a la interacción con el humano',
   'Se evalúa la respuesta de los animales al acercamiento y manejo por parte del personal (huida, agresividad, docilidad).',
   'VISUAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (33, 33, 4, 'Conocimiento y capacitación en bienestar animal',
   'Se verifica que el personal conozca y haya recibido capacitación en bienestar animal y buenas prácticas de manejo.',
   'DOCUMENTAL', 1, 1, 1, 1, NULL, 0, NULL, NULL, NULL, NULL),

  -- L5. Libre de impedimentos de comportamiento natural
  (34, 34, 5, 'Elementos que restringen el movimiento',
   'Se revisa la presencia de ataduras, cadenas, collares o elementos que impidan el movimiento natural.',
   'VISUAL', 1, 1, 1, 0, NULL, 0, NULL, NULL, NULL, NULL),
  (35, 35, 5, 'Generación de aislamiento social',
   'Se verifica que los animales no sean mantenidos en aislamiento social innecesario.',
   'VISUAL', 1, 1, 1, 0, NULL, 0, NULL, NULL, NULL, NULL),
  (36, 36, 5, 'Potrero de descanso y/o enriquecimiento ambiental',
   'Se verifica la disponibilidad de potrero de descanso o elementos de enriquecimiento ambiental.',
   'VISUAL', 0, 1, 1, 0, NULL, 0, NULL, NULL, NULL, NULL),
  (37, 37, 5, 'Agrupamiento social',
   'Se evalúa que los animales se mantengan en grupos sociales estables y con espacio suficiente.',
   'VISUAL', 0, 0, 0, 1, NULL, 0, NULL, NULL, NULL, NULL),
  (38, 38, 5, 'Animales amarrados',
   'Se revisa que no existan animales amarrados de forma permanente o que limite su comportamiento natural.',
   'VISUAL', 0, 0, 0, 1, NULL, 0, NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE
  numero = VALUES(numero),
  libertad_id = VALUES(libertad_id),
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  metodo_evaluacion = VALUES(metodo_evaluacion),
  aplica_extensivo = VALUES(aplica_extensivo),
  aplica_semi_intensivo = VALUES(aplica_semi_intensivo),
  aplica_intensivo = VALUES(aplica_intensivo),
  aplica_familiar = VALUES(aplica_familiar),
  solo_especie = VALUES(solo_especie),
  solo_ovino_lana = VALUES(solo_ovino_lana);

-- Usuario administrador inicial. Correo: admin@eba.gov.co / Contraseña: Admin123*
INSERT INTO usuarios (nombre, correo, password_hash, rol, activo) VALUES
  ('Administrador EBA', 'admin@eba.gov.co',
   '$2b$10$Fl9fESe7m71OTzsOwhWVJOVsoKOf/CQiwy/WnD/BF7v5kFAdSsjUm',
   'ADMIN', 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  password_hash = VALUES(password_hash),
  rol = 'ADMIN',
  activo = 1;
