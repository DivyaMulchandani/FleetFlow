import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadSafetyCompliance } from '@/lib/rbac';
import { handleApiError, successResponse } from '@/lib/response';

export const runtime = 'nodejs';

function classifyCompliance(daysToExpiry) {
  if (daysToExpiry < 0) return 'expired';
  if (daysToExpiry <= 30) return 'expiring_soon';
  return 'valid';
}

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadSafetyCompliance(role);

    const result = await query(
      `SELECT
         d.id,
         d.full_name,
         d.license_number,
         d.license_expiry_date,
         d.safety_score,
         d.status,
         (d.license_expiry_date - CURRENT_DATE) AS days_to_expiry
       FROM drivers d
       ORDER BY d.license_expiry_date ASC, d.full_name ASC`,
    );

    const grouped = {
      expired: [],
      expiring_soon: [],
      valid: [],
    };

    for (const row of result.rows) {
      const formatted = {
        id: row.id,
        full_name: row.full_name,
        license_number: row.license_number,
        license_expiry_date: row.license_expiry_date,
        safety_score: row.safety_score,
        status: row.status,
        days_to_expiry: Number(row.days_to_expiry),
      };
      grouped[classifyCompliance(Number(row.days_to_expiry))].push(formatted);
    }

    return successResponse(grouped);
  } catch (error) {
    return handleApiError(error);
  }
}
