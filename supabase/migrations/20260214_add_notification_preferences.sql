-- Notification preferences for admin users (email opt-in/opt-out)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  clearing_report boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own row
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can read all rows (for sending bulk emails)
-- Service role bypasses RLS by default, so no extra policy needed.

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

COMMENT ON TABLE notification_preferences IS 'Admin user email notification opt-in/opt-out preferences';
