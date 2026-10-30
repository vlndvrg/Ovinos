import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

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

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: requireEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    console.log(`Creando base de datos ${dbName} si no existe...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${dbName}\``);

    const schemaPath = path.resolve(__dirname, '..', 'db', 'schema.sql');
    const seedPath = path.resolve(__dirname, '..', 'db', 'seed.sql');

    console.log('Ejecutando schema.sql...');
    await connection.query(fs.readFileSync(schemaPath, 'utf8'));

    console.log('Ejecutando seed.sql...');
    await connection.query(fs.readFileSync(seedPath, 'utf8'));

    console.log('\nBase de datos creada correctamente.');
    console.log('Usuario administrador: admin@eba.gov.co / Admin123*');
    console.log('Recuerde cambiar la contraseña después del primer ingreso.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('\nError al preparar la base de datos:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
