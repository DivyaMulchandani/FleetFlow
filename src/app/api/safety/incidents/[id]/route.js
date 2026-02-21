import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageSafetyIncidents, assertCanReadSafetyIncidents, assertFleetManager } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam, safetyIncidentUpdateSchema } from '@/lib/validation';
import { getIncidentColumns, mapIncidentSeverityToDb } from '@/lib/drivers-db';

export const runtime = 'nodejs';

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

async function getIncidentById(id, hasIncidentType) {
  const incidentTypeSelect = hasIncidentType ? 'si.incident_type' : 'NULL::TEXT AS incident_type';
  const result = await query(
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
       d.safety_score AS driver_safety_score,
       t.trip_code,
       t.status AS trip_status
     FROM safety_incidents si
     JOIN drivers d ON d.id = si.driver_id
     LEFT JOIN trips t ON t.id = si.trip_id
     WHERE si.id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadSafetyIncidents(role);

    const id = parseUuidParam(params.id);
    const incidentColumns = await getIncidentColumns();
    const hasIncidentType = incidentColumns.has('incident_type');
    const incident = await getIncidentById(id, hasIncidentType);
    if (!incident) {
      throw new ApiError(404, 'NOT_FOUND', 'Incident not found.');
    }

    return successResponse(normalizeIncident(incident));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertCanManageSafetyIncidents(role);

    const id = parseUuidParam(params.id);
    const body = await request.json();

    if (
      Object.prototype.hasOwnProperty.call(body, 'driver_id') ||
      Object.prototype.hasOwnProperty.call(body, 'reported_by')
    ) {
      throw new ApiError(400, 'INVALID_UPDATE', 'driver_id and reported_by cannot be changed.');
    }

    const parsedBody = safetyIncidentUpdateSchema.parse(body);
    const incidentColumns = await getIncidentColumns();
    const hasIncidentType = incidentColumns.has('incident_type');

    const updated = await withTransaction(async (client) => {
      const existingResult = await client.query(
        `SELECT id, driver_id
         FROM safety_incidents
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [id],
      );
      const existing = existingResult.rows[0];
      if (!existing) {
        throw new ApiError(404, 'NOT_FOUND', 'Incident not found.');
      }

      if (Object.prototype.hasOwnProperty.call(parsedBody, 'trip_id') && parsedBody.trip_id) {
        const tripResult = await client.query(
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
        if (trip.driver_id !== existing.driver_id) {
          throw new ApiError(400, 'TRIP_DRIVER_MISMATCH', 'trip_id does not belong to incident driver.');
        }
      }

      const fieldMap = {
        trip_id: 'trip_id',
        description: 'description',
        score_deduction: 'score_deduction',
        incident_date: 'incident_date',
      };
      if (hasIncidentType) {
        fieldMap.incident_type = 'incident_type';
      }

      const sets = [];
      const values = [];

      for (const [inputField, dbColumn] of Object.entries(fieldMap)) {
        if (Object.prototype.hasOwnProperty.call(parsedBody, inputField)) {
          values.push(parsedBody[inputField]);
          sets.push(`${dbColumn} = $${values.length}`);
        }
      }

      if (Object.prototype.hasOwnProperty.call(parsedBody, 'severity')) {
        values.push(await mapIncidentSeverityToDb(parsedBody.severity));
        sets.push(`severity = $${values.length}`);
      }

      if (sets.length === 0) {
        throw new ApiError(400, 'INVALID_UPDATE', 'No editable fields provided.');
      }

      values.push(id);
      await client.query(
        `UPDATE safety_incidents
         SET ${sets.join(', ')}
         WHERE id = $${values.length}`,
        values,
      );

      const incidentTypeSelect = hasIncidentType ? 'si.incident_type' : 'NULL::TEXT AS incident_type';
      const selected = await client.query(
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
           d.safety_score AS driver_safety_score,
           t.trip_code,
           t.status AS trip_status
         FROM safety_incidents si
         JOIN drivers d ON d.id = si.driver_id
         LEFT JOIN trips t ON t.id = si.trip_id
         WHERE si.id = $1
         LIMIT 1`,
        [id],
      );
      return selected.rows[0];
    });

    return successResponse(normalizeIncident(updated));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const id = parseUuidParam(params.id);

    const deleted = await withTransaction(async (client) => {
      const existingResult = await client.query(
        `SELECT id
         FROM safety_incidents
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [id],
      );
      if (existingResult.rows.length === 0) {
        throw new ApiError(404, 'NOT_FOUND', 'Incident not found.');
      }

      await client.query(
        `DELETE FROM safety_incidents
         WHERE id = $1`,
        [id],
      );

      return { id, deleted: true };
    });

    return successResponse(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}
