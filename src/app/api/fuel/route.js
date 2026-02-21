import { z } from 'zod';
import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanCreateFuel, assertCanReadFuel } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { fuelCreateSchema, parseDateRange, parsePagination } from '@/lib/validation';
import { fuelSelectSql, getFuelSchemaConfig } from '@/lib/fuel-db';

export const runtime = 'nodejs';

const COST_TOLERANCE = 0.01;
const ODOMETER_TOLERANCE_KM = 500;

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertCostIntegrity(liters, costPerLiter, totalCost) {
  const expected = round2(Number(liters) * Number(costPerLiter));
  if (Math.abs(Number(totalCost) - expected) > COST_TOLERANCE) {
    throw new ApiError(400, 'INVALID_TOTAL_COST', 'total_cost must match liters * cost_per_liter.');
  }
}

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadFuel(role);

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { startDate, endDate } = parseDateRange(url.searchParams);
    const vehicleIdRaw = url.searchParams.get('vehicle_id');
    const tripIdRaw = url.searchParams.get('trip_id');
    const vehicleIdParsed = z.string().uuid().optional().safeParse(vehicleIdRaw ?? undefined);
    const tripIdParsed = z.string().uuid().optional().safeParse(tripIdRaw ?? undefined);
    if (!vehicleIdParsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid vehicle_id.');
    }
    if (!tripIdParsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid trip_id.');
    }

    const vehicleId = vehicleIdParsed.data;
    const tripId = tripIdParsed.data;
    const config = await getFuelSchemaConfig();
    const offset = (page - 1) * limit;

    const filters = [];
    const values = [];

    if (vehicleId) {
      values.push(vehicleId);
      filters.push(`f.vehicle_id = $${values.length}`);
    }
    if (tripId) {
      values.push(tripId);
      filters.push(`f.trip_id = $${values.length}`);
    }
    if (startDate) {
      values.push(startDate);
      filters.push(`f.${config.dateColumn} >= $${values.length}`);
    }
    if (endDate) {
      values.push(endDate);
      filters.push(`f.${config.dateColumn} <= $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM fuel_logs f
       ${whereClause}`,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listValues = [...values, limit, offset];
    const listResult = await query(
      `SELECT
         ${fuelSelectSql(config, 'f')},
         v.name AS vehicle_name,
         v.license_plate,
         v.status AS vehicle_status
       FROM fuel_logs f
       JOIN vehicles v ON v.id = f.vehicle_id
       ${whereClause}
       ORDER BY f.${config.dateColumn} DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues,
    );

    return successResponse(listResult.rows, 200, {
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
    assertCanCreateFuel(role);

    const body = await request.json();
    const parsedBody = fuelCreateSchema.parse(body);
    assertCostIntegrity(parsedBody.liters, parsedBody.cost_per_liter, parsedBody.total_cost);
    const config = await getFuelSchemaConfig();

    const createdFuel = await withTransaction(async (client) => {
      const vehicleResult = await client.query(
        `SELECT id, status, odometer_km
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
      if (vehicle.status === 'retired') {
        throw new ApiError(400, 'INVALID_VEHICLE_STATE', 'Cannot log fuel for retired vehicle.');
      }

      if (parsedBody.trip_id) {
        const tripResult = await client.query(
          `SELECT id, vehicle_id
           FROM trips
           WHERE id = $1
           LIMIT 1`,
          [parsedBody.trip_id],
        );
        const trip = tripResult.rows[0];
        if (!trip) {
          throw new ApiError(400, 'INVALID_TRIP', 'Trip not found.');
        }
        if (trip.vehicle_id !== parsedBody.vehicle_id) {
          throw new ApiError(400, 'TRIP_VEHICLE_MISMATCH', 'trip_id does not belong to vehicle_id.');
        }
      }

      if (Object.prototype.hasOwnProperty.call(parsedBody, 'odometer_km')) {
        const minAllowed = Number(vehicle.odometer_km) - ODOMETER_TOLERANCE_KM;
        if (Number(parsedBody.odometer_km) < minAllowed) {
          throw new ApiError(400, 'INVALID_ODOMETER', 'odometer_km is too far below vehicle odometer.');
        }
      }

      const columns = ['trip_id', 'vehicle_id', config.dateColumn, 'liters', 'cost_per_liter', 'total_cost'];
      const values = [
        parsedBody.trip_id ?? null,
        parsedBody.vehicle_id,
        parsedBody.fuel_date ?? new Date().toISOString(),
        parsedBody.liters,
        parsedBody.cost_per_liter,
        parsedBody.total_cost,
      ];

      if (config.loggedByColumn) {
        columns.push(config.loggedByColumn);
        values.push(userId);
      }
      if (config.stationColumn && Object.prototype.hasOwnProperty.call(parsedBody, 'fuel_station')) {
        columns.push(config.stationColumn);
        values.push(parsedBody.fuel_station ?? null);
      }
      if (config.odometerColumn && Object.prototype.hasOwnProperty.call(parsedBody, 'odometer_km')) {
        columns.push(config.odometerColumn);
        values.push(parsedBody.odometer_km);
      }

      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const insertResult = await client.query(
        `INSERT INTO fuel_logs (${columns.join(', ')})
         VALUES (${placeholders})
         RETURNING id`,
        values,
      );

      const rowId = insertResult.rows[0].id;
      const selectResult = await client.query(
        `SELECT
           ${fuelSelectSql(config, 'f')},
           v.name AS vehicle_name,
           v.license_plate,
           v.status AS vehicle_status
         FROM fuel_logs f
         JOIN vehicles v ON v.id = f.vehicle_id
         WHERE f.id = $1
         LIMIT 1`,
        [rowId],
      );

      return selectResult.rows[0];
    });

    return successResponse(createdFuel, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
