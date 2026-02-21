import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadDrivers } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam } from '@/lib/validation';

export const runtime = 'nodejs';

function getRiskLevel(safetyScore) {
  if (safetyScore >= 90) return 'low';
  if (safetyScore >= 70) return 'medium';
  if (safetyScore >= 50) return 'high';
  return 'critical';
}

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadDrivers(role);

    const driverId = parseUuidParam(params.id);

    const performanceResult = await query(
      `SELECT
         d.id AS driver_id,
         d.safety_score,
         d.total_trips,
         d.completed_trips,
         ROUND((d.completed_trips::NUMERIC / NULLIF(d.total_trips, 0)), 4) AS completion_rate,
         (
           SELECT COUNT(*)::INT
           FROM safety_incidents si
           WHERE si.driver_id = d.id
             AND si.incident_date >= (NOW() - INTERVAL '30 days')
         ) AS recent_incidents_count
       FROM drivers d
       WHERE d.id = $1
       LIMIT 1`,
      [driverId],
    );

    const perf = performanceResult.rows[0];
    if (!perf) {
      throw new ApiError(404, 'NOT_FOUND', 'Driver not found.');
    }

    const data = {
      driver_id: perf.driver_id,
      safety_score: perf.safety_score,
      total_trips: perf.total_trips,
      completed_trips: perf.completed_trips,
      completion_rate: perf.completion_rate,
      recent_incidents_count: perf.recent_incidents_count,
      risk_level: getRiskLevel(Number(perf.safety_score)),
    };

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
