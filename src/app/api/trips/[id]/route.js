import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageTrips, assertCanReadTrips } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam, tripUpdateSchema } from '@/lib/validation';
import { getTripSchemaConfig, mapApiTripStatusToDb, normalizeTripRow } from '@/lib/trips-db';

export const runtime = 'nodejs';

async function getTripById(id) {
  return query(
    `SELECT
       t.*,
       v.name AS vehicle_name,
       d.full_name AS driver_name
     FROM trips t
     LEFT JOIN vehicles v ON v.id = t.vehicle_id
     LEFT JOIN drivers d ON d.id = t.driver_id
     WHERE t.id = $1
     LIMIT 1`,
    [id],
  );
}

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadTrips(role);

    const tripId = parseUuidParam(params.id);
    const tripResult = await getTripById(tripId);
    const trip = tripResult.rows[0];
    if (!trip) {
      throw new ApiError(404, 'NOT_FOUND', 'Trip not found.');
    }

    return successResponse(normalizeTripRow(trip));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageTrips(role);

    const tripId = parseUuidParam(params.id);
    const body = await request.json();
    const parsedBody = tripUpdateSchema.parse(body);
    const schemaConfig = await getTripSchemaConfig();
    const draftStatus = await mapApiTripStatusToDb('draft');

    const updatedTrip = await withTransaction(async (client) => {
      const tripResult = await client.query(
        `SELECT *
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
      if (trip.status !== draftStatus) {
        throw new ApiError(400, 'INVALID_STATE', 'Only draft trips can be edited.');
      }

      const nextVehicleId = parsedBody.vehicle_id ?? trip.vehicle_id;
      const nextDriverId = parsedBody.driver_id ?? trip.driver_id;
      const nextCargoWeight = parsedBody.cargo_weight_kg ?? trip.cargo_weight_kg;

      const vehicleResult = await client.query(
        `SELECT id, status, max_capacity_kg
         FROM vehicles
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [nextVehicleId],
      );
      const vehicle = vehicleResult.rows[0];
      if (!vehicle) {
        throw new ApiError(400, 'INVALID_VEHICLE', 'Vehicle not found.');
      }
      if (vehicle.status !== 'available') {
        throw new ApiError(400, 'VEHICLE_UNAVAILABLE', 'Vehicle must be available.');
      }
      if (Number(nextCargoWeight) > Number(vehicle.max_capacity_kg)) {
        throw new ApiError(400, 'CAPACITY_EXCEEDED', 'Cargo exceeds vehicle capacity.');
      }

      const driverResult = await client.query(
        `SELECT id, status, license_expiry_date
         FROM drivers
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [nextDriverId],
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

      const fieldMap = {
        trip_code: 'trip_code',
        vehicle_id: 'vehicle_id',
        driver_id: 'driver_id',
        origin: 'origin',
        destination: 'destination',
        cargo_weight_kg: 'cargo_weight_kg',
        revenue: 'revenue',
      };

      if (schemaConfig.hasCargoDescription) {
        fieldMap.cargo_description = 'cargo_description';
      } else if (schemaConfig.columns.has('notes')) {
        fieldMap.cargo_description = 'notes';
      }
      if (schemaConfig.hasOdometerStart) {
        fieldMap.odometer_start = 'odometer_start';
      }
      fieldMap.scheduled_date = schemaConfig.scheduledColumn;

      const sets = [];
      const values = [];
      for (const [inputField, dbColumn] of Object.entries(fieldMap)) {
        if (Object.prototype.hasOwnProperty.call(parsedBody, inputField)) {
          values.push(parsedBody[inputField]);
          sets.push(`${dbColumn} = $${values.length}`);
        }
      }

      if (sets.length === 0) {
        throw new ApiError(400, 'INVALID_UPDATE', 'No editable fields available in current schema.');
      }

      values.push(tripId);
      const updateResult = await client.query(
        `UPDATE trips
         SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING *`,
        values,
      );

      return updateResult.rows[0];
    });

    const fullTripResult = await getTripById(updatedTrip.id);
    return successResponse(normalizeTripRow(fullTripResult.rows[0]));
  } catch (error) {
    return handleApiError(error);
  }
}
