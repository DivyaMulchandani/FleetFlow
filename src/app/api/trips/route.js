import { z } from 'zod';
import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageTrips, assertCanReadTrips } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseDateRange, parsePagination, tripCreateSchema, tripStatusApiSchema } from '@/lib/validation';
import { getTripSchemaConfig, mapApiTripStatusToDb, normalizeTripRow } from '@/lib/trips-db';

export const runtime = 'nodejs';

const listQuerySchema = z.object({
  status: tripStatusApiSchema.optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

function generateTripCode() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TRP-${y}${m}${d}-${random}`;
}

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadTrips(role);

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { startDate, endDate } = parseDateRange(url.searchParams);
    const parsedFilters = listQuerySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      vehicle_id: url.searchParams.get('vehicle_id') ?? undefined,
      driver_id: url.searchParams.get('driver_id') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    });

    const schemaConfig = await getTripSchemaConfig();
    const filters = [];
    const values = [];

    if (parsedFilters.status) {
      values.push(await mapApiTripStatusToDb(parsedFilters.status));
      filters.push(`t.status = $${values.length}`);
    }
    if (parsedFilters.vehicle_id) {
      values.push(parsedFilters.vehicle_id);
      filters.push(`t.vehicle_id = $${values.length}`);
    }
    if (parsedFilters.driver_id) {
      values.push(parsedFilters.driver_id);
      filters.push(`t.driver_id = $${values.length}`);
    }
    if (startDate) {
      values.push(startDate);
      filters.push(`t.${schemaConfig.scheduledColumn} >= $${values.length}`);
    }
    if (endDate) {
      values.push(endDate);
      filters.push(`t.${schemaConfig.scheduledColumn} <= $${values.length}`);
    }
    if (parsedFilters.search) {
      values.push(`%${parsedFilters.search}%`);
      filters.push(`t.trip_code ILIKE $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM trips t
       ${whereClause}`,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listValues = [...values, limit, offset];
    const listResult = await query(
      `SELECT
         t.*
       FROM trips t
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues,
    );

    return successResponse(listResult.rows.map(normalizeTripRow), 200, {
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { userId, role } = await requireAuth(request);
    assertCanManageTrips(role);

    const body = await request.json();
    const parsedBody = tripCreateSchema.parse(body);
    const schemaConfig = await getTripSchemaConfig();
    const draftStatus = await mapApiTripStatusToDb('draft');

    const createdTrip = await withTransaction(async (client) => {
      const vehicleResult = await client.query(
        `SELECT id, status, max_capacity_kg, odometer_km
         FROM vehicles
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [parsedBody.vehicle_id],
      );
      const vehicle = vehicleResult.rows[0];
      if (!vehicle) {
        throw new ApiError(400, 'INVALID_VEHICLE', 'Vehicle not found.');
      }
      if (vehicle.status !== 'available') {
        throw new ApiError(400, 'VEHICLE_UNAVAILABLE', 'Vehicle must be available.');
      }
      if (Number(parsedBody.cargo_weight_kg) > Number(vehicle.max_capacity_kg)) {
        throw new ApiError(400, 'CAPACITY_EXCEEDED', 'Cargo exceeds vehicle capacity.');
      }

      const driverResult = await client.query(
        `SELECT id, status, license_expiry_date
         FROM drivers
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [parsedBody.driver_id],
      );
      const driver = driverResult.rows[0];
      if (!driver) {
        throw new ApiError(400, 'INVALID_DRIVER', 'Driver not found.');
      }
      if (driver.status !== 'available') {
        throw new ApiError(400, 'DRIVER_UNAVAILABLE', 'Driver must be available.');
      }
      if (new Date(driver.license_expiry_date) <= new Date()) {
        throw new ApiError(400, 'LICENSE_EXPIRED', 'Driver license is expired.');
      }

      const columns = ['trip_code', 'vehicle_id', 'driver_id', 'origin', 'destination', 'cargo_weight_kg', 'status', schemaConfig.scheduledColumn];
      const values = [
        parsedBody.trip_code ?? generateTripCode(),
        parsedBody.vehicle_id,
        parsedBody.driver_id,
        parsedBody.origin,
        parsedBody.destination,
        parsedBody.cargo_weight_kg,
        draftStatus,
        parsedBody.scheduled_date ?? new Date().toISOString(),
      ];

      if (schemaConfig.hasCreatedBy) {
        columns.push('created_by');
        values.push(userId);
      }
      if (schemaConfig.hasCargoDescription) {
        columns.push('cargo_description');
        values.push(parsedBody.cargo_description ?? null);
      } else if (schemaConfig.columns.has('notes') && parsedBody.cargo_description) {
        columns.push('notes');
        values.push(parsedBody.cargo_description);
      }
      if (schemaConfig.hasOdometerStart) {
        columns.push('odometer_start');
        values.push(parsedBody.odometer_start ?? vehicle.odometer_km);
      }
      if (Object.prototype.hasOwnProperty.call(parsedBody, 'revenue')) {
        columns.push('revenue');
        values.push(parsedBody.revenue);
      }

      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const insertResult = await client.query(
        `INSERT INTO trips (${columns.join(', ')})
         VALUES (${placeholders})
         RETURNING *`,
        values,
      );

      return insertResult.rows[0];
    });

    return successResponse(normalizeTripRow(createdTrip), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
