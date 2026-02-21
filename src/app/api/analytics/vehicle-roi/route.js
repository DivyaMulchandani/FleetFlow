import { z } from 'zod';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadAnalytics } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';

export const runtime = 'nodejs';

const querySchema = z.object({
  exclude_retired: z.enum(['true', 'false', '1', '0']).optional(),
});

function parseExcludeRetired(rawValue) {
  if (rawValue === undefined) return false;
  if (rawValue === 'true' || rawValue === '1') return true;
  if (rawValue === 'false' || rawValue === '0') return false;
  throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid exclude_retired flag.');
}

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadAnalytics(role);

    const url = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      exclude_retired: url.searchParams.get('exclude_retired') ?? undefined,
    });
    if (!parsedQuery.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid query parameters.');
    }
    const excludeRetired = parseExcludeRetired(parsedQuery.data.exclude_retired);

    const filters = [];
    const values = [];
    if (excludeRetired) {
      values.push('retired');
      filters.push(`v.status <> $${values.length}`);
    }
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await query(
      `WITH revenue_agg AS (
         SELECT
           vehicle_id,
           COALESCE(SUM(revenue), 0)::NUMERIC(14,2) AS total_revenue
         FROM trips
         WHERE status = 'completed'
         GROUP BY vehicle_id
       ),
       fuel_agg AS (
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
         COALESCE(r.total_revenue, 0)::NUMERIC(14,2) AS total_revenue,
         (COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0))::NUMERIC(14,2) AS total_cost,
         COALESCE(v.acquisition_cost, 0)::NUMERIC(14,2) AS acquisition_cost,
         CASE
           WHEN COALESCE(v.acquisition_cost, 0) <= 0 THEN 0::NUMERIC(14,2)
           ELSE ROUND(
             ((COALESCE(r.total_revenue, 0) - (COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0)))
               / v.acquisition_cost::NUMERIC) * 100,
             2
           )
         END AS roi_percent
       FROM vehicles v
       LEFT JOIN revenue_agg r ON r.vehicle_id = v.id
       LEFT JOIN fuel_agg f ON f.vehicle_id = v.id
       LEFT JOIN maintenance_agg m ON m.vehicle_id = v.id
       ${whereClause}
       ORDER BY roi_percent DESC, v.name ASC`,
      values,
    );

    return successResponse(result.rows);
  } catch (error) {
    return handleApiError(error);
  }
}
