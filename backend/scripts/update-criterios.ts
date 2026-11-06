import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

interface CriterioSeed {
  indicador_id: number;
  tipo_predio: 'PRODUCTIVO' | 'FAMILIAR';
  seccion: string;
  criterio_100: string;
  criterio_55: string;
  criterio_20: string;
  criterio_0: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revise backend/.env`);
  }
  return value;
}

async function main() {
  const dbName = requireEnv('DB_NAME');
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error('DB_NAME solo puede contener letras, números y guion bajo.');
  }

  const criteriosPath = path.resolve(__dirname, '..', 'db', 'criterios.json');
  const criterios = JSON.parse(fs.readFileSync(criteriosPath, 'utf8')) as CriterioSeed[];

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: requireEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: dbName,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const criterio of criterios) {
      await connection.execute(
        `INSERT INTO indicador_criterios
          (indicador_id, tipo_predio, seccion, criterio_100, criterio_55, criterio_20, criterio_0)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           seccion = VALUES(seccion),
           criterio_100 = VALUES(criterio_100),
           criterio_55 = VALUES(criterio_55),
           criterio_20 = VALUES(criterio_20),
           criterio_0 = VALUES(criterio_0)`,
        [
          criterio.indicador_id,
          criterio.tipo_predio,
          criterio.seccion,
          criterio.criterio_100,
          criterio.criterio_55,
          criterio.criterio_20,
          criterio.criterio_0,
        ],
      );
    }

    console.log(`Criterios EBA actualizados: ${criterios.length} variantes.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('\nError al actualizar los criterios EBA:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
