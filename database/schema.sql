-- ============================================================
-- FleetFlow - Production PostgreSQL Schema
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ============================================================
-- 2. ENUM DEFINITIONS
-- ============================================================
CREATE TYPE user_role AS ENUM (
    'fleet_manager',
    'dispatcher',
    'safety_officer',
    'financial_analyst'
);

CREATE TYPE vehicle_type AS ENUM (
    'truck',
    'van',
    'bike'
);

CREATE TYPE vehicle_status AS ENUM (
    'available',
    'on_trip',
    'in_shop',
    'retired'
);

CREATE TYPE driver_status AS ENUM (
    'available',
    'on_trip',
    'off_duty',
    'suspended'
);

CREATE TYPE trip_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE incident_severity AS ENUM (
    'minor',
    'moderate',
    'severe',
    'critical'
);

-- ============================================================
-- 3. TABLES
-- ============================================================

-- ----------------------------------------------------------
-- users: authentication + RBAC
-- ----------------------------------------------------------
CREATE TABLE users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(150) UNIQUE NOT NULL,
    password_hash    TEXT        NOT NULL,
    role             user_role   NOT NULL,
    is_active        BOOLEAN     NOT NULL DEFAULT true,
    last_login       TIMESTAMP,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- vehicles
-- ----------------------------------------------------------
CREATE TABLE vehicles (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100)    NOT NULL,
    model               VARCHAR(100),
    license_plate       VARCHAR(20)     UNIQUE NOT NULL,
    type                vehicle_type    NOT NULL,
    region              VARCHAR(100),
    max_capacity_kg     DECIMAL(10,2)   NOT NULL CHECK (max_capacity_kg > 0),
    odometer_km         DECIMAL(10,2)   NOT NULL DEFAULT 0 CHECK (odometer_km >= 0),
    acquisition_cost    DECIMAL(12,2)   CHECK (acquisition_cost >= 0),
    status              vehicle_status  NOT NULL DEFAULT 'available',
    created_by          UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- drivers
