import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Uso: tsx scripts/run-sql.ts <archivo.sql>');
  }

  const dbName = process.env.DB_NAME;
  if (!dbName || !/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error('DB_NAME inválido o ausente. Revise backend/.env');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: dbName,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    const filePath = path.resolve(process.cwd(), file);
    console.log(`Ejecutando ${filePath}...`);
    await connection.query(fs.readFileSync(filePath, 'utf8'));
    console.log('Script ejecutado correctamente.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('\nError al ejecutar el script SQL:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
