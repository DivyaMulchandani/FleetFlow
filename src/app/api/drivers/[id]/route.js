import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadDrivers, assertFleetManager } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam, updateDriverSchema } from '@/lib/validation';
import { getDriversColumns } from '@/lib/drivers-db';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadDrivers(role);

    const driverId = parseUuidParam(params.id);
    const driverColumns = await getDriversColumns();
    const hasLicenseCategory = driverColumns.has('license_category');
    const hasCreatedBy = driverColumns.has('created_by');

    const licenseCategorySelect = hasLicenseCategory ? 'd.license_category' : 'NULL::TEXT AS license_category';
    const createdBySelect = hasCreatedBy ? 'd.created_by' : 'NULL::UUID AS created_by';

    const driverResult = await query(
      `SELECT
         d.id,
         d.full_name,
         d.phone,
         d.license_number,
         ${licenseCategorySelect},
         d.license_expiry_date,
         d.safety_score,
         d.status,
         d.total_trips,
         d.completed_trips,
         ${createdBySelect},
         d.created_at,
         d.updated_at,
         ROUND(
           (d.completed_trips::NUMERIC / NULLIF(d.total_trips, 0)),
           4
         ) AS completion_rate
       FROM drivers d
       WHERE d.id = $1
       LIMIT 1`,
      [driverId],
    );

    const driver = driverResult.rows[0];
    if (!driver) {
      throw new ApiError(404, 'NOT_FOUND', 'Driver not found.');
    }

    return successResponse(driver);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const driverId = parseUuidParam(params.id);
    const body = await request.json();

    if (
      Object.prototype.hasOwnProperty.call(body, 'safety_score') ||
      Object.prototype.hasOwnProperty.call(body, 'total_trips') ||
      Object.prototype.hasOwnProperty.call(body, 'completed_trips')
    ) {
      throw new ApiError(400, 'INVALID_UPDATE', 'safety_score and trip counters cannot be updated directly.');
    }

    const parsedBody = updateDriverSchema.parse(body);
    const driverColumns = await getDriversColumns();
    const hasLicenseCategory = driverColumns.has('license_category');
    const hasCreatedBy = driverColumns.has('created_by');

    const fieldMap = {
      full_name: 'full_name',
      phone: 'phone',
      license_number: 'license_number',
      license_expiry_date: 'license_expiry_date',
    };
    if (hasLicenseCategory) {
      fieldMap.license_category = 'license_category';
    }

    const sets = [];
    const values = [];
    for (const [field, column] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(parsedBody, field)) {
        values.push(parsedBody[field]);
        sets.push(`${column} = $${values.length}`);
      }
    }

    values.push(driverId);
    const licenseCategorySelect = hasLicenseCategory ? 'license_category' : 'NULL::TEXT AS license_category';
    const createdBySelect = hasCreatedBy ? 'created_by' : 'NULL::UUID AS created_by';

    const updatedResult = await query(
      `UPDATE drivers
       SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
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
      values,
    );

    const updatedDriver = updatedResult.rows[0];
    if (!updatedDriver) {
      throw new ApiError(404, 'NOT_FOUND', 'Driver not found.');
    }

    return successResponse(updatedDriver);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const driverId = parseUuidParam(params.id);
    const driverColumns = await getDriversColumns();
    const hasLicenseCategory = driverColumns.has('license_category');
    const hasCreatedBy = driverColumns.has('created_by');
    const licenseCategorySelect = hasLicenseCategory ? 'license_category' : 'NULL::TEXT AS license_category';
    const createdBySelect = hasCreatedBy ? 'created_by' : 'NULL::UUID AS created_by';

    const deletedResult = await query(
      `UPDATE drivers
       SET status = 'suspended', updated_at = NOW()
       WHERE id = $1
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
      [driverId],
    );

    const deletedDriver = deletedResult.rows[0];
    if (!deletedDriver) {
      throw new ApiError(404, 'NOT_FOUND', 'Driver not found.');
    }

    return successResponse(deletedDriver);
  } catch (error) {
    return handleApiError(error);
  }
}
