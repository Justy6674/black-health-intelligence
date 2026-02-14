-- ATO Budget Tracker: business expense rules and per-transaction flags

-- Business expense pattern rules (ILIKE patterns for matching Up Bank descriptions)
CREATE TABLE IF NOT EXISTS business_expense_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  merchant_name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Per-transaction business expense flags (user overrides)
CREATE TABLE IF NOT EXISTS business_expense_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_up_id text NOT NULL UNIQUE,
  is_business boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE business_expense_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_expense_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage rules"
  ON business_expense_rules FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage flags"
  ON business_expense_flags FOR ALL
  TO authenticated
  USING (true);

-- Seed known business expense patterns
INSERT INTO business_expense_rules (pattern, merchant_name, category) VALUES
  ('%GITHUB%', 'GitHub', 'Software'),
  ('%SUPABASE%', 'Supabase', 'Software'),
  ('%VERCEL%', 'Vercel', 'Software'),
  ('%GOOGLE%WORKSPACE%', 'Google Workspace', 'Software'),
  ('%GOOGLE%CLOUD%', 'Google Cloud', 'Software'),
  ('%SHOPIFY%', 'Shopify', 'Software'),
  ('%JOTFORM%', 'Jotform', 'Software'),
  ('%GODADDY%', 'GoDaddy', 'Software'),
  ('%FACEBOOK%', 'Facebook Ads', 'Marketing'),
  ('%FACEBK%', 'Facebook Ads', 'Marketing'),
  ('%META%ADS%', 'Meta Ads', 'Marketing'),
  ('%GOOGLE%ADS%', 'Google Ads', 'Marketing'),
  ('%SUNCORP%', 'Suncorp Insurance', 'Insurance'),
  ('%ALINTA%', 'Alinta Energy', 'Utilities'),
  ('%CANVA%', 'Canva', 'Software'),
  ('%SLACK%', 'Slack', 'Software'),
  ('%NOTION%', 'Notion', 'Software'),
  ('%FIGMA%', 'Figma', 'Software'),
  ('%RESEND%', 'Resend', 'Software'),
  ('%STRIPE%', 'Stripe', 'Software'),
  ('%OPENAI%', 'OpenAI', 'Software'),
  ('%ANTHROPIC%', 'Anthropic', 'Software'),
  ('%KNOCK%', 'Knock', 'Software'),
  ('%AMAZON WEB%', 'AWS', 'Software'),
  ('%MICROSOFT%', 'Microsoft', 'Software'),
  ('%ZOOM%', 'Zoom', 'Software');

COMMENT ON TABLE business_expense_rules IS 'ILIKE patterns to match Up Bank descriptions as business expenses';
COMMENT ON TABLE business_expense_flags IS 'Per-transaction overrides for business expense classification';
