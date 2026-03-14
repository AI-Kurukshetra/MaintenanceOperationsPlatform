-- 002_seed_sample_data.sql
-- Seeds linked demo data for CMMS schema
-- UP
BEGIN;

-- Auth users (bcrypt via pgcrypto)
WITH ins AS (
  INSERT INTO auth.users (
    id, instance_id, role, aud, email,
    encrypted_password, email_confirmed_at, confirmation_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated','admin@demo.com', crypt('Password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated','manager@demo.com', crypt('Password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated','tech@demo.com', crypt('Password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}','{}')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
SELECT 1;

-- Profiles
INSERT INTO public.profiles (id, full_name, email, role, department, phone, hourly_rate)
VALUES
('11111111-1111-1111-1111-111111111111', 'Alice Admin', 'admin@demo.com', 'admin', 'Operations', '+1-555-1001', 85),
('22222222-2222-2222-2222-222222222222', 'Maya Manager', 'manager@demo.com', 'manager', 'Production', '+1-555-1002', 70),
('33333333-3333-3333-3333-333333333333', 'Tom Technician', 'tech@demo.com', 'technician', 'Maintenance', '+1-555-1003', 45)
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO public.locations (id, name, city, state, country)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'HQ', 'Austin', 'TX', 'USA'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Plant A', 'Austin', 'TX', 'USA'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Plant A - Line 1', 'Austin', 'TX', 'USA')
ON CONFLICT (id) DO NOTHING;

-- Vendors
INSERT INTO public.vendors (id, name, email, phone, city, state, country, category, rating)
VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Acme Parts Co.', 'sales@acmeparts.com', '+1-555-2001', 'Dallas','TX','USA','parts_supplier',4.6),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Prime Service LLC', 'support@primeservice.com', '+1-555-2002', 'Houston','TX','USA','service_provider',4.8)
ON CONFLICT (id) DO NOTHING;

