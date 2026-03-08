-- ============================================================
-- Migration: Add assigned_to column to checklist_templates
-- Cho phép Manager gán cố định nhân viên cho mỗi template
-- ============================================================

-- Thêm cột assigned_to: danh sách profile_id được gán
ALTER TABLE checklist_templates
ADD COLUMN IF NOT EXISTS assigned_to jsonb DEFAULT '[]';

-- Thêm cột location_id nếu chưa có (đảm bảo filter theo quán)
-- Column này đã tồn tại trong schema gốc, nhưng thêm IF NOT EXISTS cho an toàn
