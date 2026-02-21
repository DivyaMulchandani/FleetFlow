import { z } from 'zod';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertFleetManager } from '@/lib/rbac';
import { ApiError, handleApiError, successResponse } from '@/lib/response';
import { parseUuidParam } from '@/lib/validation';

export const runtime = 'nodejs';

const USER_ROLES = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];

const roleUpdateSchema = z.object({
  role: z.enum(USER_ROLES),
});

export async function PATCH(request, { params }) {
  try {
    const { userId, role } = await requireAuth(request);
    assertFleetManager(role);

    const targetUserId = parseUuidParam(params.id);
    const body = await request.json();
    const parsedBody = roleUpdateSchema.parse(body);

    if (targetUserId === userId && parsedBody.role !== 'fleet_manager') {
      throw new ApiError(400, 'INVALID_ROLE_CHANGE', 'Self-demotion is not allowed.');
    }

    const result = await query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING
         id,
         full_name,
         email,
         role,
         is_active,
         last_login,
         created_at`,
      [parsedBody.role, targetUserId],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    return successResponse(result.rows[0]);
  } catch (error) {
    return handleApiError(error);
  }
}
