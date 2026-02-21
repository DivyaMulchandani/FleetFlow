import { withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageTrips } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam, tripCancelSchema } from '@/lib/validation';
import { getTripSchemaConfig, mapApiTripStatusToDb, normalizeTripRow } from '@/lib/trips-db';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageTrips(role);

    const tripId = parseUuidParam(params.id);
    const body = await request.json();
    const { cancellation_reason: cancellationReason } = tripCancelSchema.parse(body);
    const schemaConfig = await getTripSchemaConfig();
    const draftStatus = await mapApiTripStatusToDb('draft');
    const dispatchedStatus = await mapApiTripStatusToDb('dispatched');
    const completedStatus = await mapApiTripStatusToDb('completed');
    const cancelledStatus = await mapApiTripStatusToDb('cancelled');

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
      if (currentTrip.status === completedStatus) {
        throw new ApiError(400, 'INVALID_STATE', 'Completed trip cannot be cancelled.');
      }
      if (![draftStatus, dispatchedStatus].includes(currentTrip.status)) {
        throw new ApiError(400, 'INVALID_STATE', 'Only draft or dispatched trips can be cancelled.');
      }

      const tripSets = ['status = $1', 'updated_at = NOW()'];
      const tripValues = [cancelledStatus];

      if (schemaConfig.cancelColumn) {
        tripSets.push(`${schemaConfig.cancelColumn} = NOW()`);
      }
      if (schemaConfig.cancelReasonColumn) {
        tripValues.push(cancellationReason);
        tripSets.push(`${schemaConfig.cancelReasonColumn} = $${tripValues.length}`);
      }

      tripValues.push(tripId);
      const tripUpdate = await client.query(
        `UPDATE trips
         SET ${tripSets.join(', ')}
         WHERE id = $${tripValues.length}
         RETURNING *`,
        tripValues,
      );

      if (currentTrip.status === dispatchedStatus) {
        await client.query(
          `UPDATE vehicles
           SET status = 'available', updated_at = NOW()
           WHERE id = $1`,
          [currentTrip.vehicle_id],
        );
        await client.query(
          `UPDATE drivers
           SET status = 'available', updated_at = NOW()
           WHERE id = $1`,
          [currentTrip.driver_id],
        );
      }

      return tripUpdate.rows[0];
    });

    return successResponse(normalizeTripRow(trip));
  } catch (error) {
    return handleApiError(error);
  }
}
