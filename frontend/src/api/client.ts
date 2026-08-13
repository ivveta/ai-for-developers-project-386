import createClient from 'openapi-fetch';
import type { paths } from '@calendar/api-contract';

// Base URL настраивается env-переменной VITE_API_URL (ТЗ: интерфейс работает
// с отдельно запущенным бэкендом). По умолчанию в dev — мок-сервер Prism.
const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4010';

export const client = createClient<paths>({ baseUrl });
