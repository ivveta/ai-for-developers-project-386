// Entrypoint: миграции → сид → HTTP-сервер (STRUCTURE-PLAN, шаг 5/6).
// Запуск: npm run dev (tsx watch) или npm start (собранный dist/server.js).

import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { createPool } from './data/db.js';
import { runMigrations } from './data/migrate.js';
import { runSeed } from './data/seed.js';
import { buildApp } from './http/app.js';

// Путь к собранному фронтенду: работает и из src/ (tsx), и из dist/ (npm start).
const staticDir = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

async function main(): Promise<void> {
  const pool = createPool();
  try {
    await runMigrations();
    await runSeed(pool);
  } catch (error) {
    console.error('Database init failed, continuing without database:', error);
  }
  const app = buildApp({ pool, staticDir });
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
