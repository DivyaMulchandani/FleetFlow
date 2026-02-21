import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertFleetManager } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parsePagination } from '@/lib/validation';

export const runtime = 'nodejs';

const USER_ROLES = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];

const listFilterSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

const createUserSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(USER_ROLES),
  is_active: z.boolean().optional().default(true),
});

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const parsedFilters = listFilterSchema.safeParse({
      role: url.searchParams.get('role') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    });
    if (!parsedFilters.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid list filters.');
    }

    const filters = [];
    const values = [];

    if (parsedFilters.data.role) {
      values.push(parsedFilters.data.role);
      filters.push(`role = $${values.length}`);
    }
    if (parsedFilters.data.search) {
      values.push(`%${parsedFilters.data.search}%`);
      filters.push(`(email ILIKE $${values.length} OR full_name ILIKE $${values.length})`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const countResult = await query(
      `SELECT COUNT(*)::INT AS total
       FROM users
       ${whereClause}`,
      values,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const offset = (page - 1) * limit;
    const listValues = [...values, limit, offset];
    const listResult = await query(
      `SELECT
         id,
         full_name,
         email,
         role,
         is_active,
         last_login,
         created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
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
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const body = await request.json();
    const parsedBody = createUserSchema.parse(body);
    const normalizedEmail = normalizeEmail(parsedBody.email);
    const passwordHash = await bcrypt.hash(parsedBody.password, 12);

    const createdResult = await query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         full_name,
         email,
         role,
         is_active,
         last_login,
         created_at`,
      [
        parsedBody.full_name,
        normalizedEmail,
        passwordHash,
        parsedBody.role,
        parsedBody.is_active,
      ],
    );

    return successResponse(createdResult.rows[0], 201);
  } catch (error) {
    return handleApiError(error);
  }
}
