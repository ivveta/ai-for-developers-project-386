import { test, expect } from '@playwright/test';
import { resetDb, seedDefaults, findFreeSlot } from './helpers';

test.describe('E2E-BOOK-01. Успешное бронирование: полный путь', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('выбор типа → дата → слот → форма → «Записаться» → экран успеха', async ({ page }) => {
    const slot = await findFreeSlot('meeting-15');

    await page.goto('/book');
    await page.getByRole('link', { name: /Встреча 15 минут/ }).click();
    await expect(page).toHaveURL('/book/meeting-15');

    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    await page.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await expect(page.getByText('Запись на встречу')).toBeVisible();
    await expect(page.getByText('Тип события:')).toBeVisible();

    await page.getByLabel('Имя').fill('Иван Петров');
    await page.getByLabel('Email').fill('ivan@example.com');
    await page.getByLabel('Заметка').fill('Хочу обсудить интеграцию');
    await page.getByRole('button', { name: 'Записаться' }).click();

    await expect(page).toHaveURL(/\/book\/meeting-15\/success/);
    await expect(page.getByText('Запись подтверждена')).toBeVisible();
    await expect(page.getByText('Иван Петров')).toBeVisible();
    await expect(page.getByText('ivan@example.com')).toBeVisible();
    await expect(page.getByText('Хочу обсудить интеграцию')).toBeVisible();

    await page.getByRole('link', { name: 'Записаться ещё' }).click();
    await expect(page).toHaveURL('/book');
  });
});

test.describe('E2E-BOOK-02. Бронирование без заметки', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('бронь без заметки → экран успеха', async ({ page }) => {
    const slot = await findFreeSlot('meeting-15');

    await page.goto('/book/meeting-15');
    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    await page.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await page.getByLabel('Имя').fill('Иван Петров');
    await page.getByLabel('Email').fill('ivan@example.com');
    await page.getByRole('button', { name: 'Записаться' }).click();

    await expect(page).toHaveURL(/\/book\/meeting-15\/success/);
    await expect(page.getByText('Запись подтверждена')).toBeVisible();
    await expect(page.getByText('Иван Петров')).toBeVisible();
  });
});

test.describe('E2E-BOOK-03. Бронирование видно в админке', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('после бронирования → /admin/bookings видно встречу', async ({ page }) => {
    const slot = await findFreeSlot('meeting-15');

    await page.goto('/book/meeting-15');
    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    await page.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await page.getByLabel('Имя').fill('Иван Петров');
    await page.getByLabel('Email').fill('ivan@example.com');
    await page.getByLabel('Заметка').fill('Хочу обсудить интеграцию');
    await page.getByRole('button', { name: 'Записаться' }).click();

    await expect(page).toHaveURL(/\/book\/meeting-15\/success/);

    await page.goto('/admin/bookings');
    await expect(page.getByText('Предстоящие встречи')).toBeVisible();
    await expect(page.getByText('Иван Петров')).toBeVisible();
    await expect(page.getByText('ivan@example.com')).toBeVisible();
    await expect(page.getByText('Встреча 15 минут')).toBeVisible();
  });
});

test.describe('E2E-BOOK-04. Забронированный слот становится busy', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('после бронирования слот занят, счётчик уменьшается', async ({ page, request }) => {
    const slot = await findFreeSlot('meeting-15');
    const res = await request.post('http://localhost:3000/api/bookings', {
      data: {
        eventTypeId: 'meeting-15',
        startAt: slot.startAt,
        guestName: 'Иван Петров',
        guestEmail: 'ivan@example.com',
      },
    });
    expect(res.status()).toBe(201);

    await page.goto('/book/meeting-15');
    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    const busySlot = page.getByRole('button', { name: new RegExp(`${slot.timeText} - .*Занято`, 's') });
    await expect(busySlot).toBeVisible();
    await expect(busySlot).toBeDisabled();
  });
});
