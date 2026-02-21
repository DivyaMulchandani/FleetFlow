import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageFuel, assertCanReadFuel } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { fuelUpdateSchema, parseUuidParam } from '@/lib/validation';
import { fuelSelectSql, getFuelSchemaConfig } from '@/lib/fuel-db';

export const runtime = 'nodejs';

const COST_TOLERANCE = 0.01;
const ODOMETER_TOLERANCE_KM = 500;

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertCostIntegrity(liters, costPerLiter, totalCost) {
  const expected = round2(Number(liters) * Number(costPerLiter));
  if (Math.abs(Number(totalCost) - expected) > COST_TOLERANCE) {
    throw new ApiError(400, 'INVALID_TOTAL_COST', 'total_cost must match liters * cost_per_liter.');
  }
}

async function getFuelById(id, config) {
  const result = await query(
    `SELECT
       ${fuelSelectSql(config, 'f')},
       v.name AS vehicle_name,
       v.license_plate,
       v.status AS vehicle_status,
       t.trip_code,
       t.status AS trip_status
     FROM fuel_logs f
     JOIN vehicles v ON v.id = f.vehicle_id
     LEFT JOIN trips t ON t.id = f.trip_id
     WHERE f.id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadFuel(role);

    const id = parseUuidParam(params.id);
    const config = await getFuelSchemaConfig();
    const row = await getFuelById(id, config);
    if (!row) {
      throw new ApiError(404, 'NOT_FOUND', 'Fuel log not found.');
    }

    return successResponse(row);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageFuel(role);

    const id = parseUuidParam(params.id);
    const body = await request.json();

    if (
      Object.prototype.hasOwnProperty.call(body, 'vehicle_id') ||
      Object.prototype.hasOwnProperty.call(body, 'trip_id')
    ) {
      throw new ApiError(400, 'INVALID_UPDATE', 'vehicle_id and trip_id cannot be changed.');
    }

    const parsedBody = fuelUpdateSchema.parse(body);
    const config = await getFuelSchemaConfig();

    const updated = await withTransaction(async (client) => {
      const existingResult = await client.query(
        `SELECT
           f.*,
           v.status AS vehicle_status,
           v.odometer_km AS vehicle_odometer
         FROM fuel_logs f
         JOIN vehicles v ON v.id = f.vehicle_id
         WHERE f.id = $1
         LIMIT 1
         FOR UPDATE`,
        [id],
      );
      const existing = existingResult.rows[0];
      if (!existing) {
        throw new ApiError(404, 'NOT_FOUND', 'Fuel log not found.');
      }
      if (existing.vehicle_status === 'retired') {
        throw new ApiError(400, 'INVALID_VEHICLE_STATE', 'Cannot update fuel log for retired vehicle.');
      }

      const nextLiters = Object.prototype.hasOwnProperty.call(parsedBody, 'liters')
        ? parsedBody.liters
        : existing.liters;
      const nextCostPerLiter = Object.prototype.hasOwnProperty.call(parsedBody, 'cost_per_liter')
        ? parsedBody.cost_per_liter
        : existing.cost_per_liter;
      const nextTotalCost = Object.prototype.hasOwnProperty.call(parsedBody, 'total_cost')
        ? parsedBody.total_cost
        : existing.total_cost;

      assertCostIntegrity(nextLiters, nextCostPerLiter, nextTotalCost);

      if (Object.prototype.hasOwnProperty.call(parsedBody, 'odometer_km')) {
        if (parsedBody.odometer_km !== null) {
          const minAllowed = Number(existing.vehicle_odometer) - ODOMETER_TOLERANCE_KM;
          if (Number(parsedBody.odometer_km) < minAllowed) {
            throw new ApiError(400, 'INVALID_ODOMETER', 'odometer_km is too far below vehicle odometer.');
          }
        }
      }

      const fieldMap = {
        fuel_date: config.dateColumn,
        liters: 'liters',
        cost_per_liter: 'cost_per_liter',
        total_cost: 'total_cost',
      };
      if (config.stationColumn) {
        fieldMap.fuel_station = config.stationColumn;
      }
      if (config.odometerColumn) {
        fieldMap.odometer_km = config.odometerColumn;
      }

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

      values.push(id);
      await client.query(
        `UPDATE fuel_logs
         SET ${sets.join(', ')}
         WHERE id = $${values.length}`,
        values,
      );

      const selected = await client.query(
        `SELECT
           ${fuelSelectSql(config, 'f')},
           v.name AS vehicle_name,
           v.license_plate,
           v.status AS vehicle_status,
           t.trip_code,
           t.status AS trip_status
         FROM fuel_logs f
         JOIN vehicles v ON v.id = f.vehicle_id
         LEFT JOIN trips t ON t.id = f.trip_id
         WHERE f.id = $1
         LIMIT 1`,
        [id],
      );
      return selected.rows[0];
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageFuel(role);

    const id = parseUuidParam(params.id);

    const deleted = await withTransaction(async (client) => {
      const rowResult = await client.query(
        `SELECT id
         FROM fuel_logs
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [id],
      );
      if (rowResult.rows.length === 0) {
        throw new ApiError(404, 'NOT_FOUND', 'Fuel log not found.');
      }

      await client.query(
        `DELETE FROM fuel_logs
         WHERE id = $1`,
        [id],
      );

      return { id, deleted: true };
    });

    return successResponse(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}
