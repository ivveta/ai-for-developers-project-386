import type { Pool } from 'pg';

// Идемпотентный сид начальных данных (§10): типы событий со скриншотов.
// Бронирования начальными данными не создаются. Владелец (имя Tota, подпись Host) —
// константа фронтенда, в БД не хранится (DOMAIN-MODEL §2).
// Повторный запуск безопасен: ON CONFLICT DO NOTHING.
// Вызывается из server.ts при старте после миграций (шаг 6).
export async function runSeed(pool: Pool): Promise<void> {
  await pool.query(`
    INSERT INTO event_type (id, title, description, duration_minutes)
    VALUES
      ('meeting-15', 'Встреча 15 минут', 'Короткий тип события для быстрого слота.', 15),
      ('meeting-30', 'Встреча 30 минут', 'Базовый тип события для бронирования.', 30)
    ON CONFLICT (id) DO NOTHING
  `);
}
