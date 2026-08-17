import type { components } from '@calendar/api-contract';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Mock } from 'vitest';

import { client } from './api/client';
import { App } from './App';

// API-клиент мокаем (FRONTEND-PLAN шаг 4): даты окна строим «от сегодня»,
// потому что примеры в контракте — со статическими датами §8.5.
vi.mock('./api/client', () => ({
  client: { GET: vi.fn(), POST: vi.fn() },
}));

type EventType = components['schemas']['EventType'];
type WindowSlots = components['schemas']['WindowSlots'];

// Начальные данные §10.
const EVENT_TYPES: EventType[] = [
  {
    id: 'meeting-15',
    title: 'Встреча 15 минут',
    description: 'Короткий тип события для быстрого слота.',
    durationMinutes: 15,
    createdAt: '2026-03-01T12:00:00+03:00',
  },
  {
    id: 'meeting-30',
    title: 'Встреча 30 минут',
    description: 'Базовый тип события для бронирования.',
    durationMinutes: 30,
    createdAt: '2026-03-01T12:05:00+03:00',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Текущая дата в Europe/Moscow (Р5) в формате YYYY-MM-DD. */
function todayMsk(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
}

/** Окно слотов §8.5 «от сегодня»: ровно 14 дней, в каждом один свободный слот. */
function buildWindow(fromDate: string): WindowSlots {
  const startUtc = Date.parse(`${fromDate}T00:00:00Z`);
  return {
    eventTypeId: 'meeting-15',
    durationMinutes: 15,
    days: Array.from({ length: 14 }, (_, i) => {
      const date = new Date(startUtc + i * DAY_MS).toISOString().slice(0, 10);
      return {
        date,
        freeCount: 1,
        slots: [{ start: `${date}T10:00:00+03:00`, end: `${date}T10:15:00+03:00`, status: 'free' as const }],
      };
    }),
  };
}

const mockGet = client.GET as unknown as Mock;

/** Успешные ответы API; ответ слотов можно переопределить в конкретном тесте. */
function mockApi(slots?: { error: unknown; response: { status: number } }) {
  mockGet.mockImplementation(async (path: string) => {
    switch (path) {
      case '/api/event-types':
        return { data: { data: EVENT_TYPES }, response: { status: 200 } };
      case '/api/event-types/{id}/slots':
        return slots ?? { data: { data: buildWindow(todayMsk()) }, response: { status: 200 } };
      case '/api/bookings':
        return { data: { data: [] }, response: { status: 200 } };
      default:
        throw new Error(`Неожиданный GET ${path}`);
    }
  });
}

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockGet.mockReset();
  mockApi();
});

describe('F1: каталог с двумя типами', () => {
  it('у каждой карточки видны название, описание и бейдж длительности', async () => {
    renderAt('/book');
    expect(await screen.findByText('Выберите тип события')).toBeInTheDocument();
    for (const eventType of EVENT_TYPES) {
      expect(screen.getByText(eventType.title)).toBeInTheDocument();
      expect(screen.getByText(eventType.description)).toBeInTheDocument();
      expect(screen.getByText(`${eventType.durationMinutes} мин`)).toBeInTheDocument();
    }
  });
});

describe('F2: слот не выбран', () => {
  it('кнопка «Продолжить» неактивна, в блоке времени — «Время не выбрано»', async () => {
    renderAt('/book/meeting-15');
    expect(await screen.findByText('Время не выбрано')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
  });
});

describe('F3: календарь', () => {
  it('под датами окна — счётчик свободных слотов, даты вне окна неактивны', async () => {
    renderAt('/book/meeting-15');
    await screen.findByText('Статус слотов');

    const today = todayMsk();
    const daysThisMonth = buildWindow(today).days.filter((d) =>
      d.date.startsWith(today.slice(0, 7)),
    );

    // Кнопка дня со счётчиком выглядит как «141 св.» — число дня и счётчик под ним.
    // Таких кнопок ровно столько, сколько дней окна попало в показанный месяц.
    const counterButtons = screen
      .getAllByRole('button')
      .filter((b) => /\d св\./.test(b.textContent ?? ''));
    expect(counterButtons).toHaveLength(daysThisMonth.length);
    for (const button of counterButtons) {
      expect(button).toBeEnabled();
    }

    // Даты вне окна — кнопки с одним лишь числом дня, все неактивны
    // (навигация «←»/«→» сюда не попадает: у неё aria-label вместо числа).
    const disabledDayButtons = screen
      .getAllByRole('button')
      .filter((b) => /^\d+$/.test(b.textContent ?? '') && b.hasAttribute('disabled'));
    expect(disabledDayButtons.length).toBeGreaterThan(0);
  });
});

describe('F4: несуществующий eventTypeId', () => {
  it('показано «Тип события не найден» и ссылка в каталог', async () => {
    mockApi({
      error: { error: { code: 'not_found', message: 'Тип события не найден' } },
      response: { status: 404 },
    });
    renderAt('/book/unknown');
    expect(await screen.findByText('Тип события не найден')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Перейти в каталог' })).toHaveAttribute('href', '/book');
  });
});

describe('F5: шапка на любом экране', () => {
  it.each(['/', '/book', '/admin/bookings'])('%s: Calendar, «Записаться» и «Админка»', async (route) => {
    const { unmount } = renderAt(route);
    // Шапка — единственный <header> на странице; скоуп нужен, потому что
    // на главной есть свои «Calendar» и «Записаться» в контенте.
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Calendar' })).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: 'Записаться' })).toHaveAttribute('href', '/book');
    expect(within(header).getByRole('link', { name: 'Админка' })).toHaveAttribute('href', '/admin');
    unmount();
  });
});
