import { z } from 'zod';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadDrivers, assertFleetManager } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { createDriverSchema, driverStatusSchema, parseBooleanFlag, parsePagination } from '@/lib/validation';
import { getDriversColumns } from '@/lib/drivers-db';

export const runtime = 'nodejs';

const listQuerySchema = z.object({
  status: driverStatusSchema.optional(),
  license_category: z.string().trim().min(1).max(30).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadDrivers(role);

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const expiringSoon = parseBooleanFlag(url.searchParams, 'expiring_soon');
    const parsedFilters = listQuerySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      license_category: url.searchParams.get('license_category') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    });

    const driverColumns = await getDriversColumns();
    const hasLicenseCategory = driverColumns.has('license_category');

    const filters = [];
    const values = [];

    if (parsedFilters.status) {
      values.push(parsedFilters.status);
      filters.push(`d.status = $${values.length}`);
    }
    if (parsedFilters.license_category) {
      if (!hasLicenseCategory) {
        throw new ApiError(400, 'INVALID_FILTER', 'license_category filter is not supported.');
      }
      values.push(parsedFilters.license_category);
      filters.push(`d.license_category = $${values.length}`);
    }
    if (parsedFilters.search) {
      values.push(`%${parsedFilters.search}%`);
      filters.push(`(d.full_name ILIKE $${values.length} OR d.license_number ILIKE $${values.length})`);
    }
    if (expiringSoon) {
      filters.push(`d.license_expiry_date <= (CURRENT_DATE + INTERVAL '30 days')`);
      filters.push(`d.license_expiry_date >= CURRENT_DATE`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM drivers d
       ${whereClause}`,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const licenseCategorySelect = hasLicenseCategory ? 'd.license_category' : 'NULL::TEXT AS license_category';

    const listValues = [...values, limit, offset];
    const driversResult = await query(
      `SELECT
         d.id,
         d.full_name,
         d.phone,
         d.license_number,
         ${licenseCategorySelect},
         d.license_expiry_date,
         d.safety_score,
         d.status,
         d.total_trips,
         d.completed_trips,
         d.created_at,
         d.updated_at
       FROM drivers d
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues,
    );

    return successResponse(driversResult.rows, 200, {
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
    const parsedBody = createDriverSchema.parse(body);

    const driverColumns = await getDriversColumns();
    const hasLicenseCategory = driverColumns.has('license_category');
    const hasCreatedBy = driverColumns.has('created_by');

    const existingDriver = await query(
      `SELECT id
       FROM drivers
       WHERE license_number = $1
       LIMIT 1`,
      [parsedBody.license_number],
    );
    if (existingDriver.rows.length > 0) {
      throw new ApiError(409, 'LICENSE_NUMBER_EXISTS', 'License number already exists.');
    }

    const columns = ['full_name', 'phone', 'license_number', 'license_expiry_date', 'safety_score', 'status', 'total_trips', 'completed_trips'];
    const values = [
      parsedBody.full_name,
      parsedBody.phone ?? null,
      parsedBody.license_number,
      parsedBody.license_expiry_date,
      100,
      'available',
      0,
      0,
    ];

    if (hasLicenseCategory) {
      columns.push('license_category');
      values.push(parsedBody.license_category);
    }
    if (hasCreatedBy) {
      columns.push('created_by');
      values.push(userId);
    }

    const valuePlaceholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const licenseCategorySelect = hasLicenseCategory ? 'license_category' : 'NULL::TEXT AS license_category';
    const createdBySelect = hasCreatedBy ? 'created_by' : 'NULL::UUID AS created_by';

    const createdResult = await query(
      `INSERT INTO drivers (${columns.join(', ')})
       VALUES (${valuePlaceholders})
       RETURNING
         id,
         full_name,
         phone,
         license_number,
         ${licenseCategorySelect},
         license_expiry_date,
         safety_score,
         status,
         total_trips,
         completed_trips,
         ${createdBySelect},
         created_at,
         updated_at`,
      values,
    );

    return successResponse(createdResult.rows[0], 201);
  } catch (error) {
    return handleApiError(error);
  }
}
