import { query } from '@/lib/db';
import { ApiError } from '@/lib/response';

let tripsColumnsCache = null;
let fuelColumnsCache = null;
let tripStatusLabelsCache = null;

async function getTableColumns(tableName) {
  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [tableName],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

export async function getTripsColumns() {
  if (!tripsColumnsCache) {
    tripsColumnsCache = await getTableColumns('trips');
  }
  return tripsColumnsCache;
}

export async function getFuelColumns() {
  if (!fuelColumnsCache) {
    fuelColumnsCache = await getTableColumns('fuel_logs');
  }
  return fuelColumnsCache;
}

export async function getTripStatusLabels() {
  if (!tripStatusLabelsCache) {
    const result = await query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public'
         AND t.typname = (
           SELECT udt_name
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'trips'
             AND column_name = 'status'
           LIMIT 1
         )`,
    );
    tripStatusLabelsCache = new Set(result.rows.map((row) => row.enumlabel));
  }
  return tripStatusLabelsCache;
}

export async function mapApiTripStatusToDb(apiStatus) {
  const labels = await getTripStatusLabels();
  if (labels.has(apiStatus)) {
    return apiStatus;
  }

  const fallbackMap = {
    draft: 'scheduled',
    dispatched: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
  };

  const mapped = fallbackMap[apiStatus];
  if (mapped && labels.has(mapped)) {
    return mapped;
  }

  throw new ApiError(500, 'CONFIG_ERROR', 'Unsupported trip status mapping.');
}

export function mapDbTripStatusToApi(dbStatus) {
  const fallbackMap = {
    scheduled: 'draft',
    in_progress: 'dispatched',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  return fallbackMap[dbStatus] ?? dbStatus;
}

export function normalizeTripRow(row) {
  if (!row) return row;
  return {
    ...row,
    status: mapDbTripStatusToApi(row.status),
  };
}

export async function getTripSchemaConfig() {
  const columns = await getTripsColumns();

  return {
    columns,
    hasCreatedBy: columns.has('created_by'),
    hasCargoDescription: columns.has('cargo_description'),
    hasOdometerStart: columns.has('odometer_start'),
    hasOdometerEnd: columns.has('odometer_end'),
    hasDispatchAt: columns.has('dispatched_at'),
    hasCompleteAt: columns.has('completed_at'),
    hasCancelAt: columns.has('cancelled_at'),
    hasCancelReason: columns.has('cancellation_reason'),
    scheduledColumn: columns.has('scheduled_date') ? 'scheduled_date' : 'scheduled_at',
    dispatchColumn: columns.has('dispatched_at') ? 'dispatched_at' : columns.has('started_at') ? 'started_at' : null,
    completeColumn: columns.has('completed_at') ? 'completed_at' : null,
    cancelColumn: columns.has('cancelled_at') ? 'cancelled_at' : null,
    cancelReasonColumn: columns.has('cancellation_reason') ? 'cancellation_reason' : columns.has('notes') ? 'notes' : null,
  };
}
