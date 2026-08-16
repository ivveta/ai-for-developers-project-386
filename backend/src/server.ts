// Entrypoint: миграции → сид → HTTP-сервер (STRUCTURE-PLAN, шаг 5/6).
// Запуск: npm run dev (tsx watch) или npm start (собранный dist/server.js).

import { config } from './config.js';
import { createPool } from './data/db.js';
import { runMigrations } from './data/migrate.js';
import { runSeed } from './data/seed.js';
import { buildApp } from './http/app.js';

async function main(): Promise<void> {
  await runMigrations();
  const pool = createPool();
  await runSeed(pool);
  const app = buildApp({ pool });
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
