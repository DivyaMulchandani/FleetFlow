import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageTrips, assertCanReadTrips } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parsePagination, parseUuidParam, tripFuelCreateSchema } from '@/lib/validation';
import { getFuelColumns } from '@/lib/trips-db';

export const runtime = 'nodejs';

async function getTripWithVehicle(tripId) {
  const tripResult = await query(
    `SELECT id, vehicle_id, status
     FROM trips
     WHERE id = $1
     LIMIT 1`,
    [tripId],
  );
  return tripResult.rows[0] ?? null;
}

function roundTo2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getFuelSelectSchema(fuelColumns) {
  const fuelDateColumn = fuelColumns.has('fuel_date') ? 'fuel_date' : 'fueled_at';
  const fuelStationSelect = fuelColumns.has('fuel_station') ? 'fuel_station' : 'NULL::TEXT AS fuel_station';
  const odometerSelect = fuelColumns.has('odometer_km')
    ? 'odometer_km'
    : fuelColumns.has('odometer_at_fill')
      ? 'odometer_at_fill AS odometer_km'
      : 'NULL::NUMERIC AS odometer_km';

  return { fuelDateColumn, fuelStationSelect, odometerSelect };
}

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadTrips(role);

    const tripId = parseUuidParam(params.id);
    const trip = await getTripWithVehicle(tripId);
    if (!trip) {
      throw new ApiError(404, 'NOT_FOUND', 'Trip not found.');
    }

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const offset = (page - 1) * limit;
    const fuelColumns = await getFuelColumns();
    const { fuelDateColumn, fuelStationSelect, odometerSelect } = getFuelSelectSchema(fuelColumns);

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM fuel_logs
       WHERE trip_id = $1`,
      [tripId],
    );
    const total = countResult.rows[0]?.total ?? 0;

    const logsResult = await query(
      `SELECT
         id,
         trip_id,
         vehicle_id,
         ${fuelDateColumn} AS fuel_date,
         liters,
         cost_per_liter,
         total_cost,
         ${fuelStationSelect},
         ${odometerSelect}
       FROM fuel_logs
       WHERE trip_id = $1
       ORDER BY ${fuelDateColumn} DESC
       LIMIT $2 OFFSET $3`,
      [tripId, limit, offset],
    );

    return successResponse(logsResult.rows, 200, {
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

export async function POST(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageTrips(role);

    const tripId = parseUuidParam(params.id);
    const body = await request.json();
    const parsedBody = tripFuelCreateSchema.parse(body);
    const computedTotal = roundTo2(Number(parsedBody.liters) * Number(parsedBody.cost_per_liter));
    const totalCost = parsedBody.total_cost ?? computedTotal;

    if (Math.abs(Number(totalCost) - computedTotal) > 0.02) {
      throw new ApiError(400, 'INVALID_TOTAL_COST', 'total_cost must equal liters * cost_per_liter.');
    }

    const fuelColumns = await getFuelColumns();
    const fuelDateColumn = fuelColumns.has('fuel_date') ? 'fuel_date' : 'fueled_at';
    const hasFuelStation = fuelColumns.has('fuel_station');
    const odometerColumn = fuelColumns.has('odometer_km')
      ? 'odometer_km'
      : fuelColumns.has('odometer_at_fill')
        ? 'odometer_at_fill'
        : null;

    const createdLog = await withTransaction(async (client) => {
      const tripResult = await client.query(
        `SELECT id, vehicle_id
         FROM trips
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [tripId],
      );
      const trip = tripResult.rows[0];
      if (!trip) {
        throw new ApiError(404, 'NOT_FOUND', 'Trip not found.');
      }

      const columns = ['trip_id', 'vehicle_id', fuelDateColumn, 'liters', 'cost_per_liter', 'total_cost'];
      const values = [
        tripId,
        trip.vehicle_id,
        parsedBody.fuel_date ?? new Date().toISOString(),
        parsedBody.liters,
        parsedBody.cost_per_liter,
        totalCost,
      ];

      if (hasFuelStation) {
        columns.push('fuel_station');
        values.push(parsedBody.fuel_station ?? null);
      }
      if (odometerColumn && Object.prototype.hasOwnProperty.call(parsedBody, 'odometer_km')) {
        columns.push(odometerColumn);
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
      const fuelStationSelect = hasFuelStation ? 'fuel_station' : 'NULL::TEXT AS fuel_station';
      const odometerSelect = odometerColumn
        ? `${odometerColumn} AS odometer_km`
        : 'NULL::NUMERIC AS odometer_km';

      const selectResult = await client.query(
        `SELECT
           id,
           trip_id,
           vehicle_id,
           ${fuelDateColumn} AS fuel_date,
           liters,
           cost_per_liter,
           total_cost,
           ${fuelStationSelect},
           ${odometerSelect}
         FROM fuel_logs
         WHERE id = $1
         LIMIT 1`,
        [rowId],
      );

      return selectResult.rows[0];
    });

    return successResponse(createdLog, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
