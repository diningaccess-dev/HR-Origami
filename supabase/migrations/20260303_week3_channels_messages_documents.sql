-- ============================================================
-- Migration: Tuần 3 — channels, messages, documents
-- Thêm indexes + RLS policies cho 3 bảng đã tồn tại
-- ============================================================

-- ============================================================
-- 1. INDEXES
-- ============================================================

-- channels: tìm theo location nhanh hơn
CREATE INDEX IF NOT EXISTS idx_channels_location_id ON channels(location_id);

-- messages: truy vấn theo channel + sắp xếp theo thời gian
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- documents: tìm theo profile + kiểm tra hết hạn
CREATE INDEX IF NOT EXISTS idx_documents_profile_id ON documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON documents(expires_at);

-- ============================================================
-- 2. RLS — CHANNELS
-- ============================================================

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Manager/owner cùng location mới được tạo channel
CREATE POLICY "channels_insert_manager" ON channels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner')
        AND p.status = 'active'
        AND p.location_id = channels.location_id
    )
  );

-- Tất cả active user cùng location được xem channel
CREATE POLICY "channels_select_location" ON channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.location_id = channels.location_id
    )
  );

-- ============================================================
-- 3. RLS — MESSAGES
-- ============================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- User cùng location được xem messages
CREATE POLICY "messages_select_location" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN profiles p ON p.location_id = c.location_id
      WHERE c.id = messages.channel_id
        AND p.id = auth.uid()
        AND p.status = 'active'
    )
  );

-- Active user được gửi message vào channel của location mình
CREATE POLICY "messages_insert_own_location" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN profiles p ON p.location_id = c.location_id
      WHERE c.id = messages.channel_id
        AND p.id = auth.uid()
        AND p.status = 'active'
    )
  );

-- ============================================================
-- 4. RLS — DOCUMENTS (bổ sung policy mới)
-- ============================================================

-- documents đã enable RLS ở migration trước
-- Thêm policy: user xem document của mình
CREATE POLICY "documents_select_own" ON documents
  FOR SELECT USING (profile_id = auth.uid());

-- Manager/owner xem toàn bộ documents trong location
CREATE POLICY "documents_select_manager" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN profiles doc_owner ON doc_owner.id = documents.profile_id
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner')
        AND p.location_id = doc_owner.location_id
    )
  );
