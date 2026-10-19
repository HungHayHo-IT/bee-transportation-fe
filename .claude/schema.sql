-- BeeOps - Schema PostgreSQL (10 bang). Web van hanh noi bo, vai chuc user.
-- Chi dung Postgres: khong Redis, khong message queue, khong object storage.
-- Chay: psql -d beeops -f schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS citext;

-- =====================================================================
-- 1. TO CHUC & DANH MUC  (F7 - Admin tu cau hinh)
-- =====================================================================

CREATE TABLE departments (
  id          serial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  manager_id  int,                                  -- FK users, gan sau
  -- Ma tran dinh tuyen F2: cac dich vu phong nay phu trach.
  -- Mang thay cho bang department_services -> Admin tick checkbox roi luu 1 dong.
  service_ids int[] NOT NULL DEFAULT '{}',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX departments_services_idx ON departments USING gin (service_ids);

CREATE TABLE users (
  id            serial PRIMARY KEY,
  email         citext NOT NULL UNIQUE,
  full_name     text NOT NULL,
  phone         text,
  password_hash text NOT NULL,
  department_id int REFERENCES departments(id),
  -- 1 nguoi kiem nhieu vai tro -> mang, don gian hon bang user_roles
  roles         text[] NOT NULL DEFAULT '{}',
  can_view_company_report boolean NOT NULL DEFAULT false,  -- co "Xem bao cao cong ty"
  email_off     text[] NOT NULL DEFAULT '{}',      -- cac loai thong bao tat email
  must_change_password boolean NOT NULL DEFAULT true,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_roles_ck CHECK (
    roles <@ ARRAY['admin','leader','manager','sale','staff']::text[])
);
ALTER TABLE departments
  ADD CONSTRAINT departments_manager_fk FOREIGN KEY (manager_id) REFERENCES users(id);

CREATE TABLE services (
  id         serial PRIMARY KEY,
  code       text NOT NULL UNIQUE,                  -- DOM, CBT, CUS... (tien to ma don)
  name       text NOT NULL,
  sla_hours  int  NOT NULL DEFAULT 24,              -- han phong ban phai tiep nhan
  -- Mau bo moc tien do (muc 7). Copy sang order_milestones khi chot don,
  -- nen sua o day khong anh huong don da chot.
  milestones text[] NOT NULL DEFAULT '{}',
  sort_order int  NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true
);

CREATE TABLE customers (
  id           serial PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text,
  phone        text,
  email        text,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_name_idx ON customers (lower(company_name));

-- =====================================================================
-- 2. DON HANG  (F1, F4, F5)
-- =====================================================================

CREATE TABLE orders (
  id          bigserial PRIMARY KEY,
  code        text NOT NULL UNIQUE,                 -- DOM-20260821-003
  order_day   date NOT NULL DEFAULT current_date,   -- ngay trong ma don
  daily_no    int  NOT NULL,                        -- STT trong ngay theo dich vu
  service_id  int  NOT NULL REFERENCES services(id),
  customer_id int  REFERENCES customers(id),
  created_by  int  NOT NULL REFERENCES users(id),   -- sale tao don

  -- 3 trang thai ket thuc: completed | rejected | cancelled
  -- rejected = khach tu choi (vao mau so win rate)
  -- cancelled = huy noi bo, nhap nham, khach huy nhu cau (NGOAI win rate)
  status text NOT NULL DEFAULT 'new' CHECK (status IN (
    'new','distributed','quoting','awaiting_selection','awaiting_customer',
    'closed','in_progress','completed','rejected','cancelled')),

  -- Tuyen van chuyen (chuan hoa de so khop don gia tham khao)
  origin_province      text,
  origin_address       text,
  destination_province text,
  destination_address  text,
  desired_date         date,

  -- 4 truong so co dinh (khong bat buoc) - can cu khop gia tham khao (F3)
  weight_kg      numeric(12,2),
  volume_cbm     numeric(12,2),
  package_count  int,
  container_type text,                              -- 20 / 40 / NULL
  dim_l_m        numeric(8,2),
  dim_w_m        numeric(8,2),
  dim_h_m        numeric(8,2),

  goods_name text,
  note       text,                                  -- ghi chu tu do, KHONG dung de so khop
  source     text CHECK (source IN ('website','hotline','email','existing')),
  -- File dinh kem: [{"name":..,"path":..,"mime":..,"size":..,"by":1,"at":".."}]
  -- Luu tren dia, DB chi giu metadata.
  files jsonb NOT NULL DEFAULT '[]',

  -- Ket qua chot (F4)
  department_id int REFERENCES departments(id),     -- phong thang = phong phu trach
  final_amount  numeric(15,0),                      -- DOANH THU (VND), khoa khi chot
  closed_at     timestamptz,
  completed_at  timestamptz,
  reject_reason text,                               -- chi dung khi status='rejected'
  close_note    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX orders_daily_no_uk ON orders (service_id, order_day, daily_no);
CREATE INDEX orders_status_idx   ON orders (status);
CREATE INDEX orders_service_idx  ON orders (service_id, closed_at DESC);
CREATE INDEX orders_sale_idx     ON orders (created_by, created_at DESC);
CREATE INDEX orders_dept_idx     ON orders (department_id, closed_at DESC);
CREATE INDEX orders_customer_idx ON orders (customer_id);
CREATE INDEX orders_route_idx    ON orders (origin_province, destination_province);

-- Sinh ma don. Khoa theo (dich vu, ngay) nen 2 sale tao don cung luc khong trung ma;
-- khoa tu nha khi transaction ket thuc. Rollback khong lam nhay so.
CREATE FUNCTION next_daily_no(p_service_id int, p_day date DEFAULT current_date)
RETURNS int LANGUAGE plpgsql AS $fn$
DECLARE v_no int;
BEGIN
  PERFORM pg_advisory_xact_lock(
    p_service_id::bigint * 100000000 + to_char(p_day, 'YYYYMMDD')::bigint);
  SELECT COALESCE(max(daily_no), 0) + 1 INTO v_no
    FROM orders WHERE service_id = p_service_id AND order_day = p_day;
  RETURN v_no;
END $fn$;

CREATE FUNCTION order_code(p_service_id int, p_day date, p_no int)
RETURNS text LANGUAGE sql STABLE AS $fn$
  SELECT s.code || '-' || to_char(p_day, 'YYYYMMDD') || '-' || lpad(p_no::text, 3, '0')
  FROM services s WHERE s.id = p_service_id;
$fn$;

-- =====================================================================
-- 3. PHAN PHOI + BAO GIA  (F2 + F3 gop chung mot bang)
-- =====================================================================

-- Moi phong duoc phan phoi don = 1 dong; bao gia hien tai nam ngay tren dong do.
-- Khong tach bang quotes: 1 phong chi co 1 bao gia dang hieu luc, cac ban cu
-- day xuong quote_history nen man hinh so sanh cua sale chi can 1 query.
CREATE TABLE order_departments (
  order_id      bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  department_id int    NOT NULL REFERENCES departments(id),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN (
    'pending','claimed','quoted','passed','won','lost')),
  assignee_id int REFERENCES users(id),             -- nhan vien duoc gan / tu nhan
  pass_reason text,                                 -- ly do phong bo qua
  is_manual   boolean NOT NULL DEFAULT false,       -- Admin them ngoai cau hinh

  -- Bao gia hien tai (F3)
  amount        numeric(15,0) CHECK (amount > 0),   -- gia tri don hang (VND)
  scope_note    text,                               -- bao gom / khong bao gom
  lead_time     text,                               -- thoi gian thuc hien du kien
  valid_until   date,
  quote_version int NOT NULL DEFAULT 0,             -- 0 = chua bao gia
  -- Cac ban cu: [{"version":1,"amount":..,"scope_note":..,"by":1,"at":".."}]
  quote_history jsonb NOT NULL DEFAULT '[]',

  -- Do thoi gian phan hoi cho dashboard F6 va canh bao SLA
  distributed_at timestamptz NOT NULL DEFAULT now(),
  claimed_at      timestamptz,
  first_quoted_at timestamptz,                      -- moc SLA bao gia
  last_quoted_at  timestamptz,                      -- lan cap nhat gia gan nhat
  PRIMARY KEY (order_id, department_id)
);
CREATE INDEX order_departments_queue_idx ON order_departments (department_id, state);

-- =====================================================================
-- 4. THUC HIEN  (F5 - moc tien do)
-- =====================================================================

-- Copy tu services.milestones ngay khi CHOT don -> don da chot giu bo moc cu
CREATE TABLE order_milestones (
  id       bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seq      int  NOT NULL,
  name     text NOT NULL,
  status   text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','skipped')),
  note     text,
  files    jsonb NOT NULL DEFAULT '[]',             -- bien ban, anh POD
  done_by  int REFERENCES users(id),
  done_at  timestamptz,
  UNIQUE (order_id, seq)
);

-- =====================================================================
-- 5. TRAO DOI, THONG BAO, NHAT KY  (F8 + minh bach)
-- =====================================================================

-- Thao luan tren don, tach luong theo phong (department_id NULL = luong chung).
-- kind='revision_request' chinh la yeu cau sale gui phong dieu chinh gia.
CREATE TABLE comments (
  id            bigserial PRIMARY KEY,
  order_id      bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  department_id int    REFERENCES departments(id),
  user_id       int NOT NULL REFERENCES users(id),
  kind          text NOT NULL DEFAULT 'comment'
                CHECK (kind IN ('comment','revision_request')),
  body          text NOT NULL,
  mentions      int[] NOT NULL DEFAULT '{}',        -- user id duoc @mention
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_order_idx ON comments (order_id, created_at);

CREATE TABLE notifications (
  id         bigserial PRIMARY KEY,
  user_id    int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   bigint REFERENCES orders(id) ON DELETE CASCADE,
  type       text NOT NULL,                         -- new_order, quote_received, sla_late...
  title      text NOT NULL,
  body       text,
  is_read    boolean NOT NULL DEFAULT false,
  emailed_at timestamptz,                           -- NULL = chua gui SMTP
  -- Chong nhac lap cho thong bao lap theo thoi gian (sla_late, quote_expired).
  -- Vi du: 'sla_late:<order_id>:<department_id>:<user_id>'.
  -- NULL voi thong bao thuong -> moi lan la mot su kien moi.
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_inbox_idx  ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX notifications_outbox_idx ON notifications (created_at) WHERE emailed_at IS NULL;
CREATE UNIQUE INDEX notifications_dedupe_uk ON notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Vua la audit log quan tri, vua la dong thoi gian hoat dong cua don (F5)
CREATE TABLE activity_log (
  id        bigserial PRIMARY KEY,
  order_id  bigint REFERENCES orders(id) ON DELETE CASCADE,  -- NULL = viec quan tri
  entity    text NOT NULL,                          -- orders, users, departments...
  entity_id text NOT NULL,
  action    text NOT NULL,                          -- create, update, quote, close...
  actor_id  int REFERENCES users(id),
  detail    jsonb,                                  -- {"field": [cu, moi]}
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_order_idx  ON activity_log (order_id, created_at DESC);
CREATE INDEX activity_entity_idx ON activity_log (entity, entity_id, created_at DESC);

-- =====================================================================
-- Da bo so voi ban 18 bang (chuc nang van giu nguyen):
--   order_seq             -> pg_advisory_xact_lock + orders.daily_no
--   department_services   -> departments.service_ids int[]
--   service_milestones    -> services.milestones text[]
--   quotes                -> gop vao order_departments (+ quote_history jsonb)
--   quote_revision_requests -> comments.kind = 'revision_request'
--   attachments           -> orders.files / order_milestones.files jsonb
--   reject_reasons        -> orders.reject_reason text (danh sach co dinh o app)
--   notification_prefs    -> users.email_off text[]
--   settings              -> cau hinh o app (che do bao gia mo la giai doan 2)
--   sessions              -> cookie ky (signed cookie), khong luu DB
-- =====================================================================