-- Assets
INSERT INTO public.assets (
  id, name, asset_code, category, status, criticality, location_id, manufacturer, model, serial_number, purchase_date, purchase_cost, warranty_expiry, created_by
) VALUES
('cccccccc-cccc-cccc-cccc-ccccccccccc1','Boiler #1','AST-BOIL-001','machinery','operational','high','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','ThermoTech','BT-500','SN-BOIL-500','2022-03-01',45000,'2027-03-01','11111111-1111-1111-1111-111111111111'),
('cccccccc-cccc-cccc-cccc-ccccccccccc2','Conveyor Line 1','AST-CON-101','machinery','needs_repair','critical','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','MoveMax','CV-200','SN-CON-200','2021-06-15',32000,'2026-06-15','22222222-2222-2222-2222-222222222222'),
('cccccccc-cccc-cccc-cccc-ccccccccccc3','HQ HVAC','AST-HVAC-001','hvac','operational','medium','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','CoolAir','HV-900','SN-HVAC-900','2020-09-10',18000,'2025-09-10','11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Maintenance plans
INSERT INTO public.maintenance_plans (
  id, name, description, asset_id, type, frequency_value, frequency_unit, next_due_date, last_performed_at, is_active, assigned_to, checklist, wo_title_template, wo_description_template, wo_priority, created_by
) VALUES
('dddddddd-dddd-dddd-dddd-ddddddddddd1','Monthly HVAC PM','Replace filters & inspect belts','cccccccc-cccc-cccc-cccc-ccccccccccc3','time_based',1,'months', now() + interval '15 days', now() - interval '30 days', true, '33333333-3333-3333-3333-333333333333','["Replace filters","Inspect belts","Check refrigerant"]','HVAC PM - {{asset}}','Perform monthly HVAC maintenance','medium','11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Parts
INSERT INTO public.parts (id, name, part_number, description, unit_cost, quantity_on_hand, minimum_quantity, location_id, vendor_id)
VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1','6205 Bearing','BR-6205','Standard bearing',12.50,120,25,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2','HVAC Air Filter 20x20','AF-2020','MERV 11 filter',18.00,60,20,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1')
ON CONFLICT (id) DO NOTHING;

-- Work orders
INSERT INTO public.work_orders (
  id, wo_number, title, description, type, status, priority, asset_id, location_id, assigned_to, requested_by, due_date, started_at, estimated_hours, labor_cost, parts_cost
) VALUES
('ffffffff-ffff-ffff-ffff-fffffffffff1','WO-1001','Fix conveyor belt drift','Belt misaligned on Line 1','reactive','in_progress','high','cccccccc-cccc-cccc-cccc-ccccccccccc2','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222', now() + interval '2 days', now() - interval '1 hours', 6, 270, 0),
('ffffffff-ffff-ffff-ffff-fffffffffff2','WO-1002','Monthly HVAC PM','Auto-generated PM','preventive','open','medium','cccccccc-cccc-cccc-cccc-ccccccccccc3','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111', now() + interval '7 days', null, 3, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Work order parts
INSERT INTO public.work_order_parts (id, work_order_id, part_id, quantity_used, unit_cost)
VALUES
('10101010-0000-0000-0000-000000000001','ffffffff-ffff-ffff-ffff-fffffffffff1','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',8,12.50),
('10101010-0000-0000-0000-000000000002','ffffffff-ffff-ffff-ffff-fffffffffff2','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',2,18.00)
ON CONFLICT (id) DO NOTHING;

-- Maintenance history
INSERT INTO public.maintenance_history (id, asset_id, work_order_id, action, performed_by, performed_at, notes, downtime_minutes)
VALUES
('12121212-0000-0000-0000-000000000001','cccccccc-cccc-cccc-cccc-ccccccccccc2','ffffffff-ffff-ffff-ffff-fffffffffff1','Inspection','33333333-3333-3333-3333-333333333333', now() - interval '30 minutes','Verified belt tension',20)
ON CONFLICT (id) DO NOTHING;

-- Documents
INSERT INTO public.documents (id, name, file_url, file_type, entity_type, entity_id, uploaded_by)
VALUES
('13131313-0000-0000-0000-000000000001','Conveyor Manual','https://example.com/docs/conveyor.pdf','pdf','asset','cccccccc-cccc-cccc-cccc-ccccccccccc2','22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Notifications
INSERT INTO public.notifications (id, user_id, type, title, message, entity_type, entity_id, is_read)
VALUES
('14141414-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','work_order','WO Assigned','You were assigned to WO-1001','work_order','ffffffff-ffff-ffff-ffff-fffffffffff1',false)
ON CONFLICT (id) DO NOTHING;

-- Work order activities
INSERT INTO public.work_order_activities (id, work_order_id, user_id, activity_type, description)
VALUES
('15151515-0000-0000-0000-000000000001','ffffffff-ffff-ffff-ffff-fffffffffff1','33333333-3333-3333-3333-333333333333','status_change','Status set to in_progress by Tom')
ON CONFLICT (id) DO NOTHING;

-- Inventory transactions
INSERT INTO public.inventory_transactions (id, part_id, user_id, quantity, transaction_type, notes)
VALUES
('16161616-0000-0000-0000-000000000001','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1','33333333-3333-3333-3333-333333333333',-8,'remove','Used for WO-1001'),
('16161616-0000-0000-0000-000000000002','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2','11111111-1111-1111-1111-111111111111',+40,'add','Received monthly filter stock')
ON CONFLICT (id) DO NOTHING;

-- Vendor contracts
INSERT INTO public.vendor_contracts (id, vendor_id, asset_id, contract_number, start_date, end_date, amount, terms)
VALUES
('17171717-0000-0000-0000-000000000001','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2','cccccccc-cccc-cccc-cccc-ccccccccccc3','HVAC-SVC-2024','2024-01-01','2025-01-01',12000,'Quarterly service + emergency callouts')
ON CONFLICT (id) DO NOTHING;

-- Budgets
INSERT INTO public.budgets (id, name, location_id, year, month, amount, spent, category)
VALUES
('18181818-0000-0000-0000-000000000001','Plant A Maintenance','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',2026,3,25000,5000,'total')
ON CONFLICT (id) DO NOTHING;

-- Notification preferences
INSERT INTO public.notification_preferences (id, user_id, email_enabled, sms_enabled, push_enabled, work_order_notifications, maintenance_notifications, inventory_notifications, system_notifications)
VALUES
('19191919-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333',true,true,true,true,true,true,true)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- DOWN (removes only seeded rows)
BEGIN;
DELETE FROM public.notification_preferences WHERE user_id = '33333333-3333-3333-3333-333333333333';
DELETE FROM public.budgets WHERE id IN ('18181818-0000-0000-0000-000000000001');
DELETE FROM public.vendor_contracts WHERE id IN ('17171717-0000-0000-0000-000000000001');
DELETE FROM public.inventory_transactions WHERE id IN ('16161616-0000-0000-0000-000000000001','16161616-0000-0000-000000000002');
DELETE FROM public.work_order_activities WHERE id IN ('15151515-0000-0000-0000-000000000001');
DELETE FROM public.notifications WHERE id IN ('14141414-0000-0000-0000-000000000001');
DELETE FROM public.documents WHERE id IN ('13131313-0000-0000-0000-000000000001');
DELETE FROM public.maintenance_history WHERE id IN ('12121212-0000-0000-0000-000000000001');
DELETE FROM public.work_order_parts WHERE id IN ('10101010-0000-0000-0000-000000000001','10101010-0000-0000-0000-000000000002');
DELETE FROM public.work_orders WHERE id IN ('ffffffff-ffff-ffff-ffff-fffffffffff1','ffffffff-ffff-ffff-ffff-fffffffffff2');
DELETE FROM public.parts WHERE id IN ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2');
DELETE FROM public.maintenance_plans WHERE id IN ('dddddddd-dddd-dddd-dddd-ddddddddddd1');
DELETE FROM public.assets WHERE id IN ('cccccccc-cccc-cccc-cccc-ccccccccccc1','cccccccc-cccc-cccc-cccc-ccccccccccc2','cccccccc-cccc-cccc-cccc-ccccccccccc3');
DELETE FROM public.vendors WHERE id IN ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2');
DELETE FROM public.locations WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3');
DELETE FROM public.profiles WHERE id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
COMMIT;
