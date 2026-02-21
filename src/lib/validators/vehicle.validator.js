import { ApiError } from '@/lib/response';
import { ROLES } from '@/lib/rbac';

const VALID_STATUSES = new Set(['available', 'on_trip', 'in_shop', 'retired']);

const TRANSITIONS = {
  available: new Set(['on_trip', 'in_shop']),
  on_trip: new Set(['available']),
  in_shop: new Set(['available']),
  retired: new Set([]),
};

export function validateVehicleStatusTransition(currentStatus, nextStatus, options = {}) {
  const { userRole } = options;

  if (!VALID_STATUSES.has(currentStatus) || !VALID_STATUSES.has(nextStatus)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid vehicle status transition.');
  }

  if (currentStatus === nextStatus) {
    return true;
  }

  if (nextStatus === 'retired') {
    if (userRole === ROLES.FLEET_MANAGER) {
      return true;
    }
    throw new ApiError(403, 'FORBIDDEN', 'Only fleet manager can set vehicle to retired.');
  }

  if (!TRANSITIONS[currentStatus].has(nextStatus)) {
    throw new ApiError(400, 'INVALID_STATUS_TRANSITION', 'Vehicle status transition is not allowed.');
  }

  return true;
}
