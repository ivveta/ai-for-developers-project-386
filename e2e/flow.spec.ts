import { test, expect } from '@playwright/test';
import { resetDb, findFreeSlot } from './helpers';

test.describe('E2E-FLOW-01. Полный цикл: создание типа → бронирование → просмотр в админке', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('чистая система → создание типа → каталог → бронирование → админка', async ({ page }) => {
    await page.goto('/book');
    await expect(page.getByText('Пока нет типов событий')).toBeVisible();

    await page.goto('/admin/event-types/new');
    await page.getByLabel('Идентификатор').fill('demo');
    await page.getByLabel('Название').fill('Демо-встреча');
    await page.getByLabel('Описание').fill('Короткая демо-встреча');
    await page.getByLabel('Длительность').fill('20');
    await page.getByRole('button', { name: 'Создать' }).click();

    await expect(page).toHaveURL('/admin/event-types');
    await expect(page.getByText('demo')).toBeVisible();

    await page.goto('/book');
    await expect(page.getByText('Демо-встреча', { exact: true })).toBeVisible();
    await expect(page.getByText('20 мин')).toBeVisible();

    await page.getByRole('link', { name: /Демо-встреча/ }).click();
    await expect(page).toHaveURL('/book/demo');
    await expect(page.getByText('Календарь')).toBeVisible();

    const slot = await findFreeSlot('demo');
    const dayButton = page.locator('button[aria-pressed]').filter({ hasText: new RegExp(`^${slot.dayNumber}.*св\\.`) });
    await dayButton.click();

    await page.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await expect(page.getByText('Запись на встречу')).toBeVisible();
    await page.getByLabel('Имя').fill('Алексей');
    await page.getByLabel('Email').fill('alex@example.com');
    await page.getByRole('button', { name: 'Записаться' }).click();

    await expect(page).toHaveURL(/\/book\/demo\/success/);
    await expect(page.getByText('Запись подтверждена')).toBeVisible();
    await expect(page.getByText('Алексей')).toBeVisible();
    await expect(page.getByText('alex@example.com')).toBeVisible();

    await page.goto('/admin/bookings');
    await expect(page.getByText('Предстоящие встречи')).toBeVisible();
    await expect(page.getByText('Алексей')).toBeVisible();
    await expect(page.getByText('alex@example.com')).toBeVisible();
  });
});