-- ----------------------------------------------------------
CREATE TABLE drivers (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    UNIQUE NOT NULL,
    phone               VARCHAR(20),
    license_number      VARCHAR(50)     UNIQUE NOT NULL,
    license_expiry_date DATE            NOT NULL,
    status              driver_status   NOT NULL DEFAULT 'available',
    safety_score        DECIMAL(5,2)    NOT NULL DEFAULT 100
                            CHECK (safety_score >= 0 AND safety_score <= 100),
    total_trips         INTEGER         NOT NULL DEFAULT 0 CHECK (total_trips >= 0),
    completed_trips     INTEGER         NOT NULL DEFAULT 0 CHECK (completed_trips >= 0),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- trips
-- GENERATED STORED column: distance_km derived from geo coords
-- We store origin/destination lat-lon and compute great-circle distance (km)
-- ----------------------------------------------------------
CREATE TABLE trips (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_code           VARCHAR(30)     UNIQUE NOT NULL,
    vehicle_id          UUID            NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id           UUID            NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    origin              VARCHAR(200)    NOT NULL,
    destination         VARCHAR(200)    NOT NULL,
    -- lat/lon stored as DECIMAL for GENERATED column computation
    origin_lat          DECIMAL(9,6)    NOT NULL DEFAULT 0,
    origin_lon          DECIMAL(9,6)    NOT NULL DEFAULT 0,
    dest_lat            DECIMAL(9,6)    NOT NULL DEFAULT 0,
    dest_lon            DECIMAL(9,6)    NOT NULL DEFAULT 0,
    -- GENERATED STORED column: haversine approximation in km
    distance_km         DECIMAL(10,2)   GENERATED ALWAYS AS (
        ROUND(
            CAST(
                6371.0 * 2 * ASIN(
                    SQRT(
                        POWER(SIN(RADIANS((dest_lat - origin_lat) / 2)), 2)
                        + COS(RADIANS(origin_lat))
                        * COS(RADIANS(dest_lat))
                        * POWER(SIN(RADIANS((dest_lon - origin_lon) / 2)), 2)
                    )
                )
            AS DECIMAL(10,2))
        , 2)
    ) STORED,
    cargo_weight_kg     DECIMAL(10,2)   NOT NULL CHECK (cargo_weight_kg >= 0),
    status              trip_status     NOT NULL DEFAULT 'scheduled',
    revenue             DECIMAL(12,2)   CHECK (revenue >= 0),
    scheduled_at        TIMESTAMP       NOT NULL,
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    notes               TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- maintenance_logs
-- ----------------------------------------------------------
CREATE TABLE maintenance_logs (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id          UUID            NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    description         TEXT            NOT NULL,
    cost                DECIMAL(12,2)   CHECK (cost >= 0),
    performed_by        VARCHAR(150),
    scheduled_date      DATE            NOT NULL,
    completed_date      DATE,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- fuel_logs
-- total_cost = liters * cost_per_liter enforced via CHECK
-- trip_id is nullable (fueling outside a trip is valid)
-- ----------------------------------------------------------
CREATE TABLE fuel_logs (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id          UUID            NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    trip_id             UUID            REFERENCES trips(id) ON DELETE SET NULL,
    liters              DECIMAL(8,2)    NOT NULL CHECK (liters > 0),
    cost_per_liter      DECIMAL(8,4)    NOT NULL CHECK (cost_per_liter > 0),
    total_cost          DECIMAL(12,2)   NOT NULL CHECK (total_cost > 0),
    -- Tolerance of 1 cent to handle floating-point rounding
    CONSTRAINT chk_fuel_total_cost
        CHECK (ABS(total_cost - ROUND(liters * cost_per_liter, 2)) < 0.02),
    fueled_at           TIMESTAMP       NOT NULL DEFAULT NOW(),
    odometer_at_fill    DECIMAL(10,2)   CHECK (odometer_at_fill >= 0),
    notes               TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- safety_incidents
-- ----------------------------------------------------------
CREATE TABLE safety_incidents (
    id                  UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id           UUID                NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    trip_id             UUID                REFERENCES trips(id) ON DELETE SET NULL,
    vehicle_id          UUID                REFERENCES vehicles(id) ON DELETE SET NULL,
    description         TEXT                NOT NULL,
    severity            incident_severity   NOT NULL,
    score_deduction     DECIMAL(5,2)        NOT NULL CHECK (score_deduction >= 0),
    incident_date       TIMESTAMP           NOT NULL DEFAULT NOW(),
    reported_by         UUID                REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- password_reset_tokens
-- ----------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT        UNIQUE NOT NULL,
    expires_at  TIMESTAMP   NOT NULL,
    used_at     TIMESTAMP,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. TRIGGER FUNCTIONS
-- ============================================================

-- ----------------------------------------------------------
-- Auto-update updated_at on any UPDATE
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------
-- Validate cargo_weight_kg against vehicle.max_capacity_kg
-- Fires BEFORE INSERT/UPDATE on trips
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_cargo_weight()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_max DECIMAL(10,2);
BEGIN
    SELECT max_capacity_kg INTO v_max
    FROM vehicles
    WHERE id = NEW.vehicle_id;

    IF NEW.cargo_weight_kg > v_max THEN
        RAISE EXCEPTION
            'cargo_weight_kg (%) exceeds vehicle max capacity (%) for vehicle %',
            NEW.cargo_weight_kg, v_max, NEW.vehicle_id;
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------
-- Maintenance → vehicle status sync
-- When completed_date IS NULL  → vehicle becomes 'in_shop'
-- When completed_date IS SET   → vehicle becomes 'available'
-- Fires AFTER INSERT/UPDATE on maintenance_logs
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sync_vehicle_maintenance_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.completed_date IS NULL THEN
        -- Vehicle is being worked on
        UPDATE vehicles
        SET status = 'in_shop', updated_at = NOW()
        WHERE id = NEW.vehicle_id
          AND status != 'retired'; -- never revive a retired vehicle
    ELSE
        -- Maintenance done → release vehicle back to fleet
        -- Only revert to 'available' if still 'in_shop' (don't override 'on_trip')
        UPDATE vehicles
        SET status = 'available', updated_at = NOW()
        WHERE id = NEW.vehicle_id
          AND status = 'in_shop';
    END IF;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------
-- Safety incident → deduct from driver safety_score
-- Ensures score never drops below 0
-- Fires AFTER INSERT on safety_incidents
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_deduct_safety_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE drivers
    SET
        safety_score = GREATEST(0, safety_score - NEW.score_deduction),
        updated_at   = NOW()
    WHERE id = NEW.driver_id;

    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------
-- Trip lifecycle → sync vehicle & driver status + counters
-- Fires AFTER INSERT/UPDATE on trips
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sync_trip_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- When a trip starts
    IF NEW.status = 'in_progress' AND (OLD IS NULL OR OLD.status != 'in_progress') THEN
        UPDATE vehicles SET status = 'on_trip', updated_at = NOW()
        WHERE id = NEW.vehicle_id AND status = 'available';

        UPDATE drivers SET status = 'on_trip', updated_at = NOW()
        WHERE id = NEW.driver_id AND status = 'available';

        -- increment total_trips on first transition to in_progress
        UPDATE drivers
        SET total_trips = total_trips + 1, updated_at = NOW()
        WHERE id = NEW.driver_id;
    END IF;

    -- When a trip completes
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE vehicles SET status = 'available', updated_at = NOW()
        WHERE id = NEW.vehicle_id AND status = 'on_trip';

        UPDATE drivers
        SET status = 'available',
            completed_trips = completed_trips + 1,
            updated_at = NOW()
        WHERE id = NEW.driver_id AND status = 'on_trip';

        -- update vehicle odometer
        UPDATE vehicles
        SET odometer_km = odometer_km + NEW.distance_km,
            updated_at  = NOW()
        WHERE id = NEW.vehicle_id;
    END IF;

    -- When a trip is cancelled from in_progress → release resources
    IF NEW.status = 'cancelled' AND OLD IS NOT NULL AND OLD.status = 'in_progress' THEN
        UPDATE vehicles SET status = 'available', updated_at = NOW()
        WHERE id = NEW.vehicle_id AND status = 'on_trip';

        UPDATE drivers SET status = 'available', updated_at = NOW()
        WHERE id = NEW.driver_id AND status = 'on_trip';
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- updated_at auto-stamps
CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_maintenance_logs_updated_at
    BEFORE UPDATE ON maintenance_logs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- cargo weight validation
CREATE TRIGGER trg_validate_cargo_weight
    BEFORE INSERT OR UPDATE OF cargo_weight_kg, vehicle_id ON trips
    FOR EACH ROW EXECUTE FUNCTION fn_validate_cargo_weight();

-- maintenance → vehicle status
CREATE TRIGGER trg_maintenance_vehicle_status
    AFTER INSERT OR UPDATE OF completed_date ON maintenance_logs
    FOR EACH ROW EXECUTE FUNCTION fn_sync_vehicle_maintenance_status();

-- safety incident → driver score deduction
CREATE TRIGGER trg_safety_score_deduction
    AFTER INSERT ON safety_incidents
    FOR EACH ROW EXECUTE FUNCTION fn_deduct_safety_score();

-- trip lifecycle → vehicle/driver status + counters
CREATE TRIGGER trg_trip_status_sync
    AFTER INSERT OR UPDATE OF status ON trips
    FOR EACH ROW EXECUTE FUNCTION fn_sync_trip_status();

-- ============================================================
-- 6. INDEXES
-- ============================================================

CREATE INDEX idx_vehicles_status          ON vehicles(status);
CREATE INDEX idx_drivers_status           ON drivers(status);
CREATE INDEX idx_drivers_license_expiry   ON drivers(license_expiry_date);
CREATE INDEX idx_trips_vehicle_id         ON trips(vehicle_id);
CREATE INDEX idx_trips_driver_id          ON trips(driver_id);
CREATE INDEX idx_trips_status             ON trips(status);
CREATE INDEX idx_fuel_logs_vehicle_id     ON fuel_logs(vehicle_id);
CREATE INDEX idx_maintenance_vehicle_id   ON maintenance_logs(vehicle_id);

-- Expiry enforcement for password reset tokens
CREATE INDEX idx_password_reset_expires   ON password_reset_tokens(expires_at)
    WHERE used_at IS NULL;

-- ============================================================
-- 7. ANALYTICS VIEWS
-- ============================================================

-- ----------------------------------------------------------
-- vehicle_fuel_efficiency
-- Fuel Efficiency = SUM(distance_km) / SUM(liters)
-- Only trips with a linked fuel log are included
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW vehicle_fuel_efficiency AS
SELECT
    v.id                                            AS vehicle_id,
    v.name                                          AS vehicle_name,
    v.license_plate,
    COUNT(DISTINCT t.id)                            AS total_trips,
    ROUND(SUM(t.distance_km)::DECIMAL, 2)           AS total_distance_km,
    ROUND(SUM(fl.liters)::DECIMAL, 2)               AS total_liters,
    CASE
        WHEN SUM(fl.liters) > 0
        THEN ROUND((SUM(t.distance_km) / SUM(fl.liters))::DECIMAL, 4)
        ELSE NULL
    END                                             AS km_per_liter
FROM vehicles v
LEFT JOIN trips t     ON t.vehicle_id = v.id AND t.status = 'completed'
LEFT JOIN fuel_logs fl ON fl.vehicle_id = v.id
GROUP BY v.id, v.name, v.license_plate;

-- ----------------------------------------------------------
-- vehicle_operational_cost
-- Operational Cost = total fuel cost + total maintenance cost
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW vehicle_operational_cost AS
SELECT
    v.id                                                AS vehicle_id,
    v.name                                              AS vehicle_name,
    v.license_plate,
    v.acquisition_cost,
    COALESCE(SUM(fl.total_cost), 0)                     AS total_fuel_cost,
    COALESCE(SUM(ml.cost), 0)                           AS total_maintenance_cost,
    COALESCE(SUM(fl.total_cost), 0)
        + COALESCE(SUM(ml.cost), 0)                     AS total_operational_cost
FROM vehicles v
LEFT JOIN fuel_logs fl        ON fl.vehicle_id = v.id
LEFT JOIN maintenance_logs ml ON ml.vehicle_id = v.id
GROUP BY v.id, v.name, v.license_plate, v.acquisition_cost;

-- ----------------------------------------------------------
-- vehicle_roi
-- ROI = (total_revenue - total_operational_cost) / acquisition_cost
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW vehicle_roi AS
SELECT
    oc.vehicle_id,
    oc.vehicle_name,
    oc.license_plate,
    oc.acquisition_cost,
    COALESCE(SUM(t.revenue), 0)                         AS total_revenue,
    oc.total_operational_cost,
    CASE
        WHEN oc.acquisition_cost > 0
        THEN ROUND(
                (
                    (COALESCE(SUM(t.revenue), 0) - oc.total_operational_cost)
                    / oc.acquisition_cost
                )::DECIMAL
            , 4)
        ELSE NULL
    END                                                  AS roi
FROM vehicle_operational_cost oc
LEFT JOIN trips t
    ON t.vehicle_id = oc.vehicle_id
   AND t.status     = 'completed'
GROUP BY
    oc.vehicle_id,
    oc.vehicle_name,
    oc.license_plate,
    oc.acquisition_cost,
    oc.total_operational_cost;

-- ============================================================
-- 8. SEED DATA
-- ============================================================

-- Passwords are bcrypt hashes of 'Password123!' for all seed users
-- In production, use your auth service to hash passwords.

INSERT INTO users (id, full_name, email, password_hash, role) VALUES
(
    '11111111-0000-0000-0000-000000000001',
    'Alice Johnson',
    'alice@fleetflow.io',
    '$2b$12$KIX/ExampleBcryptHashFleetManagerAlice',
    'fleet_manager'
),
(
    '11111111-0000-0000-0000-000000000002',
    'Bob Martinez',
    'bob@fleetflow.io',
    '$2b$12$KIX/ExampleBcryptHashDispatcherBob',
    'dispatcher'
),
(
    '11111111-0000-0000-0000-000000000003',
    'Carol Singh',
    'carol@fleetflow.io',
    '$2b$12$KIX/ExampleBcryptHashSafetyOfficerCarol',
    'safety_officer'
),
(
    '11111111-0000-0000-0000-000000000004',
    'David Kim',
    'david@fleetflow.io',
    '$2b$12$KIX/ExampleBcryptHashFinancialAnalystDavid',
    'financial_analyst'
);

INSERT INTO vehicles (id, name, model, license_plate, type, region, max_capacity_kg, odometer_km, acquisition_cost, status, created_by) VALUES
(
    '22222222-0000-0000-0000-000000000001',
    'Heavy Hauler 01', 'Volvo FH16', 'TRK-001-AA', 'truck', 'North',
    20000.00, 45230.00, 185000.00, 'available',
    '11111111-0000-0000-0000-000000000001'
),
(
    '22222222-0000-0000-0000-000000000002',
    'City Van 02', 'Mercedes Sprinter', 'VAN-002-BB', 'van', 'South',
    3500.00, 18900.00, 42000.00, 'available',
    '11111111-0000-0000-0000-000000000001'
),
(
    '22222222-0000-0000-0000-000000000003',
    'Cargo Truck 03', 'MAN TGX', 'TRK-003-CC', 'truck', 'East',
    18000.00, 62100.00, 160000.00, 'available',
    '11111111-0000-0000-0000-000000000001'
),
(
    '22222222-0000-0000-0000-000000000004',
    'Express Bike 04', 'Honda CB500', 'BIKE-004-DD', 'bike', 'West',
    150.00, 5200.00, 8500.00, 'available',
    '11111111-0000-0000-0000-000000000002'
),
(
    '22222222-0000-0000-0000-000000000005',
    'Delivery Van 05', 'Ford Transit', 'VAN-005-EE', 'van', 'Central',
    2800.00, 31000.00, 38000.00, 'available',
    '11111111-0000-0000-0000-000000000002'
);

INSERT INTO drivers (id, full_name, email, phone, license_number, license_expiry_date, status, safety_score) VALUES
(
    '33333333-0000-0000-0000-000000000001',
    'Ethan Brooks', 'ethan@drivers.io', '+1-555-0101', 'LIC-10001', '2026-08-15',
    'available', 97.50
),
(
    '33333333-0000-0000-0000-000000000002',
    'Fatima Hassan', 'fatima@drivers.io', '+1-555-0102', 'LIC-10002', '2025-12-31',
    'available', 100.00
),
(
    '33333333-0000-0000-0000-000000000003',
    'George Patel', 'george@drivers.io', '+1-555-0103', 'LIC-10003', '2027-03-20',
    'available', 88.00
),
(
    '33333333-0000-0000-0000-000000000004',
    'Hannah Nguyen', 'hannah@drivers.io', '+1-555-0104', 'LIC-10004', '2026-06-30',
    'available', 94.00
),
(
    '33333333-0000-0000-0000-000000000005',
    'Ivan Petrov', 'ivan@drivers.io', '+1-555-0105', 'LIC-10005', '2025-09-01',
    'available', 79.50
);

-- Trips (completed, so we can safely insert without triggering on_trip conflicts)
-- Using realistic but static lat/lon for distance_km GENERATED column

INSERT INTO trips (
    id, trip_code, vehicle_id, driver_id,
    origin, destination,
    origin_lat, origin_lon, dest_lat, dest_lon,
    cargo_weight_kg, status, revenue,
    scheduled_at, started_at, completed_at
) VALUES
(
    'AAAA0000-0000-0000-0000-000000000001',
    'TRP-2024-001',
    '22222222-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000001',
    'New York, NY', 'Philadelphia, PA',
    40.7128, -74.0060, 39.9526, -75.1652,
    15000.00, 'completed', 4200.00,
    '2024-01-10 06:00:00', '2024-01-10 06:30:00', '2024-01-10 10:45:00'
),
(
    'AAAA0000-0000-0000-0000-000000000002',
    'TRP-2024-002',
    '22222222-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000002',
    'Chicago, IL', 'Milwaukee, WI',
    41.8781, -87.6298, 43.0389, -87.9065,
    2800.00, 'completed', 980.00,
    '2024-01-12 08:00:00', '2024-01-12 08:15:00', '2024-01-12 10:30:00'
),
(
    'AAAA0000-0000-0000-0000-000000000003',
    'TRP-2024-003',
    '22222222-0000-0000-0000-000000000003',
    '33333333-0000-0000-0000-000000000003',
    'Los Angeles, CA', 'San Diego, CA',
    34.0522, -118.2437, 32.7157, -117.1611,
    12000.00, 'completed', 3100.00,
    '2024-01-15 07:00:00', '2024-01-15 07:20:00', '2024-01-15 10:10:00'
),
(
    'AAAA0000-0000-0000-0000-000000000004',
    'TRP-2024-004',
    '22222222-0000-0000-0000-000000000004',
    '33333333-0000-0000-0000-000000000004',
    'Austin, TX', 'San Antonio, TX',
    30.2672, -97.7431, 29.4241, -98.4936,
    100.00, 'completed', 220.00,
    '2024-01-18 09:00:00', '2024-01-18 09:10:00', '2024-01-18 11:05:00'
),
(
    'AAAA0000-0000-0000-0000-000000000005',
    'TRP-2024-005',
    '22222222-0000-0000-0000-000000000005',
    '33333333-0000-0000-0000-000000000005',
    'Seattle, WA', 'Portland, OR',
    47.6062, -122.3321, 45.5051, -122.6750,
    2500.00, 'completed', 1350.00,
    '2024-01-20 05:30:00', '2024-01-20 05:45:00', '2024-01-20 09:00:00'
),
(
    'AAAA0000-0000-0000-0000-000000000006',
    'TRP-2024-006',
    '22222222-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000002',
    'Boston, MA', 'Providence, RI',
    42.3601, -71.0589, 41.8240, -71.4128,
    17000.00, 'completed', 3800.00,
    '2024-02-01 06:00:00', '2024-02-01 06:20:00', '2024-02-01 08:40:00'
),
(
    'AAAA0000-0000-0000-0000-000000000007',
    'TRP-2024-007',
    '22222222-0000-0000-0000-000000000003',
    '33333333-0000-0000-0000-000000000001',
    'Dallas, TX', 'Houston, TX',
    32.7767, -96.7970, 29.7604, -95.3698,
    14500.00, 'completed', 4500.00,
    '2024-02-05 07:00:00', '2024-02-05 07:15:00', '2024-02-05 11:30:00'
),
(
    'AAAA0000-0000-0000-0000-000000000008',
    'TRP-2024-008',
    '22222222-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000003',
    'Denver, CO', 'Colorado Springs, CO',
    39.7392, -104.9903, 38.8339, -104.8214,
    3200.00, 'cancelled', NULL,
    '2024-02-10 09:00:00', NULL, NULL
),
(
    'AAAA0000-0000-0000-0000-000000000009',
    'TRP-2024-009',
    '22222222-0000-0000-0000-000000000005',
    '33333333-0000-0000-0000-000000000004',
    'Miami, FL', 'Fort Lauderdale, FL',
    25.7617, -80.1918, 26.1224, -80.1373,
    1800.00, 'completed', 650.00,
    '2024-02-14 10:00:00', '2024-02-14 10:10:00', '2024-02-14 11:15:00'
),
(
    'AAAA0000-0000-0000-0000-000000000010',
    'TRP-2024-010',
    '22222222-0000-0000-0000-000000000004',
    '33333333-0000-0000-0000-000000000005',
    'Phoenix, AZ', 'Tempe, AZ',
    33.4484, -112.0740, 33.4255, -111.9400,
    120.00, 'scheduled', NULL,
    '2024-03-01 08:00:00', NULL, NULL
);

-- Fuel logs
INSERT INTO fuel_logs (id, vehicle_id, trip_id, liters, cost_per_liter, total_cost, fueled_at, odometer_at_fill) VALUES
(
    'BBBB0000-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'AAAA0000-0000-0000-0000-000000000001',
    120.00, 1.45, 174.00, '2024-01-10 06:00:00', 45100.00
),
(
    'BBBB0000-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000002',
    'AAAA0000-0000-0000-0000-000000000002',
    55.00, 1.50, 82.50, '2024-01-12 08:00:00', 18800.00
),
(
    'BBBB0000-0000-0000-0000-000000000003',
    '22222222-0000-0000-0000-000000000003',
    'AAAA0000-0000-0000-0000-000000000003',
    100.00, 1.48, 148.00, '2024-01-15 07:00:00', 61900.00
),
(
    'BBBB0000-0000-0000-0000-000000000004',
    '22222222-0000-0000-0000-000000000004',
    'AAAA0000-0000-0000-0000-000000000004',
    8.00, 1.52, 12.16, '2024-01-18 09:00:00', 5180.00
),
(
    'BBBB0000-0000-0000-0000-000000000005',
    '22222222-0000-0000-0000-000000000005',
    'AAAA0000-0000-0000-0000-000000000005',
    70.00, 1.49, 104.30, '2024-01-20 05:30:00', 30920.00
),
(
    'BBBB0000-0000-0000-0000-000000000006',
    '22222222-0000-0000-0000-000000000001',
    'AAAA0000-0000-0000-0000-000000000006',
    115.00, 1.46, 167.90, '2024-02-01 06:00:00', 45380.00
),
(
    'BBBB0000-0000-0000-0000-000000000007',
    '22222222-0000-0000-0000-000000000003',
    'AAAA0000-0000-0000-0000-000000000007',
    130.00, 1.47, 191.10, '2024-02-05 07:00:00', 62220.00
);

-- Maintenance logs (completed — vehicle remains available)
INSERT INTO maintenance_logs (id, vehicle_id, description, cost, performed_by, scheduled_date, completed_date) VALUES
(
    'CCCC0000-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'Full engine service and oil change',
    850.00, 'TruckCare Workshop', '2024-01-05', '2024-01-07'
),
(
    'CCCC0000-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000003',
    'Brake system overhaul',
    1200.00, 'SpeedFix Garage', '2024-01-25', '2024-01-28'
),
(
    'CCCC0000-0000-0000-0000-000000000003',
    '22222222-0000-0000-0000-000000000002',
    'Tyre replacement — all four wheels',
    620.00, 'TyreKing', '2024-02-08', '2024-02-08'
),
(
    'CCCC0000-0000-0000-0000-000000000004',
    '22222222-0000-0000-0000-000000000005',
    'Transmission fluid flush and filter',
    390.00, 'QuickLube Pro', '2024-02-20', NULL  -- still in shop
);

-- Safety incidents (trigger will deduct from driver scores)
INSERT INTO safety_incidents (
    id, driver_id, trip_id, vehicle_id,
    description, severity, score_deduction, incident_date, reported_by
) VALUES
(
    'DDDD0000-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000003',
    'AAAA0000-0000-0000-0000-000000000003',
    '22222222-0000-0000-0000-000000000003',
    'Minor collision at loading dock — scraped bumper',
    'minor', 5.00, '2024-01-15 10:00:00',
    '11111111-0000-0000-0000-000000000003'
),
(
    'DDDD0000-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000005',
    'AAAA0000-0000-0000-0000-000000000005',
    '22222222-0000-0000-0000-000000000005',
    'Hard braking event recorded by telematics — near miss',
    'moderate', 12.00, '2024-01-20 07:45:00',
    '11111111-0000-0000-0000-000000000003'
),
(
    'DDDD0000-0000-0000-0000-000000000003',
    '33333333-0000-0000-0000-000000000001',
    'AAAA0000-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'Speeding infraction recorded — 20 km/h over limit',
    'minor', 3.00, '2024-01-10 09:00:00',
    '11111111-0000-0000-0000-000000000003'
),
(
    'DDDD0000-0000-0000-0000-000000000004',
    '33333333-0000-0000-0000-000000000004',
    'AAAA0000-0000-0000-0000-000000000009',
    '22222222-0000-0000-0000-000000000005',
    'Improper lane change causing other driver to brake',
    'moderate', 8.00, '2024-02-14 11:00:00',
    '11111111-0000-0000-0000-000000000003'
);

-- Password reset tokens (sample — not yet used)
INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES
(
    '11111111-0000-0000-0000-000000000002',
    encode(gen_random_bytes(32), 'hex'),
    NOW() + INTERVAL '1 hour'
);

-- ============================================================
-- END OF FleetFlow SCHEMA
-- ============================================================