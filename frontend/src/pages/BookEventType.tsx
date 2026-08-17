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
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { client } from '../api/client';
import { BookingCalendar } from '../components/BookingCalendar';
import { BookingForm } from '../components/BookingForm';
import { SlotPanel } from '../components/SlotPanel';
import { formatDayLabel, formatDurationMinutes, formatSlotInterval } from '../lib/format';

type Booking = components['schemas']['Booking'];
type EventType = components['schemas']['EventType'];
type WindowSlots = components['schemas']['WindowSlots'];

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'ready'; eventType: EventType; window: WindowSlots };

// Выбор даты и слота `/book/{eventTypeId}` (§7.5, скриншот 03-book-event-type.png).
// Шаг формы §7.6 — на той же странице при наличии query-параметра startAt.
export function BookEventType() {
  const { eventTypeId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [state, setState] = useState<State>({ status: 'loading' });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotTakenNotice, setSlotTakenNotice] = useState(false);

  // Некорректное значение startAt игнорируется: показывается шаг выбора слота (§7.6).
  const startAtParam = searchParams.get('startAt');
  const startAt = startAtParam && !Number.isNaN(Date.parse(startAtParam)) ? startAtParam : null;

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const [typesResult, slotsResult] = await Promise.all([
      client.GET('/api/event-types'),
      client.GET('/api/event-types/{id}/slots', { params: { path: { id: eventTypeId } } }),
    ]);
    if (slotsResult.response.status === 404) {
      setState({ status: 'not-found' });
      return;
    }
    if (typesResult.error || slotsResult.error) {
      setState({ status: 'error' });
      return;
    }
    const eventType = typesResult.data.data.find((t) => t.id === eventTypeId);
    if (!eventType) {
      setState({ status: 'not-found' });
      return;
    }
    const window = slotsResult.data.data;
    setState({ status: 'ready', eventType, window });
    // Выбранная ранее дата сохраняется, если осталась в окне; иначе — первый день окна.
    setSelectedDate((prev) =>
      prev && window.days.some((d) => d.date === prev) ? prev : (window.days[0]?.date ?? null),
    );
    setSelectedSlot(null);
  }, [eventTypeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSlotTaken = () => {
    // §7.10: сообщение и возврат к выбору слота с перезапросом данных.
    setSlotTakenNotice(true);
    setSearchParams({});
    void load();
  };

  const handleBooked = (booking: Booking) => {
    // location.state не переживает перезагрузку страницы, а эндпоинта для одной
    // брони в API нет (§8) — дублируем бронь в sessionStorage, чтобы экран
    // успеха §7.7 открывался и после перезагрузки.
    sessionStorage.setItem(`booking-success:${eventTypeId}`, JSON.stringify(booking));
    navigate(`/book/${eventTypeId}/success`, { state: { booking } });
  };

  if (state.status === 'loading') {
    return (
      <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
        <Center py={80}>
          <Loader aria-label="Загрузка" />
        </Center>
      </Box>
    );
  }

  if (state.status === 'error') {
    return (
      <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
        <Container size="lg" py={40}>
          <Alert color="red" title="Не удалось загрузить слоты">
            <Stack gap="sm" align="flex-start">
              <Text fz="sm">Проверьте соединение и попробуйте ещё раз.</Text>
              <Button variant="default" onClick={() => void load()}>
                Повторить
              </Button>
            </Stack>
          </Alert>
        </Container>
      </Box>
    );
  }

  if (state.status === 'not-found') {
    return (
      <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
        <Container size="lg" py={40}>
          <Card withBorder radius="lg" p="xl">
            <Title order={1} fz="xl" mb="sm">
              Тип события не найден
            </Title>
            <Button variant="default" component={Link} to="/book">
              Перейти в каталог
            </Button>
          </Card>
        </Container>
      </Box>
    );
  }

  const { eventType, window } = state;
  const selectedDay = window.days.find((d) => d.date === selectedDate) ?? null;
  const selectedSlotEnd = selectedSlot
    ? (selectedDay?.slots.find((s) => s.start === selectedSlot)?.end ?? null)
    : null;

  return (
    <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <Container size="xl" py={40}>
        <Title order={1} fz={32} mb="xl">
          {eventType.title}
        </Title>

        {startAt ? (
          <BookingForm
            eventType={eventType}
            startAt={startAt}
            onBack={() => setSearchParams({})}
            onSlotTaken={handleSlotTaken}
            onBooked={handleBooked}
            onNotFound={() => setState({ status: 'not-found' })}
          />
        ) : (
          <>
            {slotTakenNotice && (
              <Alert color="orange" mb="md" onClose={() => setSlotTakenNotice(false)} withCloseButton>
                Этот слот только что заняли. Выберите другое время
              </Alert>
            )}
            <Grid gutter="lg" align="stretch">
              <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                <Card withBorder radius="lg" p="xl" h="100%">
                  <Group justify="space-between" wrap="nowrap" mb="xs">
                    <Text fw={700} fz="lg">
                      {eventType.title}
                    </Text>
                    <Badge variant="light" c="gray.7" bg="gray.1" radius="sm" tt="none">
                      {formatDurationMinutes(eventType.durationMinutes)}
                    </Badge>
                  </Group>
                  <Text c="gray.7" fz="sm" mb="lg">
                    {eventType.description}
                  </Text>
                  <Stack gap="sm">
                    <Box p="sm" bg="gray.0" style={{ borderRadius: 8 }}>
                      <Text fz="xs" tt="uppercase" c="gray.6" mb={2}>
                        Выбранная дата
                      </Text>
                      <Text fz="sm" fw={600}>
                        {selectedDate ? formatDayLabel(selectedDate) : 'Дата не выбрана'}
                      </Text>
                    </Box>
                    <Box p="sm" bg="gray.0" style={{ borderRadius: 8 }}>
                      <Text fz="xs" tt="uppercase" c="gray.6" mb={2}>
                        Выбранное время
                      </Text>
                      <Text fz="sm" fw={600}>
                        {selectedSlot && selectedSlotEnd
                          ? formatSlotInterval(selectedSlot, selectedSlotEnd)
                          : 'Время не выбрано'}
                      </Text>
                    </Box>
                  </Stack>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 8, lg: 5 }}>
                <BookingCalendar
                  days={window.days}
                  selectedDate={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, lg: 4 }}>
                <SlotPanel
                  day={selectedDay}
                  selectedSlot={selectedSlot}
                  onSelectSlot={(start) => {
                    setSelectedSlot(start);
                    setSlotTakenNotice(false);
                  }}
                  onContinue={() => {
                    if (selectedSlot) setSearchParams({ startAt: selectedSlot });
                  }}
                />
              </Grid.Col>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
}
