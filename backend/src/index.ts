import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';

async function iniciar() {
  try {
    await pool.query('SELECT 1');
    console.log('Conexión a la base de datos verificada.');
  } catch (error) {
    console.error('No fue posible conectar con la base de datos.');
    console.error(error instanceof Error ? error.message : error);
    console.error('Revise backend/.env y ejecute npm run db:setup.');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`API EBA disponible en http://localhost:${env.PORT}/api`);
    console.log(`Entorno: ${env.NODE_ENV}`);
  });

  const cerrar = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

iniciar();
