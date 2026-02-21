import { query } from '@/lib/db';

let driversColumnsCache = null;
let incidentColumnsCache = null;
let incidentSeverityLabelsCache = null;

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

export async function getDriversColumns() {
  if (!driversColumnsCache) {
    driversColumnsCache = await getTableColumns('drivers');
  }
  return driversColumnsCache;
}

export async function getIncidentColumns() {
  if (!incidentColumnsCache) {
    incidentColumnsCache = await getTableColumns('safety_incidents');
  }
  return incidentColumnsCache;
}

export async function mapIncidentSeverityToDb(apiSeverity) {
  if (!incidentSeverityLabelsCache) {
    const enumResult = await query(
      `SELECT e.enumlabel
       FROM pg_type t
       JOIN pg_enum e ON e.enumtypid = t.oid
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public'
         AND t.typname = (
           SELECT udt_name
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'safety_incidents'
             AND column_name = 'severity'
           LIMIT 1
         )`,
    );
    incidentSeverityLabelsCache = new Set(enumResult.rows.map((row) => row.enumlabel));
  }

  if (incidentSeverityLabelsCache.has(apiSeverity)) {
    return apiSeverity;
  }

  const fallbackMap = {
    low: 'minor',
    medium: 'moderate',
    high: 'severe',
    critical: 'critical',
  };

  const mapped = fallbackMap[apiSeverity];
  if (mapped && incidentSeverityLabelsCache.has(mapped)) {
    return mapped;
  }

  return apiSeverity;
}
