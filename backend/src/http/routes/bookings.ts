// Маршруты бронирований: POST /api/bookings, GET /api/bookings (§8.1).

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

import type { Clock } from '../../lib/clock.js';
import { createBooking, listBookings, type BookingInput } from '../../services/bookings.js';

export interface RouteDeps {
  pool: Pool;
  clock: Clock;
}

export async function bookingRoutes(app: FastifyInstance, opts: RouteDeps): Promise<void> {
  app.post<{ Body: BookingInput }>('/', async (request, reply) => {
    const created = await createBooking(opts.pool, opts.clock, request.body);
    return reply.status(201).send({ data: created });
  });

  app.get('/', async () => ({ data: await listBookings(opts.pool, opts.clock) }));
}
