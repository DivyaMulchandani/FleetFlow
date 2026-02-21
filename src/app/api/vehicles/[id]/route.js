import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadVehicles, assertFleetManager } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam, updateVehicleSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadVehicles(role);

    const vehicleId = parseUuidParam(params.id);

    const vehicleResult = await query(
      `SELECT
         v.id,
         v.name,
         v.model,
         v.license_plate,
         v.type,
         v.region,
         v.max_capacity_kg,
         v.odometer_km,
         v.acquisition_cost,
         v.status,
         v.created_by,
         v.created_at,
         v.updated_at,
         COALESCE(f.total_fuel_cost, 0) AS total_fuel_cost,
         COALESCE(m.total_maintenance_cost, 0) AS total_maintenance_cost
       FROM vehicles v
       LEFT JOIN (
         SELECT vehicle_id, SUM(total_cost) AS total_fuel_cost
         FROM fuel_logs
         GROUP BY vehicle_id
       ) f ON f.vehicle_id = v.id
       LEFT JOIN (
         SELECT vehicle_id, SUM(cost) AS total_maintenance_cost
         FROM maintenance_logs
         GROUP BY vehicle_id
       ) m ON m.vehicle_id = v.id
       WHERE v.id = $1
       LIMIT 1`,
      [vehicleId],
    );

    const vehicle = vehicleResult.rows[0];
    if (!vehicle) {
      throw new ApiError(404, 'NOT_FOUND', 'Vehicle not found.');
    }

    return successResponse(vehicle);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const vehicleId = parseUuidParam(params.id);
    const body = await request.json();

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      throw new ApiError(400, 'INVALID_UPDATE', 'Use /status endpoint to update status.');
    }

    const parsedBody = updateVehicleSchema.parse(body);

    const fieldMap = {
      name: 'name',
      model: 'model',
      license_plate: 'license_plate',
      type: 'type',
      region: 'region',
      max_capacity_kg: 'max_capacity_kg',
      odometer_km: 'odometer_km',
      acquisition_cost: 'acquisition_cost',
    };

    const sets = [];
    const values = [];

    for (const [field, column] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(parsedBody, field)) {
        const value =
          field === 'license_plate' && typeof parsedBody[field] === 'string'
            ? parsedBody[field].toUpperCase()
            : parsedBody[field];
        values.push(value);
        sets.push(`${column} = $${values.length}`);
      }
    }

    values.push(vehicleId);
    const updateResult = await query(
      `UPDATE vehicles
       SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
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
      values,
    );

    const updatedVehicle = updateResult.rows[0];
    if (!updatedVehicle) {
      throw new ApiError(404, 'NOT_FOUND', 'Vehicle not found.');
    }

    return successResponse(updatedVehicle);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const vehicleId = parseUuidParam(params.id);

    const retiredResult = await query(
      `UPDATE vehicles
       SET status = 'retired', updated_at = NOW()
       WHERE id = $1
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
      [vehicleId],
    );

    const retiredVehicle = retiredResult.rows[0];
    if (!retiredVehicle) {
      throw new ApiError(404, 'NOT_FOUND', 'Vehicle not found.');
    }

    return successResponse(retiredVehicle);
  } catch (error) {
    return handleApiError(error);
  }
}
