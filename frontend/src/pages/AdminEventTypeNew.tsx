import { Alert, Box, Button, Card, Container, Group, NumberInput, Stack, Textarea, TextInput, Title } from '@mantine/core';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { client } from '../api/client';

// Поля формы названы как поля EventTypeCreate — ошибки 400 из error.details
// подставляются в форму без переименований (§7.10).
type FormValues = {
  id: string;
  title: string;
  description: string;
  durationMinutes: string;
};

// Локальная проверка по правилам и формулировкам §9.1 — до запроса к API.
// Серверная валидация остаётся источником истины (ответ 400 обрабатывается ниже),
// локальная даёт точные сообщения у фактически невалидных полей.
function validate(values: FormValues): Partial<FormValues> {
  const errors: Partial<FormValues> = {};
  if (!values.id) {
    errors.id = 'Укажите идентификатор';
  } else if (!/^[a-z0-9-]{1,64}$/.test(values.id)) {
    errors.id = 'Только строчные латинские буквы, цифры и дефис, до 64 символов';
  }
  if (!values.title.trim() || values.title.length > 100) {
    errors.title = 'Укажите название, не длиннее 100 символов';
  }
  if (!values.description.trim() || values.description.length > 500) {
    errors.description = 'Укажите описание, не длиннее 500 символов';
  }
  if (values.durationMinutes === '') {
    errors.durationMinutes = 'Укажите длительность';
  } else if (!/^\d+$/.test(values.durationMinutes) || Number(values.durationMinutes) < 1 || Number(values.durationMinutes) > 540) {
    errors.durationMinutes = 'Длительность — целое число от 1 до 540 минут';
  }
  return errors;
}

// Админка: создание типа события `/admin/event-types/new` (§7.8).
export function AdminEventTypeNew() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>({ id: '', title: '', description: '', durationMinutes: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<FormValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setValue = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  };

  const setDuration = (value: string | number) => {
    setValues((v) => ({ ...v, durationMinutes: String(value) }));
    setFieldErrors((errors) => ({ ...errors, durationMinutes: undefined }));
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
    const { data, error } = await client.POST('/api/event-types', {
      body: {
        id: values.id,
        title: values.title,
        description: values.description,
        durationMinutes: Number(values.durationMinutes),
      },
    });
    setSubmitting(false);

    if (data) {
      navigate('/admin/event-types');
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
      case 'event_type_id_taken':
        // §9.1: «Тип события с таким идентификатором уже существует».
        setFieldErrors({ id: error.error.message });
        return;
      default:
        // Коды ошибок POST /api/event-types (§8.3) исчерпаны ветками выше — сюда не доходим.
        setFormError('Не удалось создать тип события. Попробуйте ещё раз.');
    }
  };

  return (
    <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <Container size="lg" py={40}>
        <Card withBorder radius="lg" p="xl" maw={560} mx="auto">
          <Title order={1} fz="xl" mb="md">
            Новый тип события
          </Title>

          {formError && (
            <Alert color="red" mb="md">
              {formError}
            </Alert>
          )}

          <Stack gap="md">
            <TextInput
              label="Идентификатор"
              description="Строчные латинские буквы, цифры и дефис, до 64 символов"
              required
              value={values.id}
              onChange={setValue('id')}
              error={fieldErrors.id}
            />
            <TextInput
              label="Название"
              required
              value={values.title}
              onChange={setValue('title')}
              error={fieldErrors.title}
            />
            <Textarea
              label="Описание"
              required
              autosize
              minRows={3}
              value={values.description}
              onChange={setValue('description')}
              error={fieldErrors.description}
            />
            <NumberInput
              label="Длительность"
              description="Целое число минут от 1 до 540"
              required
              min={1}
              max={540}
              value={values.durationMinutes}
              onChange={setDuration}
              error={fieldErrors.durationMinutes}
            />
            <Group grow mt="sm">
              <Button variant="default" component={Link} to="/admin/event-types" disabled={submitting}>
                Отмена
              </Button>
              <Button color="#f06f04" onClick={() => void submit()} loading={submitting}>
                Создать
              </Button>
            </Group>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
}
