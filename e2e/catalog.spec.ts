import { test, expect } from '@playwright/test';
import { resetDb, seedDefaults } from './helpers';

test.describe('E2E-CAT-01. Каталог показывает все типы событий', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('две карточки: meeting-15 (15 мин) и meeting-30 (30 мин)', async ({ page }) => {
    await page.goto('/book');
    await expect(page.getByText('Выберите тип события')).toBeVisible();

    await expect(page.getByRole('link', { name: /Встреча 15 минут/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Встреча 30 минут/ })).toBeVisible();
    await expect(page.locator('.mantine-Badge-label', { hasText: '15 мин' })).toBeVisible();
    await expect(page.locator('.mantine-Badge-label', { hasText: '30 мин' })).toBeVisible();
  });

  test('нажатие на карточку meeting-15 открывает календарь', async ({ page }) => {
    await page.goto('/book');
    await page.getByRole('link', { name: /Встреча 15 минут/ }).click();
    await expect(page).toHaveURL('/book/meeting-15');
    await expect(page.getByText('Календарь')).toBeVisible();
    await expect(page.getByText('Статус слотов')).toBeVisible();
  });
});

test.describe('E2E-CAT-02. Каталог пуст, если типов событий нет', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('сообщение «Пока нет типов событий»', async ({ page }) => {
    await page.goto('/book');
    await expect(page.getByText('Пока нет типов событий')).toBeVisible();
  });
});
