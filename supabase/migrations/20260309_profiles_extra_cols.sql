-- ============================================================
-- Profiles: thêm cột cho quản lý nhân viên
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday date;
