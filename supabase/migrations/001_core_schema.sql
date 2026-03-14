
-- 001_core_schema.sql
-- Comprehensive core schema for CMMS platform
-- Designed to be idempotent where possible for fresh Supabase databases.

BEGIN;

-- =====================================================
-- Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- STEP 1: ENUM TYPES
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'technician', 'viewer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_category') THEN
    CREATE TYPE public.asset_category AS ENUM ('machinery', 'electrical', 'hvac', 'plumbing', 'vehicle', 'safety', 'other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status') THEN
    CREATE TYPE public.asset_status AS ENUM ('operational', 'needs_repair', 'under_maintenance', 'decommissioned');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'criticality_level') THEN
    CREATE TYPE public.criticality_level AS ENUM ('critical', 'high', 'medium', 'low');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wo_type') THEN
    CREATE TYPE public.wo_type AS ENUM ('reactive', 'preventive', 'predictive', 'inspection', 'emergency');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wo_status') THEN
    CREATE TYPE public.wo_status AS ENUM ('open', 'in_progress', 'on_hold', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wo_priority') THEN
    CREATE TYPE public.wo_priority AS ENUM ('critical', 'high', 'medium', 'low');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_type') THEN
    CREATE TYPE public.pm_type AS ENUM ('time_based', 'usage_based', 'condition_based');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'frequency_unit') THEN
    CREATE TYPE public.frequency_unit AS ENUM ('days', 'weeks', 'months', 'years', 'hours', 'cycles');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
    CREATE TYPE public.entity_type AS ENUM ('asset', 'work_order', 'maintenance_plan', 'location');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM ('work_order', 'maintenance', 'inventory', 'system');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_category') THEN
    CREATE TYPE public.vendor_category AS ENUM ('parts_supplier', 'service_provider', 'equipment_manufacturer', 'contractor', 'other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE public.activity_type AS ENUM ('status_change', 'comment', 'parts_update', 'attachment', 'assignment_change');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_tx_type') THEN
    CREATE TYPE public.inventory_tx_type AS ENUM ('add', 'remove', 'set');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'budget_category') THEN
    CREATE TYPE public.budget_category AS ENUM ('labor', 'parts', 'contractor', 'total');
  END IF;
END
$$;

-- =====================================================
-- STEP 2: TABLES (DEPENDENCY ORDER)
-- =====================================================

-- 1) profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'technician',
  department text,
  phone text,
  avatar_url text,
  hourly_rate numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) locations
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  state text,
  country text,
  parent_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) vendors
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text,
  category public.vendor_category,
  rating numeric CHECK (rating >= 1 AND rating <= 5),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) assets
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_code text UNIQUE NOT NULL,
  description text,
  category public.asset_category NOT NULL,
  status public.asset_status NOT NULL DEFAULT 'operational',
  criticality public.criticality_level NOT NULL DEFAULT 'medium',
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  parent_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  manufacturer text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_cost numeric,
  warranty_expiry date,
  expected_lifespan_years int,
  qr_code text,
  image_url text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) work_orders
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  type public.wo_type NOT NULL,
  status public.wo_status NOT NULL DEFAULT 'open',
  priority public.wo_priority NOT NULL DEFAULT 'medium',
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  estimated_hours numeric,
  actual_hours numeric,
  labor_cost numeric NOT NULL DEFAULT 0,
  parts_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (labor_cost + parts_cost) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- 6) maintenance_plans
CREATE TABLE IF NOT EXISTS public.maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  type public.pm_type NOT NULL,
  frequency_value int,
  frequency_unit public.frequency_unit,
  next_due_date timestamptz,
  last_performed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  wo_title_template text,
  wo_description_template text,
  wo_priority public.wo_priority NOT NULL DEFAULT 'medium',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7) parts
CREATE TABLE IF NOT EXISTS public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  part_number text UNIQUE,
  description text,
  category text,
  unit_cost numeric NOT NULL DEFAULT 0,
  quantity_on_hand int NOT NULL DEFAULT 0,
  minimum_quantity int NOT NULL DEFAULT 0,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  supplier text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8) work_order_parts
