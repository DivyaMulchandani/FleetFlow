import { withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageTrips } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam, tripCompleteSchema } from '@/lib/validation';
import { getTripSchemaConfig, mapApiTripStatusToDb, normalizeTripRow } from '@/lib/trips-db';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageTrips(role);

    const tripId = parseUuidParam(params.id);
    const body = await request.json();
    const parsedBody = tripCompleteSchema.parse(body);
    const schemaConfig = await getTripSchemaConfig();
    const dispatchedStatus = await mapApiTripStatusToDb('dispatched');
    const completedStatus = await mapApiTripStatusToDb('completed');

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
      if (currentTrip.status !== dispatchedStatus) {
        throw new ApiError(400, 'INVALID_STATE', 'Only dispatched trips can be completed.');
      }

      const vehicleResult = await client.query(
        `SELECT id, status, odometer_km
         FROM vehicles
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [currentTrip.vehicle_id],
      );
      const vehicle = vehicleResult.rows[0];
      if (!vehicle) {
        throw new ApiError(400, 'INVALID_VEHICLE', 'Vehicle not found.');
      }

      const driverResult = await client.query(
        `SELECT id, status
         FROM drivers
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [currentTrip.driver_id],
      );
      const driver = driverResult.rows[0];
      if (!driver) {
        throw new ApiError(400, 'INVALID_DRIVER', 'Driver not found.');
      }

      const odometerStart = schemaConfig.hasOdometerStart
        ? Number(currentTrip.odometer_start ?? vehicle.odometer_km)
        : Number(vehicle.odometer_km);
      const odometerEnd = Number(parsedBody.odometer_end);

      if (!(odometerEnd > odometerStart)) {
        throw new ApiError(400, 'INVALID_ODOMETER', 'odometer_end must be greater than odometer_start.');
      }

      const tripSets = ['status = $1', 'updated_at = NOW()'];
      const tripValues = [completedStatus];

      if (schemaConfig.completeColumn) {
        tripSets.push(`${schemaConfig.completeColumn} = NOW()`);
      }
      if (schemaConfig.hasOdometerEnd) {
        tripValues.push(odometerEnd);
        tripSets.push(`odometer_end = $${tripValues.length}`);
      }
      if (Object.prototype.hasOwnProperty.call(parsedBody, 'revenue')) {
        tripValues.push(parsedBody.revenue);
        tripSets.push(`revenue = $${tripValues.length}`);
      }

      tripValues.push(tripId);
      const tripUpdate = await client.query(
        `UPDATE trips
         SET ${tripSets.join(', ')}
         WHERE id = $${tripValues.length}
         RETURNING *`,
        tripValues,
      );

      await client.query(
        `UPDATE vehicles
         SET status = 'available',
             odometer_km = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [odometerEnd, currentTrip.vehicle_id],
      );

      await client.query(
        `UPDATE drivers
         SET status = 'available',
             total_trips = total_trips + 1,
             completed_trips = completed_trips + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [currentTrip.driver_id],
      );

      return tripUpdate.rows[0];
    });

    return successResponse(normalizeTripRow(trip));
  } catch (error) {
    return handleApiError(error);
  }
}
