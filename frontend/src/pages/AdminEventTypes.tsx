import type { components } from '@calendar/api-contract';
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { client } from '../api/client';
import { formatDate, formatDurationMinutes } from '../lib/format';

type EventType = components['schemas']['EventType'];

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; eventTypes: EventType[] };

// Админка: список типов событий `/admin/event-types` (§7.8).
export function AdminEventTypes() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const { data, error } = await client.GET('/api/event-types');
    if (error) {
      setState({ status: 'error' });
      return;
    }
    setState({ status: 'success', eventTypes: data.data });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <Container size="lg" py={40}>
        <Group justify="space-between" mb="xl">
          <Title order={1} fz={28}>
            Типы событий
          </Title>
          <Button component={Link} to="/admin/event-types/new" color="#f06f04">
            Создать тип события
          </Button>
        </Group>

        {state.status === 'loading' && (
          <Center py="xl">
            <Loader aria-label="Загрузка" />
          </Center>
        )}

        {state.status === 'error' && (
          <Alert color="red" title="Не удалось загрузить типы событий">
            <Stack gap="sm" align="flex-start">
              <Text fz="sm">Проверьте соединение и попробуйте ещё раз.</Text>
              <Button variant="default" onClick={() => void load()}>
                Повторить
              </Button>
            </Stack>
          </Alert>
        )}

        {state.status === 'success' && state.eventTypes.length === 0 && (
          <Center py="xl">
            <Text c="gray.6">Пока нет типов событий</Text>
          </Center>
        )}

        {state.status === 'success' && state.eventTypes.length > 0 && (
          <Card withBorder radius="lg" p={0}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>id</Table.Th>
                  <Table.Th>Название</Table.Th>
                  <Table.Th>Описание</Table.Th>
                  <Table.Th>Длительность</Table.Th>
                  <Table.Th>Создан</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {state.eventTypes.map((eventType) => (
                  <Table.Tr key={eventType.id}>
                    <Table.Td>
                      <Text fz="sm" ff="monospace">{eventType.id}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm" fw={600}>{eventType.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm" c="gray.7">{eventType.description}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm">{formatDurationMinutes(eventType.durationMinutes)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fz="sm">{formatDate(eventType.createdAt)}</Text>
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
