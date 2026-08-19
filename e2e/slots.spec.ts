import { test, expect } from '@playwright/test';
import { resetDb, seedDefaults, findFreeSlot } from './helpers';

test.describe('E2E-SLOT-01. Календарь показывает окно записи 14 дней', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('даты окна кликабельны со счётчиками «N св.»', async ({ page }) => {
    await page.goto('/book/meeting-15');
    await expect(page.getByText('Календарь')).toBeVisible();

    const counterButtons = page.locator('button').filter({ hasText: /св\./ });
    const count = await counterButtons.count();
    expect(count).toBeGreaterThan(0);
    for (const btn of await counterButtons.all()) {
      await expect(btn).toBeEnabled();
    }
  });

  test('даты за пределами окна неактивны', async ({ page }) => {
    await page.goto('/book/meeting-15');
    await expect(page.getByText('Календарь')).toBeVisible();

    const disabledButtons = page.locator('button[disabled]').filter({ hasText: /^\d+$/ });
    const count = await disabledButtons.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('E2E-SLOT-02. Выбор слота и кнопка «Продолжить»', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('слот не выбран → «Продолжить» неактивна', async ({ page }) => {
    await page.goto('/book/meeting-15');
    await expect(page.getByText('Время не выбрано')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
  });

  test('выбор слота → «Продолжить» активна, показано время', async ({ page }) => {
    const slot = await findFreeSlot('meeting-15');

    await page.goto('/book/meeting-15');
    await expect(page.getByText('Календарь')).toBeVisible();

    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    const slotButton = page.getByRole('button', { name: new RegExp(`${slot.timeText} - `) });
    await expect(slotButton).toBeVisible();
    await slotButton.click();

    await expect(slotButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeEnabled();
  });

  test('нажатие «Продолжить» показывает форму записи', async ({ page }) => {
    const slot = await findFreeSlot('meeting-15');

    await page.goto('/book/meeting-15');
    await expect(page.getByText('Календарь')).toBeVisible();

    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    await page.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await expect(page.getByText('Запись на встречу')).toBeVisible();
    await expect(page.getByText('Тип события:')).toBeVisible();
    await expect(page.getByLabel('Имя')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});

test.describe('E2E-SLOT-03. Смена даты обновляет список слотов', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('выбор даты с слотами показывает слоты', async ({ page }) => {
    const slot = await findFreeSlot('meeting-15');

    await page.goto('/book/meeting-15');
    await expect(page.getByText('Календарь')).toBeVisible();

    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    const slots = page.locator('button').filter({ hasText: /Свободно/ });
    const count = await slots.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('E2E-SLOT-04. День без свободных слотов', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('все слоты заняты → «На этот день свободных слотов нет»', async ({ page, request }) => {
    const slot = await findFreeSlot('meeting-15');
    const date = slot.date;
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        const startAt = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+03:00`;
        await request.post('http://localhost:3000/api/bookings', {
          data: {
            eventTypeId: 'meeting-15',
            startAt,
            guestName: 'Test',
            guestEmail: 'test@example.com',
          },
        });
      }
    }

    await page.goto('/book/meeting-15');
    await expect(page.getByText('Календарь')).toBeVisible();

    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    await expect(page.getByText('На этот день свободных слотов нет')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeDisabled();
  });
});
