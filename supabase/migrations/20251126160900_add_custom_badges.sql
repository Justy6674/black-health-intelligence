-- Add custom_badges column for fully customisable badge system
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_badges jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN projects.custom_badges IS 'Array of custom badges with text, color, and effect properties';
