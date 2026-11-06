-- =====================================================================
-- Sistema de Evaluación de Bienestar Animal (EBA) - Ovinos y Caprinos
-- Esquema de base de datos MySQL 8 / MariaDB 10.5+
-- =====================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ADMIN', 'EVALUADOR', 'RESPONSABLE') NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_correo (correo),
  KEY idx_usuarios_rol (rol, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS predios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  municipio VARCHAR(120) NOT NULL,
  direccion VARCHAR(200) NULL,
  especie ENUM('OVINO', 'CAPRINO') NOT NULL,
  sistema_productivo ENUM('EXTENSIVO', 'SEMI_INTENSIVO', 'INTENSIVO', 'FAMILIAR') NOT NULL,
  es_ovino_de_lana TINYINT(1) NOT NULL DEFAULT 0,
  numero_animales INT UNSIGNED NOT NULL,
  responsable_id INT UNSIGNED NULL,
  creado_por INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_predios_responsable (responsable_id),
  KEY idx_predios_creado_por (creado_por),
  KEY idx_predios_especie_sistema (especie, sistema_productivo),
  KEY idx_predios_nombre (nombre),
  CONSTRAINT fk_predios_responsable FOREIGN KEY (responsable_id)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_predios_creado_por FOREIGN KEY (creado_por)
    REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_predios_animales CHECK (numero_animales > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS libertades (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(150) NOT NULL,
  peso DECIMAL(6,4) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_libertades_peso CHECK (peso >= 0 AND peso <= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS indicadores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero INT UNSIGNED NOT NULL,
  libertad_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  metodo_evaluacion ENUM('DOCUMENTAL', 'VISUAL', 'VISUAL_MUESTREO') NOT NULL,
  aplica_extensivo TINYINT(1) NOT NULL DEFAULT 1,
  aplica_semi_intensivo TINYINT(1) NOT NULL DEFAULT 1,
  aplica_intensivo TINYINT(1) NOT NULL DEFAULT 1,
  aplica_familiar TINYINT(1) NOT NULL DEFAULT 1,
  solo_especie ENUM('OVINO', 'CAPRINO') NULL,
  solo_ovino_lana TINYINT(1) NOT NULL DEFAULT 0,
  criterio_100 TEXT NULL,
  criterio_55 TEXT NULL,
  criterio_20 TEXT NULL,
  criterio_0 TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_indicadores_numero (numero),
  KEY idx_indicadores_libertad (libertad_id),
  CONSTRAINT fk_indicadores_libertad FOREIGN KEY (libertad_id)
    REFERENCES libertades (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS indicador_criterios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  indicador_id INT UNSIGNED NOT NULL,
  tipo_predio ENUM('PRODUCTIVO', 'FAMILIAR') NOT NULL,
  seccion VARCHAR(20) NOT NULL,
  criterio_100 TEXT NOT NULL,
  criterio_55 TEXT NOT NULL,
  criterio_20 TEXT NOT NULL,
  criterio_0 TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_indicador_criterio_tipo (indicador_id, tipo_predio),
  KEY idx_indicador_criterios_tipo (tipo_predio),
  CONSTRAINT fk_indicador_criterios_indicador FOREIGN KEY (indicador_id)
    REFERENCES indicadores (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluaciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  predio_id INT UNSIGNED NOT NULL,
  evaluador_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  estado ENUM('BORRADOR', 'CERRADA') NOT NULL DEFAULT 'BORRADOR',
  puntaje_total DECIMAL(5,2) NULL,
  clasificacion ENUM('EXCELENTE BIENESTAR', 'ALTO', 'MEDIO', 'BAJO') NULL,
  observaciones TEXT NULL,
  cerrada_en DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_evaluaciones_predio (predio_id, estado),
  KEY idx_evaluaciones_evaluador (evaluador_id, estado),
  KEY idx_evaluaciones_fecha (fecha),
  CONSTRAINT fk_evaluaciones_predio FOREIGN KEY (predio_id)
    REFERENCES predios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_evaluaciones_evaluador FOREIGN KEY (evaluador_id)
    REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_evaluaciones_total CHECK (puntaje_total IS NULL OR (puntaje_total >= 0 AND puntaje_total <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recomendaciones_ia (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evaluacion_id INT UNSIGNED NOT NULL,
  contenido MEDIUMTEXT NOT NULL,
  modelo VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recomendaciones_evaluacion (evaluacion_id),
  CONSTRAINT fk_recomendaciones_evaluacion FOREIGN KEY (evaluacion_id)
    REFERENCES evaluaciones (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluacion_indicadores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evaluacion_id INT UNSIGNED NOT NULL,
  indicador_id INT UNSIGNED NOT NULL,
  puntaje TINYINT UNSIGNED NULL,
  observacion VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_evaluacion_indicador (evaluacion_id, indicador_id),
  KEY idx_eval_ind_indicador (indicador_id),
  CONSTRAINT fk_eval_ind_evaluacion FOREIGN KEY (evaluacion_id)
    REFERENCES evaluaciones (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_eval_ind_indicador FOREIGN KEY (indicador_id)
    REFERENCES indicadores (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_eval_ind_puntaje CHECK (puntaje IS NULL OR puntaje IN (0, 20, 55, 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
