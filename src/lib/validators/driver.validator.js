import { ApiError } from '@/lib/response';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function validateLicenseExpiry(expiryDate, options = {}) {
  const { warningWindowDays = 30 } = options;
  const parsedDate = new Date(expiryDate);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid license expiry date.');
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expiryUtc = Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
  );

  const daysToExpiry = Math.floor((expiryUtc - todayUtc) / DAY_IN_MS);

  if (daysToExpiry < 0) {
    throw new ApiError(400, 'LICENSE_EXPIRED', 'Driver license is expired.');
  }

  return {
    valid: true,
    expiringSoon: daysToExpiry <= warningWindowDays,
    daysToExpiry,
  };
}
