import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadVehicles } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parsePagination, parseUuidParam } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadVehicles(role);

    const vehicleId = parseUuidParam(params.id);
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
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

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM maintenance_logs
       WHERE vehicle_id = $1`,
      [vehicleId],
    );
    const total = countResult.rows[0]?.total ?? 0;

    const logsResult = await query(
      `SELECT
         id,
         vehicle_id,
         service_type,
         description,
         vendor_name,
         cost,
         service_date,
         completed_date,
         odometer_at_service,
         next_service_km
       FROM maintenance_logs
       WHERE vehicle_id = $1
       ORDER BY service_date DESC
       LIMIT $2 OFFSET $3`,
      [vehicleId, limit, offset],
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
