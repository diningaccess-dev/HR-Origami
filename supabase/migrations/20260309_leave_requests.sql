-- ============================================================
-- Leave Requests (Urlaub / Nghỉ phép)
-- ============================================================

-- 1. Bảng đơn nghỉ phép
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  type text NOT NULL DEFAULT 'urlaub',        -- urlaub, krank, sonderurlaub
  start_date date NOT NULL,
  end_date date NOT NULL,
  days int NOT NULL DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',     -- pending, approved, rejected
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_select" ON leave_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "leave_insert" ON leave_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "leave_update" ON leave_requests
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "leave_delete" ON leave_requests
  FOR DELETE TO authenticated USING (true);

-- 3. Thêm cột leave_days_per_year vào profiles (mặc định = 24 ngày cho Đức)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leave_days_per_year int DEFAULT 24;
