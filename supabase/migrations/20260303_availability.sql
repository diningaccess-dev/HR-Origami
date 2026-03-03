-- ============================================================
-- Migration: availability table
-- Nhân viên đánh dấu ngày rảnh/bận trong tháng
-- ============================================================

-- ── Tạo bảng ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        date    NOT NULL,
  is_available bool   NOT NULL DEFAULT true,
  note        text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (profile_id, date)
);

-- ── Index ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_availability_profile_id ON availability(profile_id);
CREATE INDEX IF NOT EXISTS idx_availability_date       ON availability(date);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Nhân viên tự INSERT/UPDATE/DELETE ngày của mình
CREATE POLICY "availability_own_write" ON availability
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Manager/Owner xem availability toàn location
CREATE POLICY "availability_manager_select" ON availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN profiles target ON target.id = availability.profile_id
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner')
        AND p.location_id = target.location_id
    )
  );
