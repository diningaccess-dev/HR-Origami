-- ============================================================
-- Migration: Auto-create profile when auth user signs up
-- + Backfill profiles for existing auth users
-- ============================================================

-- ============================================================
-- 1. TRIGGER: Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    location_id,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'staff',          -- Default role — manager duyệt sau
    'enso',            -- Default location — manager đổi sau
    'pending'          -- Pending = chờ duyệt
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger cũ nếu có
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Tạo trigger mới
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. BACKFILL: Tạo profile cho auth users đã tồn tại
-- ============================================================

INSERT INTO public.profiles (id, email, full_name, role, location_id, status)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email::text, '@', 1)),
  'staff',
  'enso',
  'pending'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
