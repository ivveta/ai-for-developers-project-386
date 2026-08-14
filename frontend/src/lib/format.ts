// Форматы отображения §7.11. Даты и время — через Intl в таймзоне Europe/Moscow
// (решение Р5). Функции добавляются по мере появления экранов.

const MSK_TIMEZONE = 'Europe/Moscow';

// Дату вида «YYYY-MM-DD» из ответа API (календарный день в Europe/Moscow)
// интерпретируем как полночь UTC: момент попадает на тот же календарный день
// в Europe/Moscow (+03:00, переходов на летнее время в зоне нет).
export function dateStringToUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** Длительность: «15 мин». */
export function formatDurationMinutes(minutes: number): string {
  return `${minutes} мин`;
}

/** Дата в карточке выбора: «вторник, 31 марта». */
export function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: MSK_TIMEZONE,
  }).format(dateStringToUtc(date));
}

/** Подпись месяца в календаре: «март 2026 г.`. Аргумент — UTC-полночь 1-го числа. */
export function formatMonthLabel(monthStartUtc: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: MSK_TIMEZONE,
  }).format(monthStartUtc);
}

/** Дата момента (ISO со смещением): «31 марта 2026 г.» — для createdAt в админке. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: MSK_TIMEZONE,
  }).format(new Date(iso));
}

/** Время момента (ISO со смещением): «09:00». */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MSK_TIMEZONE,
  }).format(new Date(iso));
}

/** Интервал слота: «09:00 - 09:15». */
export function formatSlotInterval(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} - ${formatTime(endIso)}`;
}

/** Счётчик свободных слотов: «36 св.». */
export function formatFreeCount(count: number): string {
  return `${count} св.`;
}
