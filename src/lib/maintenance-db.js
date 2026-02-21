import { query } from '@/lib/db';

let maintenanceColumnsCache = null;

export async function getMaintenanceColumns() {
  if (!maintenanceColumnsCache) {
    const result = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'maintenance_logs'`,
    );
    maintenanceColumnsCache = new Set(result.rows.map((row) => row.column_name));
  }
  return maintenanceColumnsCache;
}

export async function getMaintenanceSchemaConfig() {
  const columns = await getMaintenanceColumns();
  const serviceDateColumn = columns.has('service_date') ? 'service_date' : 'scheduled_date';
  const vendorColumn = columns.has('vendor_name')
    ? 'vendor_name'
    : columns.has('performed_by')
      ? 'performed_by'
      : null;
  const loggedByColumn = columns.has('logged_by')
    ? 'logged_by'
    : columns.has('created_by')
      ? 'created_by'
      : null;

  return {
    columns,
    serviceDateColumn,
    vendorColumn,
    loggedByColumn,
    hasServiceType: columns.has('service_type'),
    hasOdometerAtService: columns.has('odometer_at_service'),
    hasNextServiceKm: columns.has('next_service_km'),
    hasUpdatedAt: columns.has('updated_at'),
  };
}

export function maintenanceSelectSql(config, alias = 'm') {
  const loggedBySql = config.loggedByColumn
    ? `${alias}.${config.loggedByColumn} AS logged_by`
    : 'NULL::UUID AS logged_by';
  const serviceTypeSql = config.hasServiceType
    ? `${alias}.service_type`
    : 'NULL::TEXT AS service_type';
  const vendorSql = config.vendorColumn
    ? `${alias}.${config.vendorColumn} AS vendor_name`
    : 'NULL::TEXT AS vendor_name';
  const odometerSql = config.hasOdometerAtService
    ? `${alias}.odometer_at_service`
    : 'NULL::NUMERIC AS odometer_at_service';
  const nextServiceSql = config.hasNextServiceKm
    ? `${alias}.next_service_km`
    : 'NULL::NUMERIC AS next_service_km';
  const updatedAtSql = config.hasUpdatedAt
    ? `${alias}.updated_at`
    : `${alias}.created_at AS updated_at`;

  return `
    ${alias}.id,
    ${alias}.vehicle_id,
    ${loggedBySql},
    ${serviceTypeSql},
    ${alias}.description,
    ${vendorSql},
    ${alias}.cost,
    ${alias}.${config.serviceDateColumn} AS service_date,
    ${alias}.completed_date,
    ${odometerSql},
    ${nextServiceSql},
    ${alias}.created_at,
    ${updatedAtSql}
  `;
}
