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
      `WITH distance_agg AS (
         SELECT
           vehicle_id,
           COALESCE(SUM(distance_km), 0)::NUMERIC(14,2) AS total_distance
         FROM trips
         GROUP BY vehicle_id
       ),
       fuel_agg AS (
         SELECT
           vehicle_id,
           COALESCE(SUM(liters), 0)::NUMERIC(14,2) AS total_fuel
         FROM fuel_logs
         GROUP BY vehicle_id
       )
       SELECT
         v.id AS vehicle_id,
         v.name AS vehicle_name,
         COALESCE(d.total_distance, 0)::NUMERIC(14,2) AS total_distance,
         f.total_fuel,
         ROUND(COALESCE(d.total_distance, 0)::NUMERIC / NULLIF(f.total_fuel, 0), 2) AS km_per_liter
       FROM vehicles v
       JOIN fuel_agg f ON f.vehicle_id = v.id
       LEFT JOIN distance_agg d ON d.vehicle_id = v.id
       WHERE f.total_fuel > 0
       ORDER BY km_per_liter DESC NULLS LAST, v.name ASC`,
    );

    return successResponse(result.rows);
  } catch (error) {
    return handleApiError(error);
  }
}
