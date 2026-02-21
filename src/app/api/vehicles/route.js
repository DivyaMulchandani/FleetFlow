import { z } from 'zod';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadVehicles, assertFleetManager } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { createVehicleSchema, parsePagination, vehicleStatusSchema, vehicleTypeSchema } from '@/lib/validation';

export const runtime = 'nodejs';

const listQuerySchema = z.object({
  status: vehicleStatusSchema.optional(),
  type: vehicleTypeSchema.optional(),
  region: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadVehicles(role);

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const parsedFilters = listQuerySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      type: url.searchParams.get('type') ?? undefined,
      region: url.searchParams.get('region') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    });

    const filters = [];
    const values = [];

    if (parsedFilters.status) {
      values.push(parsedFilters.status);
      filters.push(`v.status = $${values.length}`);
    }
    if (parsedFilters.type) {
      values.push(parsedFilters.type);
      filters.push(`v.type = $${values.length}`);
    }
    if (parsedFilters.region) {
      values.push(parsedFilters.region);
      filters.push(`v.region = $${values.length}`);
    }
    if (parsedFilters.search) {
      values.push(`%${parsedFilters.search}%`);
      filters.push(`(v.name ILIKE $${values.length} OR v.license_plate ILIKE $${values.length})`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM vehicles v
       ${whereClause}`,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listValues = [...values, limit, offset];
    const vehiclesResult = await query(
      `SELECT
          v.id,
          v.name,
          v.model,
          v.license_plate,
          v.type,
          v.region,
          v.max_capacity_kg,
          v.odometer_km,
          v.acquisition_cost,
          v.status,
          v.created_by,
          v.created_at,
          v.updated_at
       FROM vehicles v
       ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues,
    );

    return successResponse(vehiclesResult.rows, 200, {
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
    assertFleetManager(role);

    const body = await request.json();
    const parsedBody = createVehicleSchema.parse(body);

    const normalizedLicensePlate = parsedBody.license_plate.toUpperCase();

    const existingVehicle = await query(
      `SELECT id
       FROM vehicles
       WHERE license_plate = $1
       LIMIT 1`,
      [normalizedLicensePlate],
    );

    if (existingVehicle.rows.length > 0) {
      throw new ApiError(409, 'LICENSE_PLATE_EXISTS', 'License plate already exists.');
    }

    const createdResult = await query(
      `INSERT INTO vehicles (
         name,
         model,
         license_plate,
         type,
         region,
         max_capacity_kg,
         odometer_km,
         acquisition_cost,
         status,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available', $9)
       RETURNING
         id,
         name,
         model,
         license_plate,
         type,
         region,
         max_capacity_kg,
         odometer_km,
         acquisition_cost,
         status,
         created_by,
         created_at,
         updated_at`,
      [
        parsedBody.name,
        parsedBody.model ?? null,
        normalizedLicensePlate,
        parsedBody.type,
        parsedBody.region ?? null,
        parsedBody.max_capacity_kg,
        parsedBody.odometer_km,
        parsedBody.acquisition_cost ?? null,
        userId,
      ],
    );

    return successResponse(createdResult.rows[0], 201);
  } catch (error) {
    return handleApiError(error);
  }
}
