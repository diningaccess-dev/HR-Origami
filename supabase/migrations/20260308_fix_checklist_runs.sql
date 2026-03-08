-- ============================================================
-- Fix: Tạo lại bảng checklist_runs nếu thiếu hoặc sai schema
-- ============================================================

-- Tạo bảng checklist_runs nếu chưa có
CREATE TABLE IF NOT EXISTS checklist_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed_items jsonb NOT NULL DEFAULT '[]',
  progress integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Đảm bảo có constraint unique (template_id, date)
-- để mỗi template chỉ có 1 run mỗi ngày
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'checklist_runs_template_date_unique'
  ) THEN
    ALTER TABLE checklist_runs
    ADD CONSTRAINT checklist_runs_template_date_unique
    UNIQUE (template_id, date);
  END IF;
END $$;

-- Thêm cột nếu thiếu (cho trường hợp bảng đã tồn tại)
ALTER TABLE checklist_runs ADD COLUMN IF NOT EXISTS date date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE checklist_runs ADD COLUMN IF NOT EXISTS completed_items jsonb NOT NULL DEFAULT '[]';
ALTER TABLE checklist_runs ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;

-- RLS policies: cho phép mọi authenticated user đọc/ghi
ALTER TABLE checklist_runs ENABLE ROW LEVEL SECURITY;

-- Drop cũ nếu có (tránh lỗi duplicate)
DROP POLICY IF EXISTS "checklist_runs_select" ON checklist_runs;
DROP POLICY IF EXISTS "checklist_runs_insert" ON checklist_runs;
DROP POLICY IF EXISTS "checklist_runs_update" ON checklist_runs;

CREATE POLICY "checklist_runs_select" ON checklist_runs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "checklist_runs_insert" ON checklist_runs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "checklist_runs_update" ON checklist_runs
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS cho checklist_templates nếu chưa có
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_templates_select" ON checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_insert" ON checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_update" ON checklist_templates;
DROP POLICY IF EXISTS "checklist_templates_delete" ON checklist_templates;

CREATE POLICY "checklist_templates_select" ON checklist_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "checklist_templates_insert" ON checklist_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "checklist_templates_update" ON checklist_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "checklist_templates_delete" ON checklist_templates
  FOR DELETE USING (auth.role() = 'authenticated');
