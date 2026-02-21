import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageMaintenance, assertCanReadMaintenance } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { maintenanceUpdateSchema, parseUuidParam } from '@/lib/validation';
import { getMaintenanceSchemaConfig, maintenanceSelectSql } from '@/lib/maintenance-db';

export const runtime = 'nodejs';

async function getMaintenanceWithVehicle(dbClient, id, config) {
  const result = await dbClient.query(
    `SELECT
       ${maintenanceSelectSql(config, 'm')},
       v.name AS vehicle_name,
       v.license_plate,
       v.status AS vehicle_status
     FROM maintenance_logs m
     JOIN vehicles v ON v.id = m.vehicle_id
     WHERE m.id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadMaintenance(role);

    const id = parseUuidParam(params.id);
    const config = await getMaintenanceSchemaConfig();
    const log = await getMaintenanceWithVehicle({ query }, id, config);

    if (!log) {
      throw new ApiError(404, 'NOT_FOUND', 'Maintenance log not found.');
    }

    return successResponse(log);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageMaintenance(role);

    const id = parseUuidParam(params.id);
    const body = await request.json();

    if (
      Object.prototype.hasOwnProperty.call(body, 'vehicle_id') ||
      Object.prototype.hasOwnProperty.call(body, 'completed_date')
    ) {
      throw new ApiError(400, 'INVALID_UPDATE', 'vehicle_id and completed_date cannot be updated here.');
    }

    const parsedBody = maintenanceUpdateSchema.parse(body);
    const config = await getMaintenanceSchemaConfig();

    const updated = await withTransaction(async (client) => {
      const existingResult = await client.query(
        `SELECT id
         FROM maintenance_logs
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [id],
      );
      if (existingResult.rows.length === 0) {
        throw new ApiError(404, 'NOT_FOUND', 'Maintenance log not found.');
      }

      const fieldMap = {
        description: 'description',
        cost: 'cost',
        service_date: config.serviceDateColumn,
      };
      if (config.hasServiceType) {
        fieldMap.service_type = 'service_type';
      }
      if (config.vendorColumn) {
        fieldMap.vendor_name = config.vendorColumn;
      }
      if (config.hasOdometerAtService) {
        fieldMap.odometer_at_service = 'odometer_at_service';
      }
      if (config.hasNextServiceKm) {
        fieldMap.next_service_km = 'next_service_km';
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
        `UPDATE maintenance_logs
         SET ${sets.join(', ')}${config.hasUpdatedAt ? ', updated_at = NOW()' : ''}
         WHERE id = $${values.length}`,
        values,
      );

      return getMaintenanceWithVehicle(client, id, config);
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageMaintenance(role);

    const id = parseUuidParam(params.id);
    const config = await getMaintenanceSchemaConfig();

    const deleted = await withTransaction(async (client) => {
      const logResult = await client.query(
        `SELECT id, vehicle_id, completed_date
         FROM maintenance_logs
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [id],
      );
      const log = logResult.rows[0];
      if (!log) {
        throw new ApiError(404, 'NOT_FOUND', 'Maintenance log not found.');
      }

      if (log.completed_date === null) {
        await client.query(
          `UPDATE vehicles
           SET status = 'available', updated_at = NOW()
           WHERE id = $1
             AND status != 'on_trip'
             AND status != 'retired'`,
          [log.vehicle_id],
        );
      }

      const deletedResult = await client.query(
        `DELETE FROM maintenance_logs
         WHERE id = $1
         RETURNING id`,
        [id],
      );

      return {
        id: deletedResult.rows[0].id,
        deleted: true,
      };
    });

    return successResponse(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}
