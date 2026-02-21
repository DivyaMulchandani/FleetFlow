import { withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageMaintenance } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { maintenanceCompleteSchema, parseUuidParam } from '@/lib/validation';
import { getMaintenanceSchemaConfig, maintenanceSelectSql } from '@/lib/maintenance-db';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageMaintenance(role);

    const id = parseUuidParam(params.id);
    const body = await request.json();
    const { completed_date: completedDate } = maintenanceCompleteSchema.parse(body);
    const config = await getMaintenanceSchemaConfig();

    const completed = await withTransaction(async (client) => {
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
      if (log.completed_date) {
        throw new ApiError(400, 'ALREADY_COMPLETED', 'Maintenance is already completed.');
      }

      await client.query(
        `UPDATE maintenance_logs
         SET completed_date = $1${config.hasUpdatedAt ? ', updated_at = NOW()' : ''}
         WHERE id = $2`,
        [completedDate, id],
      );

      await client.query(
        `UPDATE vehicles
         SET status = 'available', updated_at = NOW()
         WHERE id = $1
           AND status != 'on_trip'
           AND status != 'retired'`,
        [log.vehicle_id],
      );

      const selectResult = await client.query(
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
      return selectResult.rows[0];
    });

    return successResponse(completed);
  } catch (error) {
    return handleApiError(error);
  }
}
