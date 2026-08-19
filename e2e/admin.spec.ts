import { test, expect } from '@playwright/test';
import { resetDb, seedDefaults, createBooking, findFreeSlot, tomorrowMsk, dayAfterTomorrowMsk } from './helpers';

test.describe('E2E-ADM-01. Админ-панель: хаб с переходами', () => {
  test('две карточки-ссылки с переходами', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Админ-панель')).toBeVisible();

    await expect(page.getByRole('link', { name: /Предстоящие встречи/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Новый тип события/ })).toBeVisible();

    await page.getByRole('link', { name: /Предстоящие встречи/ }).click();
    await expect(page).toHaveURL('/admin/bookings');

    await page.goto('/admin');
    await page.getByRole('link', { name: /Новый тип события/ }).click();
    await expect(page).toHaveURL('/admin/event-types/new');
  });
});

test.describe('E2E-ADM-02. Создание типа события', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('форма → заполнение → «Создать» → список → каталог', async ({ page }) => {
    await page.goto('/admin/event-types/new');
    await expect(page.getByText('Новый тип события')).toBeVisible();

    await page.getByLabel('Идентификатор').fill('intro-call');
    await page.getByLabel('Название').fill('Знакомство');
    await page.getByLabel('Описание').fill('Первый созвон, обсуждаем задачу');
    await page.getByLabel('Длительность').fill('30');
    await page.getByRole('button', { name: 'Создать' }).click();

    await expect(page).toHaveURL('/admin/event-types');
    await expect(page.getByText('Типы событий')).toBeVisible();
    await expect(page.getByText('intro-call')).toBeVisible();
    await expect(page.getByText('Знакомство')).toBeVisible();

    await page.goto('/book');
    await expect(page.getByText('Знакомство')).toBeVisible();
  });
});

test.describe('E2E-ADM-03. Дублирование id типа события (409)', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('дубль id → ошибка, форма не очищена', async ({ page }) => {
    await page.goto('/admin/event-types/new');

    await page.getByLabel('Идентификатор').fill('meeting-15');
    await page.getByLabel('Название').fill('Дубль');
    await page.getByLabel('Описание').fill('Описание');
    await page.getByLabel('Длительность').fill('15');
    await page.getByRole('button', { name: 'Создать' }).click();

    await expect(page.getByText('Тип события с таким идентификатором уже существует')).toBeVisible();
    await expect(page.getByLabel('Идентификатор')).toHaveValue('meeting-15');
    await expect(page.getByLabel('Название')).toHaveValue('Дубль');
  });
});

test.describe('E2E-ADM-04. Просмотр предстоящих встреч', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('список встреч: сортировка, данные', async ({ page }) => {
    // Слоты на разных днях (завтра и послезавтра): пересечение интервалов
    // запрещено глобально (Р7), а первый свободный слот сегодня — на границе
    // «сейчас» и может успеть стать прошлым к моменту отправки.
    const slot1 = await findFreeSlot('meeting-15', { date: tomorrowMsk() });
    const slot2 = await findFreeSlot('meeting-30', { date: dayAfterTomorrowMsk() });

    await createBooking({
      eventTypeId: 'meeting-15',
      startAt: slot1.startAt,
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
      notes: 'Хочу обсудить интеграцию',
    }).then((res) => expect(res.status).toBe(201));
    await createBooking({
      eventTypeId: 'meeting-30',
      startAt: slot2.startAt,
      guestName: 'Мария Иванова',
      guestEmail: 'maria@example.com',
    }).then((res) => expect(res.status).toBe(201));

    await page.goto('/admin/bookings');
    await expect(page.getByText('Предстоящие встречи')).toBeVisible();

    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(2);

    // Table columns: Дата | Начало | Конец | Длительность | Тип события | Имя гостя | Email | Заметка
    const firstRowCells = rows.nth(0).locator('td');
    await expect(firstRowCells.nth(5)).toHaveText('Иван Петров');
    await expect(firstRowCells.nth(6)).toHaveText('ivan@example.com');

    const secondRowCells = rows.nth(1).locator('td');
    await expect(secondRowCells.nth(5)).toHaveText('Мария Иванова');
  });
});

test.describe('E2E-ADM-05. Предстоящих встреч нет', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('сообщение «Предстоящих встреч нет»', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page.getByText('Предстоящих встреч нет')).toBeVisible();
  });
});
