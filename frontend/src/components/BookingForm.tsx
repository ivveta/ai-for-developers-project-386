import type { components } from '@calendar/api-contract';
import { Alert, Button, Card, Group, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useState } from 'react';

import { client } from '../api/client';
import { formatDayLabel, formatDurationMinutes, formatSlotInterval, formatTime } from '../lib/format';

type Booking = components['schemas']['Booking'];
type EventType = components['schemas']['EventType'];

// Поля формы названы как поля BookingCreate — ошибки 400 из error.details
// подставляются в форму без переименований (§7.10).
type FormValues = {
  guestName: string;
  guestEmail: string;
  notes: string;
};

// Локальная проверка по правилам и формулировкам §9.2 — до запроса к API.
// Серверная валидация остаётся источником истины (ответ 400 обрабатывается ниже),
// локальная даёт точные сообщения у фактически невалидных полей.
function validate(values: FormValues): Partial<FormValues> {
  const errors: Partial<FormValues> = {};
  if (!values.guestName.trim() || values.guestName.length > 100) {
    errors.guestName = 'Укажите имя, не длиннее 100 символов';
  }
  if (!values.guestEmail.trim()) {
    errors.guestEmail = 'Укажите email';
  } else if (values.guestEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.guestEmail)) {
    errors.guestEmail = 'Некорректный email';
  }
  if (values.notes.length > 1000) {
    errors.notes = 'Заметка не длиннее 1000 символов';
  }
  return errors;
}

// Форма записи §7.6 — шаг страницы /book/{eventTypeId} при наличии
// query-параметра startAt. Отдельного маршрута нет.
export function BookingForm({
  eventType,
  startAt,
  onBack,
  onSlotTaken,
  onBooked,
  onNotFound,
}: {
  eventType: EventType;
  startAt: string;
  onBack: () => void;
  onSlotTaken: () => void;
  onBooked: (booking: Booking) => void;
  onNotFound: () => void;
}) {
  const [values, setValues] = useState<FormValues>({ guestName: '', guestEmail: '', notes: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<FormValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Конец встречи — startAt + длительность типа события (И3).
  const endAt = new Date(new Date(startAt).getTime() + eventType.durationMinutes * 60_000).toISOString();
  // startAt сериализован со смещением +03:00 — первые 10 символов это календарная
  // дата в Europe/Moscow, её и форматируем.
  const dateLabel = formatDayLabel(startAt.slice(0, 10));

  const setValue = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  };

  const submit = async () => {
    const errors = validate(values);
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    const { data, error } = await client.POST('/api/bookings', {
      body: {
        eventTypeId: eventType.id,
        startAt,
        guestName: values.guestName,
        guestEmail: values.guestEmail,
        ...(values.notes.trim() ? { notes: values.notes } : {}),
      },
    });
    setSubmitting(false);

    if (data) {
      onBooked(data.data);
      return;
    }
    switch (error.error.code) {
      case 'validation_error': {
        const next: Partial<FormValues> = {};
        const other: string[] = [];
        for (const detail of error.error.details) {
          if (detail.field in values) {
            next[detail.field as keyof FormValues] = detail.message;
          } else {
            other.push(detail.message);
          }
        }
        setFieldErrors(next);
        setFormError(other.length > 0 ? other.join(' ') : null);
        return;
      }
      case 'slot_taken':
        onSlotTaken();
        return;
      case 'not_found':
        onNotFound();
        return;
      default:
        setFormError(error.error.message || 'Не удалось создать бронирование. Попробуйте ещё раз.');
    }
  };

  return (
    <Card withBorder radius="lg" p="xl" maw={560} mx="auto">
      <Title order={2} fz="xl" mb="md">
        Запись на встречу
      </Title>

      {/* Сводка §7.6 */}
      <Stack gap={4} mb="lg" p="md" bg="gray.0" style={{ borderRadius: 8 }}>
        <Text fz="sm">
          <Text span c="gray.6">Тип события: </Text>
          <Text span fw={600}>{eventType.title}</Text>
        </Text>
        <Text fz="sm">
          <Text span c="gray.6">Длительность: </Text>
          <Text span fw={600}>{formatDurationMinutes(eventType.durationMinutes)}</Text>
        </Text>
        <Text fz="sm">
          <Text span c="gray.6">Дата: </Text>
          <Text span fw={600}>{dateLabel}</Text>
        </Text>
        <Text fz="sm">
          <Text span c="gray.6">Время: </Text>
          <Text span fw={600}>{formatSlotInterval(startAt, endAt)}</Text>
        </Text>
      </Stack>

      {formError && (
        <Alert color="red" mb="md">
          {formError}
        </Alert>
      )}

      <Stack gap="md">
        <TextInput
          label="Имя"
          required
          value={values.guestName}
          onChange={setValue('guestName')}
          error={fieldErrors.guestName}
        />
        <TextInput
          label="Email"
          required
          type="email"
          value={values.guestEmail}
          onChange={setValue('guestEmail')}
          error={fieldErrors.guestEmail}
        />
        <Textarea
          label="Заметка"
          autosize
          minRows={3}
          value={values.notes}
          onChange={setValue('notes')}
          error={fieldErrors.notes}
        />
        <Group grow mt="sm">
          <Button variant="default" onClick={onBack} disabled={submitting}>
            Назад
          </Button>
          <Button color="#f06f04" onClick={() => void submit()} loading={submitting}>
            Записаться
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
