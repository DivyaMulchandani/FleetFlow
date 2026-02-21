import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertRole, ROLES } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { driverStatusUpdateSchema, parseUuidParam } from '@/lib/validation';
import { getDriversColumns } from '@/lib/drivers-db';

export const runtime = 'nodejs';

const ALLOWED_TARGET_STATUSES = new Set(['available', 'off_duty', 'suspended']);

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertRole(role, [ROLES.FLEET_MANAGER, ROLES.DISPATCHER]);

    const driverId = parseUuidParam(params.id);
    const body = await request.json();
    const { status: nextStatus } = driverStatusUpdateSchema.parse(body);

    if (!ALLOWED_TARGET_STATUSES.has(nextStatus)) {
      throw new ApiError(400, 'INVALID_STATUS', 'Invalid status for this endpoint.');
    }

    const driverColumns = await getDriversColumns();
    const hasLicenseCategory = driverColumns.has('license_category');
    const hasCreatedBy = driverColumns.has('created_by');
    const licenseCategorySelect = hasLicenseCategory ? 'license_category' : 'NULL::TEXT AS license_category';
    const createdBySelect = hasCreatedBy ? 'created_by' : 'NULL::UUID AS created_by';

    const driverResult = await query(
      `SELECT id, status
       FROM drivers
       WHERE id = $1
       LIMIT 1`,
      [driverId],
    );
    const driver = driverResult.rows[0];
    if (!driver) {
      throw new ApiError(404, 'NOT_FOUND', 'Driver not found.');
    }

    if (role === ROLES.DISPATCHER && nextStatus === 'suspended') {
      throw new ApiError(403, 'FORBIDDEN', 'Dispatcher cannot suspend drivers.');
    }

    if (driver.status === 'suspended' && nextStatus === 'available' && role !== ROLES.FLEET_MANAGER) {
      throw new ApiError(403, 'FORBIDDEN', 'Only fleet manager can reactivate suspended drivers.');
    }

    const updatedResult = await query(
      `UPDATE drivers
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING
         id,
         full_name,
         phone,
         license_number,
         ${licenseCategorySelect},
         license_expiry_date,
         safety_score,
         status,
         total_trips,
         completed_trips,
         ${createdBySelect},
         created_at,
         updated_at`,
      [nextStatus, driverId],
    );

    return successResponse(updatedResult.rows[0]);
  } catch (error) {
    return handleApiError(error);
  }
}
