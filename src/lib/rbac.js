import { ApiError } from '@/lib/response';

export const ROLES = {
  FLEET_MANAGER: 'fleet_manager',
  DISPATCHER: 'dispatcher',
  SAFETY_OFFICER: 'safety_officer',
  FINANCIAL_ANALYST: 'financial_analyst',
};

export function assertRole(role, allowedRoles) {
  if (!allowedRoles.includes(role)) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission for this action.');
  }
}

export function assertFleetManager(role) {
  assertRole(role, [ROLES.FLEET_MANAGER]);
}

export function assertCanReadVehicles(role) {
  assertRole(role, [
    ROLES.FLEET_MANAGER,
    ROLES.DISPATCHER,
    ROLES.SAFETY_OFFICER,
    ROLES.FINANCIAL_ANALYST,
  ]);
}

export function assertCanChangeVehicleStatus(role, nextStatus) {
  if (role === ROLES.FLEET_MANAGER) {
    return;
  }

  if (role === ROLES.DISPATCHER) {
    if (nextStatus === 'retired') {
      throw new ApiError(403, 'FORBIDDEN', 'Dispatcher cannot retire a vehicle.');
    }
    return;
  }

  throw new ApiError(403, 'FORBIDDEN', 'You do not have permission for this action.');
}

export function assertCanReadDrivers(role) {
  assertRole(role, [
    ROLES.FLEET_MANAGER,
    ROLES.DISPATCHER,
    ROLES.SAFETY_OFFICER,
    ROLES.FINANCIAL_ANALYST,
  ]);
}

export function assertCanManageIncidents(role) {
  assertRole(role, [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER]);
}

export function assertCanReadTrips(role) {
  assertRole(role, [
    ROLES.FLEET_MANAGER,
    ROLES.DISPATCHER,
    ROLES.SAFETY_OFFICER,
    ROLES.FINANCIAL_ANALYST,
  ]);
}

export function assertCanManageTrips(role) {
  assertRole(role, [ROLES.FLEET_MANAGER, ROLES.DISPATCHER]);
}
