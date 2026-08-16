import { Pool } from 'pg';

import { config } from '../config.js';

// Пул подключений к PostgreSQL. По умолчанию — основная БД из config;
// строку подключения можно передать явно (тестовая БД на шаге 7).
export function createPool(connectionString: string = config.databaseUrl): Pool {
  return new Pool({ connectionString });
}
