-- Миграция 0001: схема «Календаря звонков» (§4 спецификации).
-- Ограничения переносят инварианты на уровень БД: И2 (длительность), И4 (порядок
-- меток времени), И5 (непересечение броней). Формат файла — sql-миграция
-- node-pg-migrate: применяется целиком в направлении up.

-- btree_gist нужен для EXCLUDE-ограничения по tstzrange (И5).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Тип события (§4.2): шаблон встречи, задаёт сетку слотов.
CREATE TABLE event_type (
  id               varchar(64)  NOT NULL,
  title            varchar(100) NOT NULL,
  description      varchar(500) NOT NULL,
  duration_minutes integer      NOT NULL,
  created_at       timestamptz  NOT NULL DEFAULT now(), -- метки времени — UTC (§4.6, Р5)

  -- И1: первичный ключ даёт и требуемый §4.6 уникальный индекс по id
  CONSTRAINT event_type_pkey PRIMARY KEY (id),
  -- Формат slug по §9.1: строчные латинские буквы, цифры и дефис, 1–64 символа
  CONSTRAINT event_type_id_format CHECK (id ~ '^[a-z0-9-]{1,64}$'),
  CONSTRAINT event_type_title_len CHECK (char_length(title) BETWEEN 1 AND 100),
  CONSTRAINT event_type_description_len CHECK (char_length(description) BETWEEN 1 AND 500),
  -- И2: длительность — целое число от 1 до 540 минут (Р1)
  CONSTRAINT event_type_duration_range CHECK (duration_minutes BETWEEN 1 AND 540)
);

-- Бронирование (§4.3): подтверждённая запись гостя на конкретный интервал.
CREATE TABLE booking (
  id            uuid         NOT NULL DEFAULT gen_random_uuid(),
  event_type_id varchar(64)  NOT NULL,
  start_at      timestamptz  NOT NULL,
  end_at        timestamptz  NOT NULL,
  guest_name    varchar(100) NOT NULL,
  guest_email   varchar(254) NOT NULL,
  notes         varchar(1000),                          -- необязательное поле (§4.3)
  created_at    timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT booking_pkey PRIMARY KEY (id),
  -- И8: ссылка на существующий тип события
  CONSTRAINT booking_event_type_fkey FOREIGN KEY (event_type_id) REFERENCES event_type (id),
  -- И4: начало строго раньше конца
  CONSTRAINT booking_time_order CHECK (start_at < end_at),
  CONSTRAINT booking_guest_name_len CHECK (char_length(guest_name) BETWEEN 1 AND 100),
  CONSTRAINT booking_guest_email_len CHECK (char_length(guest_email) BETWEEN 1 AND 254),
  CONSTRAINT booking_notes_len CHECK (notes IS NULL OR char_length(notes) <= 1000),
  -- И5: никакие две брони не пересекаются — глобально, независимо от типа события.
  -- Интервалы полуоткрытые '[)' (§5.3): смежные брони (09:00–09:15 и 09:15–09:30) совместимы.
  CONSTRAINT booking_no_overlap EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)
);

-- §4.6: индекс по start_at — для выборки слотов дня и списка предстоящих встреч (§7.9)
CREATE INDEX booking_start_at_idx ON booking (start_at);
