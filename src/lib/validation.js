import { z } from 'zod';
import { ApiError } from '@/lib/response';

export const uuidParamSchema = z.string().uuid();

export const vehicleTypeSchema = z.enum(['truck', 'van', 'bike']);
export const vehicleStatusSchema = z.enum(['available', 'on_trip', 'in_shop', 'retired']);
export const driverStatusSchema = z.enum(['available', 'on_trip', 'off_duty', 'suspended']);
export const incidentSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const tripStatusApiSchema = z.enum(['draft', 'dispatched', 'completed', 'cancelled']);

export const createVehicleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  model: z.string().trim().max(100).nullable().optional(),
  license_plate: z.string().trim().min(1).max(20),
  type: vehicleTypeSchema,
  region: z.string().trim().max(100).nullable().optional(),
  max_capacity_kg: z.coerce.number().positive(),
  odometer_km: z.coerce.number().min(0).optional().default(0),
  acquisition_cost: z.coerce.number().min(0).nullable().optional(),
});

export const updateVehicleSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    model: z.string().trim().max(100).nullable().optional(),
    license_plate: z.string().trim().min(1).max(20).optional(),
    type: vehicleTypeSchema.optional(),
    region: z.string().trim().max(100).nullable().optional(),
    max_capacity_kg: z.coerce.number().positive().optional(),
    odometer_km: z.coerce.number().min(0).optional(),
    acquisition_cost: z.coerce.number().min(0).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

export const statusUpdateSchema = z.object({
  status: vehicleStatusSchema,
});

export const createDriverSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).nullable().optional(),
  license_number: z.string().trim().min(1).max(50),
  license_category: z.string().trim().min(1).max(30),
  license_expiry_date: z.string().date(),
});

export const updateDriverSchema = z
  .object({
    full_name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    license_number: z.string().trim().min(1).max(50).optional(),
    license_category: z.string().trim().min(1).max(30).optional(),
    license_expiry_date: z.string().date().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

export const driverStatusUpdateSchema = z.object({
  status: driverStatusSchema,
});

export const createIncidentSchema = z.object({
  trip_id: z.string().uuid().nullable().optional(),
  incident_type: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(1000),
  severity: incidentSeveritySchema,
  score_deduction: z.coerce.number().min(0).max(100),
  incident_date: z.string().datetime().optional(),
});

export const tripCreateSchema = z.object({
  trip_code: z.string().trim().min(1).max(30).optional(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  origin: z.string().trim().min(1).max(200),
  destination: z.string().trim().min(1).max(200),
  cargo_description: z.string().trim().max(500).optional(),
  cargo_weight_kg: z.coerce.number().min(0),
  odometer_start: z.coerce.number().min(0).optional(),
  revenue: z.coerce.number().min(0).nullable().optional(),
  scheduled_date: z.string().datetime().or(z.string().date()).optional(),
});

export const tripUpdateSchema = z
  .object({
    trip_code: z.string().trim().min(1).max(30).optional(),
    vehicle_id: z.string().uuid().optional(),
    driver_id: z.string().uuid().optional(),
    origin: z.string().trim().min(1).max(200).optional(),
    destination: z.string().trim().min(1).max(200).optional(),
    cargo_description: z.string().trim().max(500).optional(),
    cargo_weight_kg: z.coerce.number().min(0).optional(),
    odometer_start: z.coerce.number().min(0).optional(),
    revenue: z.coerce.number().min(0).nullable().optional(),
    scheduled_date: z.string().datetime().or(z.string().date()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

export const tripDispatchSchema = z.object({});

export const tripCompleteSchema = z.object({
  odometer_end: z.coerce.number().min(0),
  revenue: z.coerce.number().min(0).nullable().optional(),
});

export const tripCancelSchema = z.object({
  cancellation_reason: z.string().trim().min(1).max(500),
});

export const tripFuelCreateSchema = z.object({
  fuel_date: z.string().datetime().or(z.string().date()).optional(),
  liters: z.coerce.number().positive(),
  cost_per_liter: z.coerce.number().positive(),
  total_cost: z.coerce.number().positive().optional(),
  fuel_station: z.string().trim().max(150).optional(),
  odometer_km: z.coerce.number().min(0).optional(),
});

export function parseUuidParam(value) {
  const parsed = uuidParamSchema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid resource id.');
  }
  return parsed.data;
}

export function parsePagination(searchParams, defaults = { page: 1, limit: 20 }) {
  const schema = z.object({
    page: z.coerce.number().int().min(1).default(defaults.page),
    limit: z.coerce.number().int().min(1).max(100).default(defaults.limit),
  });

  const parsed = schema.safeParse({
    page: searchParams.get('page') ?? defaults.page,
    limit: searchParams.get('limit') ?? defaults.limit,
  });

  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid pagination parameters.');
  }

  return parsed.data;
}

export function parseDateRange(searchParams) {
  const schema = z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
  });

  const parsed = schema.safeParse({
    startDate: searchParams.get('startDate') ?? undefined,
    endDate: searchParams.get('endDate') ?? undefined,
  });

  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid date range.');
  }

  if (parsed.data.startDate && parsed.data.endDate && parsed.data.startDate > parsed.data.endDate) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'startDate cannot be after endDate.');
  }

  return parsed.data;
}

export function parseBooleanFlag(searchParams, key) {
  const raw = searchParams.get(key);
  if (raw === null) return false;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new ApiError(400, 'VALIDATION_ERROR', `Invalid ${key} flag.`);
}
