import type { components } from '@calendar/api-contract';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { client } from '../api/client';
import { formatDurationMinutes } from '../lib/format';

type EventType = components['schemas']['EventType'];

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; eventTypes: EventType[] };

// Каталог типов событий `/book` (§7.4, скриншот 02-book-catalog.png).
export function BookCatalog() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const { data, error } = await client.GET('/api/event-types');
    if (error) {
      setState({ status: 'error' });
      return;
    }
    // Порядок карточек — по createdAt по возрастанию (§7.4); ISO-строки с
    // одинаковым смещением сортируются лексикографически.
    const eventTypes = [...data.data].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    setState({ status: 'success', eventTypes });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <Container size="lg" py={40}>
        <Card withBorder radius="lg" p="xl" mb="xl">
          <Title order={1} fz={28} mb={4}>
            Выберите тип события
          </Title>
          <Text c="gray.7">Нажмите на карточку, чтобы открыть календарь и выбрать удобный слот.</Text>
        </Card>

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
          <Grid gutter="lg">
            {state.eventTypes.map((eventType) => (
              <Grid.Col key={eventType.id} span={{ base: 12, sm: 6 }}>
                <Card
                  withBorder
                  radius="lg"
                  p="xl"
                  component={Link}
                  to={`/book/${eventType.id}`}
                  style={{ cursor: 'pointer' }}
                >
                  <Group justify="space-between" wrap="nowrap" mb="xs">
                    <Text fw={700} fz="lg">
                      {eventType.title}
                    </Text>
                    <Badge variant="light" c="gray.7" bg="gray.1" radius="sm" tt="none">
                      {formatDurationMinutes(eventType.durationMinutes)}
                    </Badge>
                  </Group>
                  <Text c="gray.7">{eventType.description}</Text>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
