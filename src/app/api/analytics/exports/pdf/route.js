import PDFDocument from 'pdfkit';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertCanReadAnalytics } from '@/lib/rbac';
import { handleApiError } from '@/lib/response';
import { formatNumber } from '@/lib/analytics';

export const runtime = 'nodejs';

function addSectionTitle(doc, text) {
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(13).text(text);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10);
}

function addKeyValueLine(doc, label, value) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value);
}

function addSimpleRow(doc, values) {
  doc.text(values.join(' | '));
}

async function buildPdfBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(18).text('FleetFlow Health Audit');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).text(`Generated: ${new Date().toISOString()}`);

    addSectionTitle(doc, 'Fleet Summary');
    addKeyValueLine(doc, 'Active Fleet', String(data.summary.active_fleet));
    addKeyValueLine(doc, 'Vehicles on Trip', String(data.summary.vehicles_on_trip));
    addKeyValueLine(doc, 'Vehicles in Shop', String(data.summary.vehicles_in_shop));
    addKeyValueLine(doc, 'Driver Alerts', String(data.summary.driver_alerts));
    addKeyValueLine(doc, 'Monthly Revenue', formatNumber(data.summary.monthly_revenue));

    addSectionTitle(doc, 'Vehicles in Shop');
    if (data.inShop.length === 0) {
      doc.text('No vehicles currently in shop.');
    } else {
      for (const row of data.inShop) {
        addSimpleRow(doc, [row.name, row.license_plate ?? '-', row.region ?? '-']);
      }
    }

    addSectionTitle(doc, 'High Risk Drivers');
    if (data.highRiskDrivers.length === 0) {
      doc.text('No high risk drivers found.');
    } else {
      for (const row of data.highRiskDrivers) {
        addSimpleRow(doc, [row.full_name, `Score: ${row.safety_score}`, `Status: ${row.status}`]);
      }
    }

    addSectionTitle(doc, 'Top Cost Vehicles');
    if (data.topCostVehicles.length === 0) {
      doc.text('No vehicle cost data available.');
    } else {
      for (const row of data.topCostVehicles) {
        addSimpleRow(doc, [row.vehicle_name, `Cost: ${formatNumber(row.total_operational_cost)}`]);
      }
    }

    addSectionTitle(doc, 'ROI Table');
    if (data.roiRows.length === 0) {
      doc.text('No ROI rows available.');
    } else {
      doc.font('Helvetica-Bold').text('Vehicle | Revenue | Cost | Acquisition | ROI %');
      doc.font('Helvetica');
      for (const row of data.roiRows) {
        addSimpleRow(doc, [
          row.vehicle_name,
          formatNumber(row.total_revenue),
          formatNumber(row.total_cost),
          formatNumber(row.acquisition_cost),
          formatNumber(row.roi_percent),
        ]);
      }
    }

    doc.end();
  });
}

