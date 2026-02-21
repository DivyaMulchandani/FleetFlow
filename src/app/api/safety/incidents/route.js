import { z } from 'zod';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageSafetyIncidents, assertCanReadSafetyIncidents } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseDateRange, parsePagination, safetyIncidentCreateSchema } from '@/lib/validation';
import { getIncidentColumns, mapIncidentSeverityToDb } from '@/lib/drivers-db';

export const runtime = 'nodejs';

const listQuerySchema = z.object({
  driver_id: z.string().uuid().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

function mapDbSeverityToApi(dbSeverity) {
  const reverseMap = {
    minor: 'low',
    moderate: 'medium',
    severe: 'high',
    critical: 'critical',
  };
  return reverseMap[dbSeverity] ?? dbSeverity;
}

function normalizeIncident(row) {
  if (!row) return row;
  return {
    ...row,
    severity: mapDbSeverityToApi(row.severity),
  };
}

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadSafetyIncidents(role);

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { startDate, endDate } = parseDateRange(url.searchParams);
    const parsedFilters = listQuerySchema.parse({
      driver_id: url.searchParams.get('driver_id') ?? undefined,
      severity: url.searchParams.get('severity') ?? undefined,
    });
    const offset = (page - 1) * limit;
    const incidentColumns = await getIncidentColumns();
    const hasIncidentType = incidentColumns.has('incident_type');
    const incidentTypeSelect = hasIncidentType ? 'si.incident_type' : 'NULL::TEXT AS incident_type';

    const filters = [];
    const values = [];

    if (parsedFilters.driver_id) {
      values.push(parsedFilters.driver_id);
      filters.push(`si.driver_id = $${values.length}`);
    }
    if (parsedFilters.severity) {
      values.push(await mapIncidentSeverityToDb(parsedFilters.severity));
      filters.push(`si.severity = $${values.length}`);
    }
    if (startDate) {
      values.push(startDate);
      filters.push(`si.incident_date >= $${values.length}`);
    }
    if (endDate) {
      values.push(endDate);
      filters.push(`si.incident_date <= $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM safety_incidents si
       ${whereClause}`,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listValues = [...values, limit, offset];
    const listResult = await query(
      `SELECT
         si.id,
         si.driver_id,
         si.trip_id,
         si.reported_by,
         ${incidentTypeSelect},
         si.description,
         si.severity,
         si.score_deduction,
         si.incident_date,
         si.created_at,
         d.full_name AS driver_name,
         d.safety_score AS driver_safety_score
       FROM safety_incidents si
       JOIN drivers d ON d.id = si.driver_id
       ${whereClause}
       ORDER BY si.incident_date DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues,
    );

    return successResponse(listResult.rows.map(normalizeIncident), 200, {
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

export async function POST(request) {
  try {
    const { userId, role } = await requireAuth(request);
    assertCanManageSafetyIncidents(role);

    const body = await request.json();
    const parsedBody = safetyIncidentCreateSchema.parse(body);
    const incidentColumns = await getIncidentColumns();
    const hasIncidentType = incidentColumns.has('incident_type');

    const driverResult = await query(
      `SELECT id
       FROM drivers
       WHERE id = $1
       LIMIT 1`,
      [parsedBody.driver_id],
    );
    if (driverResult.rows.length === 0) {
      throw new ApiError(400, 'INVALID_DRIVER', 'Driver not found.');
    }

    if (parsedBody.trip_id) {
      const tripResult = await query(
        `SELECT id, driver_id
         FROM trips
         WHERE id = $1
         LIMIT 1`,
        [parsedBody.trip_id],
      );
      const trip = tripResult.rows[0];
      if (!trip) {
        throw new ApiError(400, 'INVALID_TRIP', 'Trip not found.');
      }
      if (trip.driver_id !== parsedBody.driver_id) {
        throw new ApiError(400, 'TRIP_DRIVER_MISMATCH', 'trip_id does not belong to driver_id.');
      }
    }

    const dbSeverity = await mapIncidentSeverityToDb(parsedBody.severity);

    const columns = ['driver_id', 'trip_id', 'reported_by', 'description', 'severity', 'score_deduction', 'incident_date'];
    const values = [
      parsedBody.driver_id,
      parsedBody.trip_id ?? null,
      userId,
      parsedBody.description,
      dbSeverity,
      parsedBody.score_deduction,
      parsedBody.incident_date ?? new Date().toISOString(),
    ];

    if (hasIncidentType) {
      columns.splice(3, 0, 'incident_type');
      values.splice(3, 0, parsedBody.incident_type);
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const incidentTypeSelect = hasIncidentType ? 'si.incident_type' : 'NULL::TEXT AS incident_type';

    const insertResult = await query(
      `INSERT INTO safety_incidents (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING id`,
      values,
    );

    const createdId = insertResult.rows[0].id;
    const createdResult = await query(
      `SELECT
         si.id,
         si.driver_id,
         si.trip_id,
         si.reported_by,
         ${incidentTypeSelect},
         si.description,
         si.severity,
         si.score_deduction,
         si.incident_date,
         si.created_at,
         d.full_name AS driver_name,
         d.safety_score AS driver_safety_score
       FROM safety_incidents si
       JOIN drivers d ON d.id = si.driver_id
       WHERE si.id = $1
       LIMIT 1`,
      [createdId],
    );

    return successResponse(normalizeIncident(createdResult.rows[0]), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
