-- =====================================================================
-- Seed OPCIONAL de demostración
-- Ejecutar DESPUÉS de db/seed.sql:  npm run db:seed:demo
-- Usuarios creados:
--   evaluador.demo@eba.gov.co  / Evaluador123*
--   responsable.demo@eba.gov.co / Responsable123*
-- =====================================================================
SET NAMES utf8mb4;

INSERT INTO usuarios (nombre, correo, password_hash, rol, activo) VALUES
  ('Camila Restrepo (Evaluadora)', 'evaluador.demo@eba.gov.co',
   '$2b$10$MEiS98QvzqyJuZb1NX2u9OBRpKXti4Yrwc9zR5lqn0wPnFoz2X.i2', 'EVALUADOR', 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), password_hash = VALUES(password_hash), rol = 'EVALUADOR', activo = 1;

INSERT INTO usuarios (nombre, correo, password_hash, rol, activo) VALUES
  ('Don Aurelio Gómez (Responsable)', 'responsable.demo@eba.gov.co',
   '$2b$10$x3Gdki/u3/rz6YhT1les1uL5KOx88ssgIewH35g6obLiQsucHPV4K', 'RESPONSABLE', 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), password_hash = VALUES(password_hash), rol = 'RESPONSABLE', activo = 1;

SET @evaluador_id := (SELECT id FROM usuarios WHERE correo = 'evaluador.demo@eba.gov.co' LIMIT 1);
SET @responsable_id := (SELECT id FROM usuarios WHERE correo = 'responsable.demo@eba.gov.co' LIMIT 1);

INSERT INTO predios
  (nombre, municipio, direccion, especie, sistema_productivo, es_ovino_de_lana, numero_animales, responsable_id, creado_por)
SELECT 'Predio La Esperanza', 'Villa de Leyva', 'Vereda Rupavita, km 3', 'OVINO', 'SEMI_INTENSIVO', 1, 120, @responsable_id, @evaluador_id
WHERE NOT EXISTS (
  SELECT 1 FROM predios WHERE nombre = 'Predio La Esperanza' AND creado_por = @evaluador_id
);

SET @predio_id := (
  SELECT id FROM predios
  WHERE nombre = 'Predio La Esperanza' AND creado_por = @evaluador_id
  ORDER BY id LIMIT 1
);

SET @fecha := CURDATE() - INTERVAL 12 DAY;

INSERT INTO evaluaciones (predio_id, evaluador_id, fecha, estado, observaciones)
SELECT @predio_id, @evaluador_id, @fecha, 'BORRADOR',
       'Evaluación de demostración: predio con manejo semi intensivo, ovinos de lana y plan sanitario vigente.'
WHERE NOT EXISTS (
  SELECT 1 FROM evaluaciones
  WHERE predio_id = @predio_id AND evaluador_id = @evaluador_id
    AND observaciones LIKE 'Evaluación de demostración%'
);

SET @evaluacion_id := (
  SELECT id FROM evaluaciones
  WHERE predio_id = @predio_id AND evaluador_id = @evaluador_id
    AND observaciones LIKE 'Evaluación de demostración%'
  ORDER BY id LIMIT 1
);

DELETE FROM evaluacion_indicadores WHERE evaluacion_id = @evaluacion_id;

INSERT INTO evaluacion_indicadores (evaluacion_id, indicador_id, puntaje, observacion)
SELECT @evaluacion_id, i.id,
  CASE i.numero
    WHEN 7 THEN 55
    WHEN 14 THEN 55
    WHEN 19 THEN 55
    WHEN 26 THEN 55
    WHEN 29 THEN 55
    WHEN 36 THEN 55
    ELSE 100
  END,
  CASE i.numero
    WHEN 7 THEN 'El depósito de alimento está cubierto, pero se observó humedad en el piso.'
    WHEN 14 THEN 'La cama está seca en la mayor parte del corral; hay zonas húmedas junto al bebedero.'
    WHEN 19 THEN 'El 12 % de los animales muestreados presentó color 4 en la escala FAMACHA.'
    WHEN 26 THEN 'Se observa suciedad moderada en el tren posterior de algunos animales.'
    WHEN 29 THEN 'La tasa de mortalidad del último año fue de 4,8 %, ligeramente superior a la meta.'
    WHEN 36 THEN 'El potrero de descanso existe, aunque no cuenta con elementos de enriquecimiento.'
    ELSE NULL
  END
FROM indicadores i
WHERE i.aplica_semi_intensivo = 1
  AND (i.solo_especie IS NULL OR i.solo_especie = 'OVINO');

-- El predio demo es ovino de lana, por lo que el indicador 26 (solo_ovino_lana) aplica.
SELECT ROUND(SUM(l.peso * ROUND(t.promedio, 2)), 2) INTO @total
FROM (
  SELECT i.libertad_id, AVG(ei.puntaje) AS promedio
  FROM evaluacion_indicadores ei
  JOIN indicadores i ON i.id = ei.indicador_id
  WHERE ei.evaluacion_id = @evaluacion_id
  GROUP BY i.libertad_id
) t
JOIN libertades l ON l.id = t.libertad_id;

SET @clasif := CASE
  WHEN @total >= 90 THEN 'EXCELENTE BIENESTAR'
  WHEN @total >= 75 THEN 'ALTO'
  WHEN @total >= 50 THEN 'MEDIO'
  ELSE 'BAJO'
END;

UPDATE evaluaciones
SET estado = 'CERRADA',
    fecha = @fecha,
    puntaje_total = @total,
    clasificacion = @clasif,
    cerrada_en = NOW()
WHERE id = @evaluacion_id;
