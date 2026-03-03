-- ============================================================
-- Migration: tip_pools — indexes + unique constraint + RLS
-- Bảng tip_pools đã tồn tại từ initial schema
-- ============================================================

-- ============================================================
-- 1. INDEXES + UNIQUE CONSTRAINT
-- ============================================================

-- Index theo location_id
CREATE INDEX IF NOT EXISTS idx_tip_pools_location_id ON tip_pools(location_id);

-- Index theo date
CREATE INDEX IF NOT EXISTS idx_tip_pools_date ON tip_pools(date);

-- Unique constraint: 1 quán chỉ có 1 tip pool mỗi ngày
ALTER TABLE tip_pools
  ADD CONSTRAINT uq_tip_pools_location_date UNIQUE (location_id, date);

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE tip_pools ENABLE ROW LEVEL SECURITY;

-- Manager/Owner của location: INSERT
CREATE POLICY "tip_pools_insert_manager" ON tip_pools
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner')
        AND p.status = 'active'
        AND p.location_id = tip_pools.location_id
    )
  );

-- Manager/Owner của location: SELECT tất cả
CREATE POLICY "tip_pools_select_manager" ON tip_pools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner')
        AND p.status = 'active'
        AND p.location_id = tip_pools.location_id
    )
  );

-- Staff/Azubi cùng location: SELECT chỉ khi profile_id nằm trong distributions
CREATE POLICY "tip_pools_select_own" ON tip_pools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('staff', 'azubi')
        AND p.status = 'active'
        AND p.location_id = tip_pools.location_id
    )
    AND tip_pools.distributions @> jsonb_build_array(
      jsonb_build_object('profile_id', auth.uid()::text)
    )
  );
