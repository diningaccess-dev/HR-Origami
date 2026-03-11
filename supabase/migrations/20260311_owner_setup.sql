-- Upgrade nguyenmisa113@gmail.com to owner
UPDATE profiles
SET role = 'owner'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'nguyenmisa113@gmail.com'
);
