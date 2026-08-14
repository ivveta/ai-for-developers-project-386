import type { components } from '@calendar/api-contract';
import { Button, Card, Group, ScrollArea, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { Link } from 'react-router-dom';

import { formatSlotInterval } from '../lib/format';

type DaySlots = components['schemas']['DaySlots'];

// Панель «Статус слотов» §7.5 (колонка 3): слоты выбранного дня со статусами,
// занятые неактивны; «Продолжить» — только при выбранном свободном слоте.
export function SlotPanel({
  day,
  selectedSlot,
  onSelectSlot,
  onContinue,
}: {
  day: DaySlots | null;
  selectedSlot: string | null;
  onSelectSlot: (startIso: string) => void;
  onContinue: () => void;
}) {
  return (
    <Card withBorder radius="lg" p="xl">
      <Title order={2} fz="lg" mb="md">
        Статус слотов
      </Title>

      {day && day.freeCount === 0 && <Text c="gray.6">На этот день свободных слотов нет</Text>}

      {day && day.freeCount > 0 && (
        <ScrollArea mah={420} type="auto" offsetScrollbars>
          <Stack gap="xs" pr="sm">
            {day.slots.map((slot) => {
              const free = slot.status === 'free';
              const selected = slot.start === selectedSlot;
              return (
                <UnstyledButton
                  key={slot.start}
                  disabled={!free}
                  onClick={() => onSelectSlot(slot.start)}
                  aria-pressed={selected}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderRadius: 8,
                    border: `1px solid ${
                      selected ? 'var(--mantine-color-orange-6)' : 'var(--mantine-color-gray-3)'
                    }`,
                    background: selected
                      ? 'var(--mantine-color-orange-0)'
                      : free
                        ? undefined
                        : 'var(--mantine-color-gray-0)',
                    padding: '10px 14px',
                  }}
                >
                  <Text fz="sm" c={free ? 'dark.8' : 'gray.6'}>
                    {formatSlotInterval(slot.start, slot.end)}
                  </Text>
                  <Text fz="sm" fw={600} c={free ? 'dark.9' : 'gray.6'}>
                    {free ? 'Свободно' : 'Занято'}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Stack>
        </ScrollArea>
      )}

      <Group grow mt="xl">
        <Button variant="default" component={Link} to="/book">
          Назад
        </Button>
        <Button color="#f06f04" disabled={!selectedSlot} onClick={onContinue}>
          Продолжить
        </Button>
      </Group>
    </Card>
  );
}
