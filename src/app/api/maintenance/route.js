import { query, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanManageMaintenance, assertCanReadMaintenance } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { maintenanceCreateSchema, parseBooleanFlag, parseDateRange, parsePagination } from '@/lib/validation';
import { getMaintenanceSchemaConfig, maintenanceSelectSql } from '@/lib/maintenance-db';
import { z } from 'zod';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadMaintenance(role);

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const { startDate, endDate } = parseDateRange(url.searchParams);
    const activeOnly = parseBooleanFlag(url.searchParams, 'active_only');
    const rawVehicleId = url.searchParams.get('vehicle_id');
    const vehicleIdParsed = z.string().uuid().optional().safeParse(rawVehicleId ?? undefined);
    if (!vehicleIdParsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid vehicle_id.');
    }
    const vehicleId = vehicleIdParsed.data;
    const offset = (page - 1) * limit;
    const config = await getMaintenanceSchemaConfig();

    const filters = [];
    const values = [];

    if (vehicleId) {
      values.push(vehicleId);
      filters.push(`m.vehicle_id = $${values.length}`);
    }
    if (activeOnly) {
      filters.push('m.completed_date IS NULL');
    }
    if (startDate) {
      values.push(startDate);
      filters.push(`m.${config.serviceDateColumn} >= $${values.length}`);
    }
    if (endDate) {
      values.push(endDate);
      filters.push(`m.${config.serviceDateColumn} <= $${values.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM maintenance_logs m
       ${whereClause}`,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listValues = [...values, limit, offset];
    const listResult = await query(
      `SELECT
         ${maintenanceSelectSql(config, 'm')},
         v.name AS vehicle_name,
         v.license_plate,
         v.status AS vehicle_status
       FROM maintenance_logs m
       JOIN vehicles v ON v.id = m.vehicle_id
       ${whereClause}
       ORDER BY m.${config.serviceDateColumn} DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues,
    );

    return successResponse(listResult.rows, 200, {
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
    assertCanManageMaintenance(role);

    const body = await request.json();
    const parsedBody = maintenanceCreateSchema.parse(body);
    const config = await getMaintenanceSchemaConfig();

    const created = await withTransaction(async (client) => {
      const vehicleResult = await client.query(
        `SELECT id, status
         FROM vehicles
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [parsedBody.vehicle_id],
      );
      const vehicle = vehicleResult.rows[0];
      if (!vehicle) {
        throw new ApiError(400, 'INVALID_VEHICLE', 'Vehicle not found.');
      }
      if (vehicle.status === 'retired') {
        throw new ApiError(400, 'INVALID_VEHICLE_STATE', 'Cannot service retired vehicle.');
      }

      const activeResult = await client.query(
        `SELECT id
         FROM maintenance_logs
         WHERE vehicle_id = $1
           AND completed_date IS NULL
         LIMIT 1
         FOR UPDATE`,
        [parsedBody.vehicle_id],
      );
      if (activeResult.rows.length > 0) {
        throw new ApiError(409, 'ACTIVE_MAINTENANCE_EXISTS', 'Vehicle already has active maintenance.');
      }

      const columns = ['vehicle_id', 'description', 'cost', config.serviceDateColumn, 'completed_date'];
      const values = [
        parsedBody.vehicle_id,
        parsedBody.description,
        parsedBody.cost,
        parsedBody.service_date ?? new Date().toISOString(),
        parsedBody.completed_date ?? null,
      ];

      if (config.loggedByColumn) {
        columns.push(config.loggedByColumn);
        values.push(userId);
      }
      if (config.hasServiceType && Object.prototype.hasOwnProperty.call(parsedBody, 'service_type')) {
        columns.push('service_type');
        values.push(parsedBody.service_type ?? null);
      }
      if (config.vendorColumn && Object.prototype.hasOwnProperty.call(parsedBody, 'vendor_name')) {
        columns.push(config.vendorColumn);
        values.push(parsedBody.vendor_name ?? null);
      }
      if (config.hasOdometerAtService && Object.prototype.hasOwnProperty.call(parsedBody, 'odometer_at_service')) {
        columns.push('odometer_at_service');
        values.push(parsedBody.odometer_at_service);
      }
      if (config.hasNextServiceKm && Object.prototype.hasOwnProperty.call(parsedBody, 'next_service_km')) {
        columns.push('next_service_km');
        values.push(parsedBody.next_service_km);
      }

      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const insertResult = await client.query(
        `INSERT INTO maintenance_logs (${columns.join(', ')})
         VALUES (${placeholders})
         RETURNING id`,
        values,
      );

      if (!parsedBody.completed_date) {
        await client.query(
          `UPDATE vehicles
           SET status = 'in_shop', updated_at = NOW()
           WHERE id = $1`,
          [parsedBody.vehicle_id],
        );
      }

      const createdId = insertResult.rows[0].id;
      const createdResult = await client.query(
        `SELECT
           ${maintenanceSelectSql(config, 'm')},
           v.name AS vehicle_name,
           v.license_plate,
           v.status AS vehicle_status
         FROM maintenance_logs m
         JOIN vehicles v ON v.id = m.vehicle_id
         WHERE m.id = $1
         LIMIT 1`,
        [createdId],
      );

      return createdResult.rows[0];
    });

    return successResponse(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
