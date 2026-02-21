import { withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageTrips } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam } from '@/lib/validation';
import { getTripSchemaConfig, mapApiTripStatusToDb, normalizeTripRow } from '@/lib/trips-db';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageTrips(role);

    const tripId = parseUuidParam(params.id);
    const schemaConfig = await getTripSchemaConfig();
    const draftStatus = await mapApiTripStatusToDb('draft');
    const dispatchedStatus = await mapApiTripStatusToDb('dispatched');

    const trip = await withTransaction(async (client) => {
      const tripResult = await client.query(
        `SELECT *
         FROM trips
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [tripId],
      );
      const currentTrip = tripResult.rows[0];
      if (!currentTrip) {
        throw new ApiError(404, 'NOT_FOUND', 'Trip not found.');
      }
      if (currentTrip.status !== draftStatus) {
        throw new ApiError(400, 'INVALID_STATE', 'Only draft trips can be dispatched.');
      }

      const vehicleResult = await client.query(
        `SELECT id, status, max_capacity_kg
         FROM vehicles
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [currentTrip.vehicle_id],
      );
      const vehicle = vehicleResult.rows[0];
      if (!vehicle || vehicle.status !== 'available') {
        throw new ApiError(400, 'VEHICLE_UNAVAILABLE', 'Vehicle must be available.');
      }
      if (Number(currentTrip.cargo_weight_kg) > Number(vehicle.max_capacity_kg)) {
        throw new ApiError(400, 'CAPACITY_EXCEEDED', 'Cargo exceeds vehicle capacity.');
      }

      const driverResult = await client.query(
        `SELECT id, status, license_expiry_date
         FROM drivers
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [currentTrip.driver_id],
      );
      const driver = driverResult.rows[0];
      if (!driver || driver.status !== 'available') {
        throw new ApiError(400, 'DRIVER_UNAVAILABLE', 'Driver must be available.');
      }
      if (new Date(driver.license_expiry_date) <= new Date()) {
        throw new ApiError(400, 'LICENSE_EXPIRED', 'Driver license is expired.');
      }

      const tripSetParts = ['status = $1', 'updated_at = NOW()'];
      const tripValues = [dispatchedStatus, tripId];

      if (schemaConfig.dispatchColumn) {
        tripSetParts.splice(1, 0, `${schemaConfig.dispatchColumn} = NOW()`);
      }

      const tripUpdate = await client.query(
        `UPDATE trips
         SET ${tripSetParts.join(', ')}
         WHERE id = $2
         RETURNING *`,
        tripValues,
      );

      const vehicleUpdate = await client.query(
        `UPDATE vehicles
         SET status = 'on_trip', updated_at = NOW()
         WHERE id = $1 AND status = 'available'`,
        [currentTrip.vehicle_id],
      );
      if (vehicleUpdate.rowCount !== 1) {
        throw new ApiError(409, 'VEHICLE_UNAVAILABLE', 'Vehicle is no longer available.');
      }

      const driverUpdate = await client.query(
        `UPDATE drivers
         SET status = 'on_trip', updated_at = NOW()
         WHERE id = $1 AND status = 'available'`,
        [currentTrip.driver_id],
      );
      if (driverUpdate.rowCount !== 1) {
        throw new ApiError(409, 'DRIVER_UNAVAILABLE', 'Driver is no longer available.');
      }

      return tripUpdate.rows[0];
    });

    return successResponse(normalizeTripRow(trip));
  } catch (error) {
    return handleApiError(error);
  }
}
