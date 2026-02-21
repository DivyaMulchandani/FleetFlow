import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanChangeVehicleStatus } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam, statusUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

const ALLOWED_TRANSITIONS = {
  available: new Set(['on_trip', 'in_shop']),
  on_trip: new Set(['available']),
  in_shop: new Set(['available']),
  retired: new Set([]),
};

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    const vehicleId = parseUuidParam(params.id);

    const body = await request.json();
    const { status: nextStatus } = statusUpdateSchema.parse(body);

    assertCanChangeVehicleStatus(role, nextStatus);

    const updatedVehicle = await withTransaction(async (client) => {
      const vehicleResult = await client.query(
        `SELECT
           id,
           name,
           model,
           license_plate,
           type,
           region,
           max_capacity_kg,
           odometer_km,
           acquisition_cost,
           status,
           created_by,
           created_at,
           updated_at
         FROM vehicles
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [vehicleId],
      );

      const vehicle = vehicleResult.rows[0];
      if (!vehicle) {
        throw new ApiError(404, 'NOT_FOUND', 'Vehicle not found.');
      }

      if (vehicle.status === nextStatus) {
        return vehicle;
      }

      if (nextStatus === 'retired') {
        // Retire transition is explicitly restricted to fleet managers by RBAC.
        if (role !== 'fleet_manager') {
          throw new ApiError(403, 'FORBIDDEN', 'Only fleet manager can retire vehicles.');
        }
      } else {
        const allowed = ALLOWED_TRANSITIONS[vehicle.status] ?? new Set();
        if (!allowed.has(nextStatus)) {
          throw new ApiError(400, 'INVALID_TRANSITION', 'Invalid status transition.');
        }
      }

      const updateResult = await client.query(
        `UPDATE vehicles
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING
           id,
           name,
           model,
           license_plate,
           type,
           region,
           max_capacity_kg,
           odometer_km,
           acquisition_cost,
           status,
           created_by,
           created_at,
           updated_at`,
        [nextStatus, vehicleId],
      );

      return updateResult.rows[0];
    });

    return successResponse(updatedVehicle);
  } catch (error) {
    return handleApiError(error);
  }
}
