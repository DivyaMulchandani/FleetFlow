import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadAnalytics } from '@/lib/rbac';
import { handleApiError, successResponse } from '@/lib/response';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadAnalytics(role);

    const result = await query(
      `WITH fuel_agg AS (
         SELECT
           vehicle_id,
           COALESCE(SUM(total_cost), 0)::NUMERIC(14,2) AS fuel_cost
         FROM fuel_logs
         GROUP BY vehicle_id
       ),
       maintenance_agg AS (
         SELECT
           vehicle_id,
           COALESCE(SUM(cost), 0)::NUMERIC(14,2) AS maintenance_cost
         FROM maintenance_logs
         GROUP BY vehicle_id
       )
       SELECT
         v.id AS vehicle_id,
         v.name AS vehicle_name,
         COALESCE(f.fuel_cost, 0)::NUMERIC(14,2) AS fuel_cost,
         COALESCE(m.maintenance_cost, 0)::NUMERIC(14,2) AS maintenance_cost,
         (COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0))::NUMERIC(14,2) AS total_operational_cost
       FROM vehicles v
       LEFT JOIN fuel_agg f ON f.vehicle_id = v.id
       LEFT JOIN maintenance_agg m ON m.vehicle_id = v.id
       ORDER BY total_operational_cost DESC, v.name ASC`,
    );

    return successResponse(result.rows);
  } catch (error) {
    return handleApiError(error);
  }
}
