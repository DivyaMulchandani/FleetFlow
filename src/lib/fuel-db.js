import { query } from '@/lib/db';

let fuelColumnsCache = null;

export async function getFuelColumns() {
  if (!fuelColumnsCache) {
    const result = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'fuel_logs'`,
    );
    fuelColumnsCache = new Set(result.rows.map((row) => row.column_name));
  }
  return fuelColumnsCache;
}

export async function getFuelSchemaConfig() {
  const columns = await getFuelColumns();
  return {
    columns,
    dateColumn: columns.has('fuel_date') ? 'fuel_date' : 'fueled_at',
    stationColumn: columns.has('fuel_station')
      ? 'fuel_station'
      : columns.has('notes')
        ? 'notes'
        : null,
    odometerColumn: columns.has('odometer_km')
      ? 'odometer_km'
      : columns.has('odometer_at_fill')
        ? 'odometer_at_fill'
        : null,
    loggedByColumn: columns.has('logged_by')
      ? 'logged_by'
      : columns.has('created_by')
        ? 'created_by'
        : null,
  };
}

export function fuelSelectSql(config, alias = 'f') {
  const stationSql = config.stationColumn
    ? `${alias}.${config.stationColumn} AS fuel_station`
    : 'NULL::TEXT AS fuel_station';
  const odometerSql = config.odometerColumn
    ? `${alias}.${config.odometerColumn} AS odometer_km`
    : 'NULL::NUMERIC AS odometer_km';
  const loggedBySql = config.loggedByColumn
    ? `${alias}.${config.loggedByColumn} AS logged_by`
    : 'NULL::UUID AS logged_by';

  return `
    ${alias}.id,
    ${alias}.trip_id,
    ${alias}.vehicle_id,
    ${loggedBySql},
    ${alias}.${config.dateColumn} AS fuel_date,
    ${alias}.liters,
    ${alias}.cost_per_liter,
    ${alias}.total_cost,
    ${stationSql},
    ${odometerSql},
    ${alias}.created_at
  `;
}
