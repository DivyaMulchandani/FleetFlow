import { z } from 'zod';
import { ApiError } from '@/lib/response';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export function parseMonthParam(searchParams) {
  const month = searchParams.get('month');
  if (!month) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'month is required in YYYY-MM format.');
  }

  const parsed = monthSchema.safeParse(month);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid month. Use YYYY-MM.');
  }

  const monthStart = new Date(`${parsed.data}-01T00:00:00.000Z`);
  if (Number.isNaN(monthStart.getTime())) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid month. Use YYYY-MM.');
  }

  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  return {
    month: parsed.data,
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
  };
}

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined) return '0.00';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '0.00';
  return numeric.toFixed(digits);
}

export function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
