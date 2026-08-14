import type { components } from '@calendar/api-contract';
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Container,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';

import { client } from '../api/client';
import { formatDayLabel, formatDurationMinutes, formatTime } from '../lib/format';

type Booking = components['schemas']['Booking'];

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; bookings: Booking[] };

// Админка: предстоящие встречи `/admin/bookings` (§7.9). API возвращает только
// будущие брони, отсортированные по startAt по возрастанию (§8.7) — порядок
// на клиенте не меняем.
export function AdminBookings() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const { data, error } = await client.GET('/api/bookings');
    if (error) {
      setState({ status: 'error' });
      return;
    }
    setState({ status: 'success', bookings: data.data });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <Container size="lg" py={40}>
        <Title order={1} fz={28} mb="xl">
          Предстоящие встречи
        </Title>

        {state.status === 'loading' && (
          <Center py="xl">
            <Loader aria-label="Загрузка" />
          </Center>
        )}

        {state.status === 'error' && (
          <Alert color="red" title="Не удалось загрузить встречи">
            <Stack gap="sm" align="flex-start">
              <Text fz="sm">Проверьте соединение и попробуйте ещё раз.</Text>
              <Button variant="default" onClick={() => void load()}>
                Повторить
              </Button>
            </Stack>
          </Alert>
        )}

        {state.status === 'success' && state.bookings.length === 0 && (
          <Center py="xl">
            <Text c="gray.6">Предстоящих встреч нет</Text>
          </Center>
        )}

        {state.status === 'success' && state.bookings.length > 0 && (
          <Card withBorder radius="lg" p={0}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Начало</Table.Th>
                  <Table.Th>Конец</Table.Th>
                  <Table.Th>Длительность</Table.Th>
                  <Table.Th>Тип события</Table.Th>
                  <Table.Th>Имя гостя</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Заметка</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {state.bookings.map((booking) => (
                  <Table.Tr key={booking.id}>
                    <Table.Td>
                      <Text fz="sm">{formatDayLabel(booking.startAt.slice(0, 10))}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm">{formatTime(booking.startAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm">{formatTime(booking.endAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm">{formatDurationMinutes(booking.eventType.durationMinutes)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm" fw={600}>{booking.eventType.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm">{booking.guestName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm">{booking.guestEmail}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm" c="gray.7">{booking.notes ?? '—'}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Container>
    </Box>
  );
}
