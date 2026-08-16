// Таймзона Europe/Moscow (Р5): фиксированное смещение UTC+03:00 без перехода
// на летнее время, поэтому преобразования — арифметика со сдвигом без Intl.
// Хранение меток времени — в UTC, преобразование в +03:00 только на границе
// системы (сериализация ответов, отображение, §4.6).

export const MSK_OFFSET_MINUTES = 180;

/** Начало рабочего дня, 09:00 Europe/Moscow (Р3). */
export const WORKDAY_START_HOUR = 9;
/** Конец рабочего дня, 18:00 Europe/Moscow (Р3). */
export const WORKDAY_END_HOUR = 18;
/** Длина рабочего дня в минутах: 09:00–18:00 (Р1, §5.1). */
export const WORKDAY_LENGTH_MINUTES = 540;

export interface MskLocal {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0–23 */
  hour: number;
  /** 0–59 */
  minute: number;
}

/** Местное время Europe/Moscow для момента UTC. */
export function mskLocal(utc: Date): MskLocal & { second: number } {
  const shifted = new Date(utc.getTime() + MSK_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/** Дата в Europe/Moscow как строка YYYY-MM-DD (§8.5, дни окна). */
export function mskDateString(utc: Date): string {
  const p = mskLocal(utc);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Сборка момента UTC из местного времени Europe/Moscow. */
export function mskToUtc(local: MskLocal): Date {
  return new Date(
    Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) -
      MSK_OFFSET_MINUTES * 60_000,
  );
}

/** Сериализация момента UTC в ISO 8601 со смещением +03:00 (§8). */
export function formatIsoMsk(utc: Date): string {
  const p = mskLocal(utc);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}+03:00`;
}

const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{2}:\d{2}|Z)$/;

/** Разбор ISO 8601 со смещением (Z или ±HH:MM) в момент UTC.
 *  Строки без смещения отвергаются: трактовка «локального» времени в Node
 *  зависит от таймзоны процесса, что противоречит Р5. null — неверный формат. */
export function parseIso(iso: string): Date | null {
  if (!ISO_WITH_OFFSET.test(iso)) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms);
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
