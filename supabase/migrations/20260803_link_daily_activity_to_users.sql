-- Internal analytics identity link. This does not change any user-facing count.
-- A nullable user_id lets operations reporting count signed-in users by account
-- and guests by anonymous device without counting a signed-in device twice.

ALTER TABLE daily_user_activity
  ADD COLUMN IF NOT EXISTS has_practiced BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_user_activity_user_date
  ON daily_user_activity(user_id, date)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_user_activity_practiced_date
  ON daily_user_activity(date)
  WHERE has_practiced = true;

COMMENT ON COLUMN daily_user_activity.user_id IS
  'Verified Supabase auth user linked to this anonymous device for the activity date.';
