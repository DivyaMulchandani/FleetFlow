import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageIncidents, assertCanReadDrivers } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { createIncidentSchema, parsePagination, parseUuidParam } from '@/lib/validation';
import { getIncidentColumns, mapIncidentSeverityToDb } from '@/lib/drivers-db';

export const runtime = 'nodejs';

async function assertDriverExists(driverId) {
  const driverResult = await query(
    `SELECT id
     FROM drivers
     WHERE id = $1
     LIMIT 1`,
    [driverId],
  );
  if (driverResult.rows.length === 0) {
    throw new ApiError(404, 'NOT_FOUND', 'Driver not found.');
  }
}

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadDrivers(role);

    const driverId = parseUuidParam(params.id);
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const offset = (page - 1) * limit;

    await assertDriverExists(driverId);

    const incidentColumns = await getIncidentColumns();
    const hasIncidentType = incidentColumns.has('incident_type');
    const incidentTypeSelect = hasIncidentType ? 'incident_type' : 'NULL::TEXT AS incident_type';

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM safety_incidents
       WHERE driver_id = $1`,
      [driverId],
    );
    const total = countResult.rows[0]?.total ?? 0;

    const incidentsResult = await query(
      `SELECT
         id,
         driver_id,
         trip_id,
         ${incidentTypeSelect},
         description,
         severity,
         score_deduction,
         incident_date,
         reported_by,
         created_at
       FROM safety_incidents
       WHERE driver_id = $1
       ORDER BY incident_date DESC
       LIMIT $2 OFFSET $3`,
      [driverId, limit, offset],
    );

    return successResponse(incidentsResult.rows, 200, {
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request, { params }) {
  try {
    const { userId, role } = await requireAuth(request);
    assertCanManageIncidents(role);

    const driverId = parseUuidParam(params.id);
    await assertDriverExists(driverId);

    const body = await request.json();
    const parsedBody = createIncidentSchema.parse(body);
    const incidentColumns = await getIncidentColumns();
    const hasIncidentType = incidentColumns.has('incident_type');
    const severityForDb = await mapIncidentSeverityToDb(parsedBody.severity);

    const columns = ['driver_id', 'trip_id', 'description', 'severity', 'score_deduction', 'incident_date', 'reported_by'];
    const values = [
      driverId,
      parsedBody.trip_id ?? null,
      parsedBody.description,
      severityForDb,
      parsedBody.score_deduction,
      parsedBody.incident_date ?? new Date().toISOString(),
      userId,
    ];

    if (hasIncidentType) {
      columns.splice(2, 0, 'incident_type');
      values.splice(2, 0, parsedBody.incident_type);
    }

    const valuePlaceholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const incidentTypeSelect = hasIncidentType ? 'incident_type' : 'NULL::TEXT AS incident_type';

    const createdResult = await query(
      `INSERT INTO safety_incidents (${columns.join(', ')})
       VALUES (${valuePlaceholders})
       RETURNING
         id,
         driver_id,
         trip_id,
         ${incidentTypeSelect},
         description,
         severity,
         score_deduction,
         incident_date,
         reported_by,
         created_at`,
      values,
    );

    return successResponse(createdResult.rows[0], 201);
  } catch (error) {
    return handleApiError(error);
  }
}
