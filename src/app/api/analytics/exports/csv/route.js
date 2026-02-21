import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadAnalytics } from '@/lib/rbac';
import { handleApiError } from '@/lib/response';
import { formatNumber, parseMonthParam, toCsvValue } from '@/lib/analytics';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadAnalytics(role);

    const url = new URL(request.url);
    const { month, monthStart, monthEnd } = parseMonthParam(url.searchParams);

    const result = await query(
      `WITH trip_agg AS (
         SELECT
           vehicle_id,
           COUNT(*)::INT AS trips_count,
           COALESCE(SUM(distance_km), 0)::NUMERIC(14,2) AS distance_km,
           COALESCE(SUM(revenue), 0)::NUMERIC(14,2) AS revenue
         FROM trips
         WHERE status = 'completed'
           AND completed_at >= $1
           AND completed_at < $2
         GROUP BY vehicle_id
       ),
       fuel_agg AS (
         SELECT
           vehicle_id,
           COALESCE(SUM(total_cost), 0)::NUMERIC(14,2) AS fuel_cost
         FROM fuel_logs
         WHERE fuel_date >= $1
           AND fuel_date < $2
         GROUP BY vehicle_id
       ),
       maintenance_agg AS (
         SELECT
           vehicle_id,
           COALESCE(SUM(cost), 0)::NUMERIC(14,2) AS maintenance_cost
         FROM maintenance_logs
         WHERE service_date >= $1
           AND service_date < $2
         GROUP BY vehicle_id
       )
       SELECT
         v.name AS vehicle_name,
         COALESCE(t.trips_count, 0)::INT AS trips_count,
         COALESCE(t.distance_km, 0)::NUMERIC(14,2) AS distance_km,
         COALESCE(f.fuel_cost, 0)::NUMERIC(14,2) AS fuel_cost,
         COALESCE(m.maintenance_cost, 0)::NUMERIC(14,2) AS maintenance_cost,
         COALESCE(t.revenue, 0)::NUMERIC(14,2) AS revenue,
         CASE
           WHEN COALESCE(v.acquisition_cost, 0) <= 0 THEN 0::NUMERIC(14,2)
           ELSE ROUND(
             ((COALESCE(t.revenue, 0) - (COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0)))
               / v.acquisition_cost::NUMERIC) * 100,
             2
           )
         END AS roi_percent
       FROM vehicles v
       LEFT JOIN trip_agg t ON t.vehicle_id = v.id
       LEFT JOIN fuel_agg f ON f.vehicle_id = v.id
       LEFT JOIN maintenance_agg m ON m.vehicle_id = v.id
       ORDER BY v.name ASC`,
      [monthStart, monthEnd],
    );

    const headers = [
      'vehicle_name',
      'trips_count',
      'distance_km',
      'fuel_cost',
      'maintenance_cost',
      'revenue',
      'roi_percent',
    ];

    const lines = [headers.join(',')];
    for (const row of result.rows) {
      lines.push(
        [
          toCsvValue(row.vehicle_name),
          toCsvValue(row.trips_count),
          toCsvValue(formatNumber(row.distance_km)),
          toCsvValue(formatNumber(row.fuel_cost)),
          toCsvValue(formatNumber(row.maintenance_cost)),
          toCsvValue(formatNumber(row.revenue)),
          toCsvValue(formatNumber(row.roi_percent)),
        ].join(','),
      );
    }

    const csv = `${lines.join('\n')}\n`;
    const fileName = `fleetflow-report-${month}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
