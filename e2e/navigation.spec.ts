import { test, expect } from '@playwright/test';

test.describe('E2E-NAV-01. Шапка присутствует на всех экранах', () => {
  test('шапка с логотипом и навигацией на главной', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');
    await expect(header.getByText('Calendar')).toBeVisible();
    await expect(header.getByRole('link', { name: 'Записаться' })).toHaveAttribute('href', '/book');
    await expect(header.getByRole('link', { name: 'Админка' })).toHaveAttribute('href', '/admin');
  });

  test('переход по «Записаться» открывает /book, ссылка активна', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Записаться' }).click();
    await expect(page).toHaveURL('/book');
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Записаться' })).toHaveCSS('font-weight', '700');
  });

  test('переход по «Админка» открывает /admin, ссылка активна', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Админка' }).click();
    await expect(page).toHaveURL('/admin');
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Админка' })).toHaveCSS('font-weight', '700');
  });

  test('переход по логотипу Calendar возвращает на главную', async ({ page }) => {
    await page.goto('/book');
    await page.getByRole('banner').getByRole('link', { name: 'Calendar' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('E2E-NAV-02. Переходы между экранами по ссылкам', () => {
  test('главная → каталог → возврат', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Записаться' }).click();
    await expect(page).toHaveURL('/book');
    await expect(page.getByText('Выберите тип события')).toBeVisible();
  });
});
