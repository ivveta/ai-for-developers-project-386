// Маршруты типов событий: GET /api/event-types, POST /api/event-types,
// GET /api/event-types/:id/slots (§8.1).

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import type { Clock } from '../../lib/clock.js';
import {
  createEventType,
  listEventTypes,
  type EventTypeInput,
} from '../../services/event-types.js';
import { getWindowSlots } from '../../services/bookings.js';

export interface RouteDeps {
  pool: Pool;
  clock: Clock;
}

export async function eventTypeRoutes(app: FastifyInstance, opts: RouteDeps): Promise<void> {
  app.get('/', async () => ({ data: await listEventTypes(opts.pool) }));

  app.post<{ Body: EventTypeInput }>('/', async (request, reply) => {
    const created = await createEventType(opts.pool, request.body);
    return reply.status(201).send({ data: created });
  });

  app.get<{ Params: { id: string } }>('/:id/slots', async (request) => ({
    data: await getWindowSlots(opts.pool, opts.clock, request.params.id),
  }));
}