CREATE TABLE IF NOT EXISTS public.work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  part_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  quantity_used int NOT NULL,
  unit_cost numeric,
  total_cost numeric GENERATED ALWAYS AS (quantity_used * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9) maintenance_history
CREATE TABLE IF NOT EXISTS public.maintenance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  action text NOT NULL,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  downtime_minutes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10) documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  entity_type public.entity_type NOT NULL,
  entity_id uuid NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11) notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type public.notification_type,
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12) work_order_activities
CREATE TABLE IF NOT EXISTS public.work_order_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type public.activity_type NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13) inventory_transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  type public.inventory_tx_type NOT NULL,
  quantity_change int NOT NULL,
  quantity_before int NOT NULL,
  quantity_after int NOT NULL,
  reason text,
  notes text,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 14) vendor_contracts
CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date,
  end_date date,
  value numeric,
  document_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 15) budgets
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  year int NOT NULL,
  month int,
  amount numeric NOT NULL,
  spent numeric NOT NULL DEFAULT 0,
  category public.budget_category,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 16) notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  wo_assigned boolean NOT NULL DEFAULT true,
  wo_completed boolean NOT NULL DEFAULT true,
  pm_due boolean NOT NULL DEFAULT true,
  low_stock boolean NOT NULL DEFAULT true,
  wo_overdue boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 17) company_settings (singleton)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'My Company',
  default_currency text NOT NULL DEFAULT 'USD',
  default_timezone text NOT NULL DEFAULT 'UTC',
  date_format text NOT NULL DEFAULT 'MM/dd/yyyy',
  wo_prefix text NOT NULL DEFAULT 'WO',
  asset_prefix text NOT NULL DEFAULT 'AST',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- STEP 3: TRIGGER FUNCTIONS + TRIGGERS
-- =====================================================

-- a) Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- b/c) Sequences for generated codes
CREATE SEQUENCE IF NOT EXISTS public.asset_code_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.wo_number_seq START WITH 1 INCREMENT BY 1;

