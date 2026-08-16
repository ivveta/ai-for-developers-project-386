// Fastify-приложение: CORS для dev (STRUCTURE-PLAN, решение 8), маршруты §8.1,
// маппинг доменных ошибок в формат §8.8. Clock внедряется — в тестах fixedClock.

import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import {
  DomainError,
  EventTypeIdTaken,
  NotFound,
  OutOfWindow,
  SlotTaken,
  ValidationError,
} from '../domain/errors.js';
import { systemClock, type Clock } from '../lib/clock.js';
import { bookingRoutes } from './routes/bookings.js';
import { eventTypeRoutes } from './routes/event-types.js';

export interface BuildAppOptions {
  pool: Pool;
  clock?: Clock;
}

export function buildApp({ pool, clock = systemClock }: BuildAppOptions): FastifyInstance {
  const app = Fastify();

  void app.register(cors, { origin: true });
  void app.register(eventTypeRoutes, { prefix: '/api/event-types', pool, clock });
  void app.register(bookingRoutes, { prefix: '/api/bookings', pool, clock });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ValidationError) {
      return reply.status(400).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }
    if (error instanceof NotFound) {
      return reply.status(404).send({ error: { code: error.code, message: error.message } });
    }
    if (error instanceof EventTypeIdTaken || error instanceof SlotTaken) {
      return reply.status(409).send({ error: { code: error.code, message: error.message } });
    }
    if (error instanceof OutOfWindow) {
      return reply.status(422).send({ error: { code: error.code, message: error.message } });
    }
    if (error instanceof DomainError) {
      return reply.status(500).send({ error: { code: 'internal_error', message: error.message } });
    }
    reply.log.error(error);
    return reply.status(500).send({
      error: { code: 'internal_error', message: 'Внутренняя ошибка сервера' },
    });
  });

  return app;
}
