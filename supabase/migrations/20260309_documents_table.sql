-- ============================================================
-- Documents table + Storage + RLS
-- Chạy trên Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tạo bảng documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  file_url text,
  issued_at date,
  expires_at date,
  notes text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 2. Thêm cột uploaded_by nếu bảng đã tồn tại
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES profiles(id);

-- 3. RLS cho documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "documents_update" ON documents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated USING (true);

-- 4. Storage bucket (cần tạo thủ công trong Supabase Dashboard nếu chưa có)
-- Vào Storage → New Bucket → tên: "documents", Public: ON
