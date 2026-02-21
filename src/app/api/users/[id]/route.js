import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertFleetManager } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam } from '@/lib/validation';

export const runtime = 'nodejs';

const updateUserSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().max(255).optional(),
    password: z.string().min(8).max(128).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function GET(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const userId = parseUuidParam(params.id);
    const result = await query(
      `SELECT
         id,
         full_name,
         email,
         role,
         is_active,
         last_login,
         created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    return successResponse(result.rows[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const userId = parseUuidParam(params.id);
    const body = await request.json();

    if (Object.prototype.hasOwnProperty.call(body, 'role')) {
      throw new ApiError(400, 'INVALID_UPDATE', 'Role must be changed via /users/[id]/role.');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'created_at')) {
      throw new ApiError(400, 'INVALID_UPDATE', 'created_at cannot be modified.');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'password_hash')) {
      throw new ApiError(400, 'INVALID_UPDATE', 'password_hash cannot be modified directly.');
    }

    const parsedBody = updateUserSchema.parse(body);
    const updates = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(parsedBody, 'full_name')) {
      values.push(parsedBody.full_name);
      updates.push(`full_name = $${values.length}`);
    }
    if (Object.prototype.hasOwnProperty.call(parsedBody, 'email')) {
      values.push(normalizeEmail(parsedBody.email));
      updates.push(`email = $${values.length}`);
    }
    if (Object.prototype.hasOwnProperty.call(parsedBody, 'password')) {
      const passwordHash = await bcrypt.hash(parsedBody.password, 12);
      values.push(passwordHash);
      updates.push(`password_hash = $${values.length}`);
    }
    if (Object.prototype.hasOwnProperty.call(parsedBody, 'is_active')) {
      values.push(parsedBody.is_active);
      updates.push(`is_active = $${values.length}`);
    }

    values.push(userId);
    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING
         id,
         full_name,
         email,
         role,
         is_active,
         last_login,
         created_at`,
      values,
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    return successResponse(result.rows[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { role } = await requireAuth(request);
    assertFleetManager(role);

    const userId = parseUuidParam(params.id);
    const result = await query(
      `UPDATE users
       SET is_active = false
       WHERE id = $1
       RETURNING
         id,
         full_name,
         email,
         role,
         is_active,
         last_login,
         created_at`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    return successResponse(result.rows[0]);
  } catch (error) {
    return handleApiError(error);
  }
}
