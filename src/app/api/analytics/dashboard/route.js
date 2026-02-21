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
      `WITH vehicle_counts AS (
         SELECT
           COUNT(*) FILTER (WHERE status <> 'retired')::INT AS active_fleet,
           COUNT(*) FILTER (WHERE status = 'in_shop')::INT AS vehicles_in_shop,
           COUNT(*) FILTER (WHERE status = 'on_trip')::INT AS vehicles_on_trip
         FROM vehicles
       ),
       driver_counts AS (
         SELECT
           COUNT(*) FILTER (WHERE safety_score < 70)::INT AS driver_alerts,
           COUNT(*) FILTER (
             WHERE license_expiry_date >= CURRENT_DATE
               AND license_expiry_date <= CURRENT_DATE + INTERVAL '30 days'
           )::INT AS expiring_licenses
         FROM drivers
       ),
       trip_counts AS (
         SELECT
           COUNT(*) FILTER (WHERE status IN ('draft', 'dispatched'))::INT AS pending_trips
         FROM trips
       ),
       month_revenue AS (
         SELECT
           COALESCE(SUM(revenue), 0)::NUMERIC(14,2) AS monthly_revenue
         FROM trips
         WHERE status = 'completed'
           AND completed_at >= date_trunc('month', CURRENT_DATE)
           AND completed_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
       )
       SELECT
         vc.active_fleet,
         vc.vehicles_in_shop,
         vc.vehicles_on_trip,
         dc.driver_alerts,
         dc.expiring_licenses,
         CASE
           WHEN vc.active_fleet = 0 THEN 0::NUMERIC(6,2)
           ELSE ROUND((vc.vehicles_on_trip::NUMERIC / vc.active_fleet::NUMERIC) * 100, 2)
         END AS fleet_utilization_percent,
         tc.pending_trips,
         mr.monthly_revenue
       FROM vehicle_counts vc
       CROSS JOIN driver_counts dc
       CROSS JOIN trip_counts tc
       CROSS JOIN month_revenue mr`,
    );

    return successResponse(result.rows[0] ?? {});
  } catch (error) {
    return handleApiError(error);
  }
}
