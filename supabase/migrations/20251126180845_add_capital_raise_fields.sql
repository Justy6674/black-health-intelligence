-- Add capital raising fields to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS capital_raising BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS capital_raise_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS capital_raise_deadline DATE,
ADD COLUMN IF NOT EXISTS investment_details TEXT;

-- Add comment for documentation
COMMENT ON COLUMN projects.capital_raising IS 'Whether the project is currently raising capital';
COMMENT ON COLUMN projects.capital_raise_amount IS 'Target amount for capital raise in AUD';
COMMENT ON COLUMN projects.capital_raise_deadline IS 'Deadline for the capital raise';
COMMENT ON COLUMN projects.investment_details IS 'Details about the investment opportunity, what is being offered';


