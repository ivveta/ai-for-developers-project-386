// Конфигурация приложения из переменных окружения.
// Значения по умолчанию совпадают с .env.example, поэтому локально всё работает
// и без .env; при наличии файла он подхватывается флагом --env-file-if-exists
// в скриптах dev/start (нативная возможность Node 22, dotenv не нужен).

export interface AppConfig {
  /** Подключение к основной БД (сервис postgres в docker-compose, порт 5432) */
  databaseUrl: string;
  /** Подключение к тестовой БД (сервис postgres-test, порт 5433) — для интеграционных тестов (шаг 7) */
  testDatabaseUrl: string;
  /** Порт HTTP-сервера */
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    databaseUrl: env.DATABASE_URL ?? 'postgres://calendar:calendar@localhost:5432/calendar',
    testDatabaseUrl:
      env.TEST_DATABASE_URL ?? 'postgres://calendar:calendar@localhost:5433/calendar_test',
    port: Number(env.PORT ?? 3000),
  };
}

export const config = loadConfig();
