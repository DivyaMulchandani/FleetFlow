import { ApiError } from '@/lib/response';

export function validateCargoCapacity(vehicleMax, cargoWeight) {
  const max = Number(vehicleMax);
  const weight = Number(cargoWeight);

  if (!Number.isFinite(max) || !Number.isFinite(weight)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid cargo capacity values.');
  }

  if (weight > max) {
    throw new ApiError(
      400,
      'CAPACITY_EXCEEDED',
      'Cargo weight exceeds vehicle maximum capacity.',
    );
  }

  return true;
}