export async function GET(request) {
  try {
    const { role } = await requireAuth(request);
    assertCanReadAnalytics(role);

    const [summaryResult, inShopResult, highRiskResult, topCostResult, roiResult] = await Promise.all([
      query(
        `WITH vehicle_counts AS (
           SELECT
             COUNT(*) FILTER (WHERE status <> 'retired')::INT AS active_fleet,
             COUNT(*) FILTER (WHERE status = 'in_shop')::INT AS vehicles_in_shop,
             COUNT(*) FILTER (WHERE status = 'on_trip')::INT AS vehicles_on_trip
           FROM vehicles
         ),
         driver_counts AS (
           SELECT COUNT(*) FILTER (WHERE safety_score < 70)::INT AS driver_alerts
           FROM drivers
         ),
         month_revenue AS (
           SELECT COALESCE(SUM(revenue), 0)::NUMERIC(14,2) AS monthly_revenue
           FROM trips
           WHERE status = 'completed'
             AND completed_at >= date_trunc('month', CURRENT_DATE)
             AND completed_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
         )
         SELECT
           vc.active_fleet,
           vc.vehicles_in_shop,
           vc.vehicles_on_trip,
           dc.driver_alerts,
           mr.monthly_revenue
         FROM vehicle_counts vc
         CROSS JOIN driver_counts dc
         CROSS JOIN month_revenue mr`,
      ),
      query(
        `SELECT id, name, license_plate, region
         FROM vehicles
         WHERE status = 'in_shop'
         ORDER BY updated_at DESC NULLS LAST, name ASC
         LIMIT 25`,
      ),
      query(
        `SELECT id, full_name, safety_score, status
         FROM drivers
         WHERE safety_score < 70
         ORDER BY safety_score ASC, full_name ASC
         LIMIT 25`,
      ),
      query(
        `WITH fuel_agg AS (
           SELECT vehicle_id, COALESCE(SUM(total_cost), 0)::NUMERIC(14,2) AS fuel_cost
           FROM fuel_logs
           GROUP BY vehicle_id
         ),
         maintenance_agg AS (
           SELECT vehicle_id, COALESCE(SUM(cost), 0)::NUMERIC(14,2) AS maintenance_cost
           FROM maintenance_logs
           GROUP BY vehicle_id
         )
         SELECT
           v.id AS vehicle_id,
           v.name AS vehicle_name,
           (COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0))::NUMERIC(14,2) AS total_operational_cost
         FROM vehicles v
         LEFT JOIN fuel_agg f ON f.vehicle_id = v.id
         LEFT JOIN maintenance_agg m ON m.vehicle_id = v.id
         ORDER BY total_operational_cost DESC, v.name ASC
         LIMIT 15`,
      ),
      query(
        `WITH revenue_agg AS (
           SELECT vehicle_id, COALESCE(SUM(revenue), 0)::NUMERIC(14,2) AS total_revenue
           FROM trips
           WHERE status = 'completed'
           GROUP BY vehicle_id
         ),
         fuel_agg AS (
           SELECT vehicle_id, COALESCE(SUM(total_cost), 0)::NUMERIC(14,2) AS fuel_cost
           FROM fuel_logs
           GROUP BY vehicle_id
         ),
         maintenance_agg AS (
           SELECT vehicle_id, COALESCE(SUM(cost), 0)::NUMERIC(14,2) AS maintenance_cost
           FROM maintenance_logs
           GROUP BY vehicle_id
         )
         SELECT
           v.id AS vehicle_id,
           v.name AS vehicle_name,
           COALESCE(r.total_revenue, 0)::NUMERIC(14,2) AS total_revenue,
           (COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0))::NUMERIC(14,2) AS total_cost,
           COALESCE(v.acquisition_cost, 0)::NUMERIC(14,2) AS acquisition_cost,
           CASE
             WHEN COALESCE(v.acquisition_cost, 0) <= 0 THEN 0::NUMERIC(14,2)
             ELSE ROUND(
               ((COALESCE(r.total_revenue, 0) - (COALESCE(f.fuel_cost, 0) + COALESCE(m.maintenance_cost, 0)))
                 / v.acquisition_cost::NUMERIC) * 100,
               2
             )
           END AS roi_percent
         FROM vehicles v
         LEFT JOIN revenue_agg r ON r.vehicle_id = v.id
         LEFT JOIN fuel_agg f ON f.vehicle_id = v.id
         LEFT JOIN maintenance_agg m ON m.vehicle_id = v.id
         ORDER BY roi_percent DESC, v.name ASC
         LIMIT 20`,
      ),
    ]);

    const pdfBuffer = await buildPdfBuffer({
      summary: summaryResult.rows[0] ?? {
        active_fleet: 0,
        vehicles_in_shop: 0,
        vehicles_on_trip: 0,
        driver_alerts: 0,
        monthly_revenue: 0,
      },
      inShop: inShopResult.rows,
      highRiskDrivers: highRiskResult.rows,
      topCostVehicles: topCostResult.rows,
      roiRows: roiResult.rows,
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="fleetflow-health-audit.pdf"',
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
