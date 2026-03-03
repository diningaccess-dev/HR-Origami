-- ============================================================
-- Migration: push_subscriptions table
-- Lưu Web Push subscription của từng user/device
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now(),
  -- Mỗi device (endpoint) chỉ lưu 1 lần
  UNIQUE (profile_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile_id ON push_subscriptions(profile_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- User tự quản lý subscription của mình
CREATE POLICY "push_own_manage" ON push_subscriptions
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Service role (API) có thể đọc để gửi push (dùng service_role key)
-- Không cần policy riêng vì route.ts dùng SUPABASE_SERVICE_ROLE_KEY
