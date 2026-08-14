import type { components } from '@calendar/api-contract';
import { Box, Button, Card, Container, Stack, Text, Title } from '@mantine/core';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

import { formatDayLabel, formatDurationMinutes, formatSlotInterval } from '../lib/format';

type Booking = components['schemas']['Booking'];

// Бронь, сохранённая при создании (см. BookEventType): переживает перезагрузку
// страницы, чего location.state не умеет.
function readStoredBooking(eventTypeId: string): Booking | null {
  try {
    const raw = sessionStorage.getItem(`booking-success:${eventTypeId}`);
    return raw ? (JSON.parse(raw) as Booking) : null;
  } catch {
    return null;
  }
}

// Экран успеха `/book/{eventTypeId}/success` (§7.7): подтверждение с деталями
// брони и ссылка на каталог для новой записи. Данные брони приходят через
// location.state со шага формы, после перезагрузки — из sessionStorage;
// эндпоинта для одной брони в API нет, поэтому заход без данных отправляет
// в каталог.
export function BookSuccess() {
  const { eventTypeId = '' } = useParams();
  const stateBooking = (useLocation().state as { booking?: Booking } | null)?.booking;
  const booking = stateBooking ?? readStoredBooking(eventTypeId);

  if (!booking) {
    return <Navigate to="/book" replace />;
  }

  return (
    <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <Container size="lg" py={40}>
        <Card withBorder radius="lg" p="xl" maw={560} mx="auto">
          <Title order={1} fz="xl" mb="md">
            Запись подтверждена
          </Title>

          <Stack gap={4} mb="lg" p="md" bg="gray.0" style={{ borderRadius: 8 }}>
            <Text fz="sm">
              <Text span c="gray.6">Тип события: </Text>
              <Text span fw={600}>{booking.eventType.title}</Text>
            </Text>
            <Text fz="sm">
              <Text span c="gray.6">Дата: </Text>
              <Text span fw={600}>{formatDayLabel(booking.startAt.slice(0, 10))}</Text>
            </Text>
            <Text fz="sm">
              <Text span c="gray.6">Время: </Text>
              <Text span fw={600}>{formatSlotInterval(booking.startAt, booking.endAt)}</Text>
            </Text>
            <Text fz="sm">
              <Text span c="gray.6">Длительность: </Text>
              <Text span fw={600}>{formatDurationMinutes(booking.eventType.durationMinutes)}</Text>
            </Text>
            <Text fz="sm">
              <Text span c="gray.6">Имя: </Text>
              <Text span fw={600}>{booking.guestName}</Text>
            </Text>
            <Text fz="sm">
              <Text span c="gray.6">Email: </Text>
              <Text span fw={600}>{booking.guestEmail}</Text>
            </Text>
            {booking.notes && (
              <Text fz="sm">
                <Text span c="gray.6">Заметка: </Text>
                <Text span fw={600}>{booking.notes}</Text>
              </Text>
            )}
          </Stack>

          <Button component={Link} to="/book" color="#f06f04">
            Записаться ещё
          </Button>
        </Card>
      </Container>
    </Box>
  );
}
