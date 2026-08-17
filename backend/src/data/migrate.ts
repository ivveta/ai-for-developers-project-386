import { runner } from 'node-pg-migrate';
import { fileURLToPath } from 'node:url';

import { config } from '../config.js';

// Каталог миграций: backend/migrations. Путь считается от этого файла —
// глубина одинакова и в src/data/, и в собранном dist/data/.
const migrationsDir = fileURLToPath(new URL('../../migrations', import.meta.url));

// Прогоняет все ещё не применённые миграции (направление up).
// Вызывается из server.ts при старте (шаг 6). Строку подключения можно передать
// явно — так на шаге 7 те же миграции применяются к тестовой БД (TEST_DATABASE_URL).
export async function runMigrations(databaseUrl: string = config.databaseUrl): Promise<void> {
  await runner({
    databaseUrl,
    dir: migrationsDir,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    // свой логгер появится на шаге 6 вместе с server.ts
    log: () => undefined,
  });
}
