import { test, expect } from '@playwright/test';
import { resetDb, seedDefaults, findFreeSlot } from './helpers';

test.describe('E2E-ERR-01. Слот занят при отправке формы (409 slot_taken)', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('две вкладки: вторая бронирует слот → первая получает 409', async ({ browser }) => {
    const slot = await findFreeSlot('meeting-15');
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto('/book/meeting-15');
    const dayButtonA = pageA.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButtonA.click();
    await pageA.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await pageA.getByRole('button', { name: 'Продолжить' }).click();
    await pageA.getByLabel('Имя').fill('Иван Петров');
    await pageA.getByLabel('Email').fill('ivan@example.com');

    await pageB.goto('/book/meeting-15');
    const dayButtonB = pageB.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButtonB.click();
    await pageB.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await pageB.getByRole('button', { name: 'Продолжить' }).click();
    await pageB.getByLabel('Имя').fill('Другой Гость');
    await pageB.getByLabel('Email').fill('other@example.com');
    await pageB.getByRole('button', { name: 'Записаться' }).click();
    await expect(pageB).toHaveURL(/\/book\/meeting-15\/success/);

    await pageA.getByRole('button', { name: 'Записаться' }).click();
    await expect(
      pageA.getByText('Этот слот только что заняли. Выберите другое время'),
    ).toBeVisible();
    await expect(pageA.getByText('Статус слотов')).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});

test.describe('E2E-ERR-02. Валидация формы: пустое имя', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('пустое имя → ошибка, бронь не создана', async ({ page }) => {
    const slot = await findFreeSlot('meeting-15');

    await page.goto('/book/meeting-15');
    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    await page.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Записаться' }).click();

    await expect(page.getByText('Укажите имя, не длиннее 100 символов')).toBeVisible();
    await expect(page.getByText('Запись на встречу')).toBeVisible();
  });
});

test.describe('E2E-ERR-03. Валидация формы: некорректный email', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('ivan вместо email → ошибка', async ({ page }) => {
    const slot = await findFreeSlot('meeting-15');

    await page.goto('/book/meeting-15');
    const dayButton = page.getByRole('button', { name: new RegExp(`^${slot.dayNumber}\\s`) });
    await dayButton.click();

    await page.getByRole('button', { name: new RegExp(`${slot.timeText} - `) }).click();
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await page.getByLabel('Имя').fill('Тест');
    await page.getByLabel('Email').fill('ivan');
    await page.getByRole('button', { name: 'Записаться' }).click();

    await expect(page.getByText('Некорректный email')).toBeVisible();
    await expect(page.getByText('Запись на встречу')).toBeVisible();
  });
});

test.describe('E2E-ERR-04. Попытка бронирования прошедшего времени', () => {
  test.beforeEach(async () => {
    await resetDb();
    await seedDefaults();
  });

  test('startAt в прошлом через URL → показывается форма (параметр валиден)', async ({ page }) => {
    await page.goto('/book/meeting-15?startAt=2020-01-01T10:00:00%2B03:00');
    await expect(page.getByText('Запись на встречу')).toBeVisible();
  });
});

test.describe('E2E-ERR-05. Несуществующий eventTypeId (404)', () => {
  test('сообщение «Тип события не найден» и ссылка в каталог', async ({ page }) => {
    await page.goto('/book/nonexistent-type');
    await expect(page.getByText('Тип события не найден')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Перейти в каталог' })).toHaveAttribute('href', '/book');
  });
});
