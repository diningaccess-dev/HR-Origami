-- ============================================================
-- FIX: Infinite recursion in RLS policies for checklist_runs
-- Chạy trên Supabase Dashboard → SQL Editor
-- ============================================================

-- BƯỚC 1: XÓA TẤT CẢ policies cũ trên checklist_runs
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'checklist_runs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON checklist_runs', pol.policyname);
  END LOOP;
END $$;

-- BƯỚC 2: XÓA TẤT CẢ policies cũ trên checklist_templates
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'checklist_templates'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON checklist_templates', pol.policyname);
  END LOOP;
END $$;

-- BƯỚC 3: Tạo policies MỚI cho checklist_runs
ALTER TABLE checklist_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runs_select" ON checklist_runs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "runs_insert" ON checklist_runs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "runs_update" ON checklist_runs
  FOR UPDATE TO authenticated USING (true);

-- BƯỚC 4: Tạo policies MỚI cho checklist_templates
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON checklist_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_insert" ON checklist_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "templates_update" ON checklist_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "templates_delete" ON checklist_templates
  FOR DELETE TO authenticated USING (true);
