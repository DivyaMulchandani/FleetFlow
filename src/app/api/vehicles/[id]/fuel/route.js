import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadVehicles } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseDateRange, parsePagination, parseUuidParam } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadVehicles(role);

    const vehicleId = parseUuidParam(params.id);
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { startDate, endDate } = parseDateRange(url.searchParams);
    const offset = (page - 1) * limit;

    const vehicleResult = await query(
      `SELECT id
       FROM vehicles
       WHERE id = $1
       LIMIT 1`,
      [vehicleId],
    );
    if (vehicleResult.rows.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'Vehicle not found.');
    }

    const filters = ['vehicle_id = $1'];
    const values = [vehicleId];

    if (startDate) {
      values.push(startDate);
      filters.push(`fuel_date >= $${values.length}`);
    }
    if (endDate) {
      values.push(endDate);
      filters.push(`fuel_date <= $${values.length}`);
    }

    const whereClause = `WHERE ${filters.join(' AND ')}`;

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM fuel_logs
       ${whereClause}`,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listValues = [...values, limit, offset];
    const logsResult = await query(
      `SELECT
         id,
         trip_id,
         vehicle_id,
         fuel_date,
         liters,
         cost_per_liter,
         total_cost,
         fuel_station,
         odometer_km
       FROM fuel_logs
       ${whereClause}
       ORDER BY fuel_date DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues,
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