-- b) Generate asset code trigger function
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.asset_code IS NULL OR btrim(NEW.asset_code) = '' THEN
    NEW.asset_code = 'AST-' || lpad(nextval('public.asset_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- c) Generate work order number trigger function
CREATE OR REPLACE FUNCTION public.generate_wo_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.wo_number IS NULL OR btrim(NEW.wo_number) = '' THEN
    NEW.wo_number = 'WO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.wo_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- d) Handle new auth.users row by creating profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
-- updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_locations_updated_at ON public.locations;
CREATE TRIGGER trg_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON public.vendors;
CREATE TRIGGER trg_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
CREATE TRIGGER trg_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_maintenance_plans_updated_at ON public.maintenance_plans;
CREATE TRIGGER trg_maintenance_plans_updated_at
BEFORE UPDATE ON public.maintenance_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_parts_updated_at ON public.parts;
CREATE TRIGGER trg_parts_updated_at
BEFORE UPDATE ON public.parts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER trg_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- code generation triggers
DROP TRIGGER IF EXISTS trg_assets_generate_code ON public.assets;
CREATE TRIGGER trg_assets_generate_code
BEFORE INSERT ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.generate_asset_code();

DROP TRIGGER IF EXISTS trg_work_orders_generate_number ON public.work_orders;
CREATE TRIGGER trg_work_orders_generate_number
BEFORE INSERT ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.generate_wo_number();

-- auth.users trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 4: INDEXES
-- =====================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_locations_parent_location_id ON public.locations(parent_location_id);

CREATE INDEX IF NOT EXISTS idx_assets_location_id ON public.assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_parent_asset_id ON public.assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON public.assets(created_by);

CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON public.work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_location_id ON public.work_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_requested_by ON public.work_orders(requested_by);

CREATE INDEX IF NOT EXISTS idx_maintenance_plans_asset_id ON public.maintenance_plans(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_assigned_to ON public.maintenance_plans(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_created_by ON public.maintenance_plans(created_by);

CREATE INDEX IF NOT EXISTS idx_parts_location_id ON public.parts(location_id);
CREATE INDEX IF NOT EXISTS idx_parts_vendor_id ON public.parts(vendor_id);

CREATE INDEX IF NOT EXISTS idx_work_order_parts_work_order_id ON public.work_order_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_parts_part_id ON public.work_order_parts(part_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_history_asset_id_fk ON public.maintenance_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_work_order_id_fk ON public.maintenance_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_performed_by ON public.maintenance_history(performed_by);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_fk ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_work_order_activities_work_order_id ON public.work_order_activities(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_activities_user_id ON public.work_order_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_part_id ON public.inventory_transactions(part_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_work_order_id ON public.inventory_transactions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON public.inventory_transactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id ON public.vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_budgets_location_id ON public.budgets(location_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Requested domain indexes
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_criticality ON public.assets(criticality);
CREATE INDEX IF NOT EXISTS idx_assets_location_id_domain ON public.assets(location_id);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_type ON public.work_orders(type);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to_domain ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id_domain ON public.work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON public.work_orders(due_date);

CREATE INDEX IF NOT EXISTS idx_maintenance_plans_next_due_date ON public.maintenance_plans(next_due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_is_active ON public.maintenance_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_asset_id_domain ON public.maintenance_plans(asset_id);

CREATE INDEX IF NOT EXISTS idx_parts_quantity_on_hand ON public.parts(quantity_on_hand);
CREATE INDEX IF NOT EXISTS idx_parts_minimum_quantity ON public.parts(minimum_quantity);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_domain ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_maintenance_history_asset_id_domain ON public.maintenance_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_work_order_id_domain ON public.maintenance_history(work_order_id);
-- =====================================================
-- STEP 5: RLS + POLICIES
-- =====================================================

-- Helper function used by policies
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all
ON public.profiles
FOR ALL
TO authenticated
USING (public.get_user_role() = 'admin')
WITH CHECK (public.get_user_role() = 'admin');

-- Generic table policies for all other tables
DROP POLICY IF EXISTS locations_select_authenticated ON public.locations;
CREATE POLICY locations_select_authenticated ON public.locations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS locations_admin_manager_write ON public.locations;
CREATE POLICY locations_admin_manager_write ON public.locations FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS vendors_select_authenticated ON public.vendors;
CREATE POLICY vendors_select_authenticated ON public.vendors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS vendors_admin_manager_write ON public.vendors;
CREATE POLICY vendors_admin_manager_write ON public.vendors FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS assets_select_authenticated ON public.assets;
CREATE POLICY assets_select_authenticated ON public.assets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS assets_admin_manager_write ON public.assets;
CREATE POLICY assets_admin_manager_write ON public.assets FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS work_orders_select_authenticated ON public.work_orders;
CREATE POLICY work_orders_select_authenticated ON public.work_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS work_orders_admin_manager_write ON public.work_orders;
CREATE POLICY work_orders_admin_manager_write ON public.work_orders FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS work_orders_technician_update_assigned ON public.work_orders;
CREATE POLICY work_orders_technician_update_assigned
ON public.work_orders
FOR UPDATE
TO authenticated
USING (public.get_user_role() = 'technician' AND assigned_to = auth.uid())
WITH CHECK (public.get_user_role() = 'technician' AND assigned_to = auth.uid());

DROP POLICY IF EXISTS maintenance_plans_select_authenticated ON public.maintenance_plans;
CREATE POLICY maintenance_plans_select_authenticated ON public.maintenance_plans FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS maintenance_plans_admin_manager_write ON public.maintenance_plans;
CREATE POLICY maintenance_plans_admin_manager_write ON public.maintenance_plans FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS parts_select_authenticated ON public.parts;
CREATE POLICY parts_select_authenticated ON public.parts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS parts_admin_manager_write ON public.parts;
CREATE POLICY parts_admin_manager_write ON public.parts FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS work_order_parts_select_authenticated ON public.work_order_parts;
CREATE POLICY work_order_parts_select_authenticated ON public.work_order_parts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS work_order_parts_admin_manager_write ON public.work_order_parts;
CREATE POLICY work_order_parts_admin_manager_write ON public.work_order_parts FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS maintenance_history_select_authenticated ON public.maintenance_history;
CREATE POLICY maintenance_history_select_authenticated ON public.maintenance_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS maintenance_history_admin_manager_write ON public.maintenance_history;
CREATE POLICY maintenance_history_admin_manager_write ON public.maintenance_history FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS documents_select_authenticated ON public.documents;
CREATE POLICY documents_select_authenticated ON public.documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS documents_admin_manager_write ON public.documents;
CREATE POLICY documents_admin_manager_write ON public.documents FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS notifications_select_authenticated ON public.notifications;
CREATE POLICY notifications_select_authenticated
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.get_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS notifications_admin_manager_write ON public.notifications;
CREATE POLICY notifications_admin_manager_write ON public.notifications FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS work_order_activities_select_authenticated ON public.work_order_activities;
CREATE POLICY work_order_activities_select_authenticated ON public.work_order_activities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS work_order_activities_admin_manager_write ON public.work_order_activities;
CREATE POLICY work_order_activities_admin_manager_write ON public.work_order_activities FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS inventory_transactions_select_authenticated ON public.inventory_transactions;
CREATE POLICY inventory_transactions_select_authenticated ON public.inventory_transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS inventory_transactions_admin_manager_write ON public.inventory_transactions;
CREATE POLICY inventory_transactions_admin_manager_write ON public.inventory_transactions FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS vendor_contracts_select_authenticated ON public.vendor_contracts;
CREATE POLICY vendor_contracts_select_authenticated ON public.vendor_contracts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS vendor_contracts_admin_manager_write ON public.vendor_contracts;
CREATE POLICY vendor_contracts_admin_manager_write ON public.vendor_contracts FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS budgets_select_authenticated ON public.budgets;
CREATE POLICY budgets_select_authenticated ON public.budgets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS budgets_admin_manager_write ON public.budgets;
CREATE POLICY budgets_admin_manager_write ON public.budgets FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS notification_preferences_select_authenticated ON public.notification_preferences;
CREATE POLICY notification_preferences_select_authenticated
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.get_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS notification_preferences_admin_manager_write ON public.notification_preferences;
CREATE POLICY notification_preferences_admin_manager_write ON public.notification_preferences FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS company_settings_select_authenticated ON public.company_settings;
CREATE POLICY company_settings_select_authenticated ON public.company_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS company_settings_admin_manager_write ON public.company_settings;
CREATE POLICY company_settings_admin_manager_write ON public.company_settings FOR ALL TO authenticated USING (public.get_user_role() IN ('admin', 'manager')) WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

-- =====================================================
-- STEP 6: DEFAULT COMPANY SETTINGS ROW
-- =====================================================
INSERT INTO public.company_settings (
  id,
  company_name,
  default_currency,
  default_timezone,
  date_format,
  wo_prefix,
  asset_prefix
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'My Company',
  'USD',
  'UTC',
  'MM/dd/yyyy',
  'WO',
  'AST'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- DOWN (manual rollback reference only; keep commented for Supabase forward-only migrations)
-- DROP TABLE IF EXISTS public.company_settings CASCADE;
-- DROP TABLE IF EXISTS public.notification_preferences CASCADE;
-- DROP TABLE IF EXISTS public.budgets CASCADE;
-- DROP TABLE IF EXISTS public.vendor_contracts CASCADE;
-- DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
-- DROP TABLE IF EXISTS public.work_order_activities CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.documents CASCADE;
-- DROP TABLE IF EXISTS public.maintenance_history CASCADE;
-- DROP TABLE IF EXISTS public.work_order_parts CASCADE;
-- DROP TABLE IF EXISTS public.parts CASCADE;
-- DROP TABLE IF EXISTS public.maintenance_plans CASCADE;
-- DROP TABLE IF EXISTS public.work_orders CASCADE;
-- DROP TABLE IF EXISTS public.assets CASCADE;
-- DROP TABLE IF EXISTS public.vendors CASCADE;
-- DROP TABLE IF EXISTS public.locations CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
