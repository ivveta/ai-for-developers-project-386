import type { components } from '@calendar/api-contract';
import { ActionIcon, Box, Card, Group, SimpleGrid, Text, Title, UnstyledButton } from '@mantine/core';
import { useMemo, useState } from 'react';

import { dateStringToUtc, formatFreeCount, formatMonthLabel } from '../lib/format';

type DaySlots = components['schemas']['DaySlots'];

const DAY_MS = 24 * 60 * 60 * 1000;
// Подписи дней недели зафиксированы спекой (§7.5): неделя начинается с понедельника.
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthStartOf(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Недели (по 7 дат), покрывающие месяц; первый день недели — понедельник. */
function buildWeeks(monthStart: Date): Date[][] {
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const mondayOffset = (monthStart.getUTCDay() + 6) % 7;
  let weekStart = new Date(monthStart.getTime() - mondayOffset * DAY_MS);
  const weeks: Date[][] = [];
  while (weekStart <= monthEnd) {
    weeks.push(Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS)));
    weekStart = new Date(weekStart.getTime() + 7 * DAY_MS);
  }
  return weeks;
}

// Календарь §7.5 (колонка 2): навигация по месяцам, даты вне окна записи
// приглушены и неактивны, под доступными датами — счётчик «N св.».
export function BookingCalendar({
  days,
  selectedDate,
  onSelect,
}: {
  days: DaySlots[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const [month, setMonth] = useState(() => monthStartOf(dateStringToUtc(days[0].date)));

  const weeks = useMemo(() => buildWeeks(month), [month]);

  const firstWindowMonth = monthStartOf(dateStringToUtc(days[0].date));
  const lastWindowMonth = monthStartOf(dateStringToUtc(days[days.length - 1].date));
  const canGoPrev = month > firstWindowMonth;
  const canGoNext = month < lastWindowMonth;

  return (
    <Card withBorder radius="lg" p="xl">
      <Group justify="space-between" mb="md">
        <Title order={2} fz="lg">
          Календарь
        </Title>
        <Group gap="xs">
          <ActionIcon
            variant="default"
            aria-label="Предыдущий месяц"
            disabled={!canGoPrev}
            onClick={() => setMonth((m) => monthStartOf(new Date(m.getTime() - DAY_MS)))}
          >
            ←
          </ActionIcon>
          <ActionIcon
            variant="default"
            aria-label="Следующий месяц"
            disabled={!canGoNext}
            onClick={() => setMonth((m) => new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1)))}
          >
            →
          </ActionIcon>
        </Group>
      </Group>
      <Text fz="sm" c="gray.7" mb="sm">
        {formatMonthLabel(month)}
      </Text>
      <SimpleGrid cols={7} spacing={4} mb={4}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={label} ta="center" fz="xs" fw={600} c={i >= 5 ? 'blue.5' : 'gray.6'}>
            {label}
          </Text>
        ))}
      </SimpleGrid>
      <SimpleGrid cols={7} spacing={4}>
        {weeks.flat().map((day) => {
          const date = toDateString(day);
          const daySlots = byDate.get(date);
          // Ячейки соседних месяцев не активируем, даже если дата внутри окна:
          // они станут доступны после навигации «←»/«→» на свой месяц.
          const available = Boolean(daySlots) && day.getUTCMonth() === month.getUTCMonth();
          const selected = date === selectedDate;
          return (
            <UnstyledButton
              key={date}
              disabled={!available}
              onClick={() => onSelect(date)}
              aria-pressed={selected}
              style={{
                borderRadius: 8,
                border: `1px solid ${
                  selected ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-gray-3)'
                }`,
                background: selected ? 'var(--mantine-color-orange-0)' : undefined,
                opacity: available ? 1 : 0.45,
                padding: '6px 0',
                textAlign: 'center',
              }}
            >
              <Box
                fz="sm"
                fw={selected ? 700 : 400}
                c={selected ? 'orange.7' : available ? 'dark.8' : 'gray.6'}
              >
                {day.getUTCDate()}
              </Box>
              {available && daySlots && (
                <Box fz={10} c="gray.6">
                  {formatFreeCount(daySlots.freeCount)}
                </Box>
              )}
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Card>
  );
}
