-- Budget Expansion: debts, recurring items, category mapping, budget envelopes

-- ── Debts ──
CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender text NOT NULL,
  balance_cents bigint NOT NULL DEFAULT 0,
  interest_rate numeric(6,3) NOT NULL DEFAULT 0,
  compounding text NOT NULL DEFAULT 'monthly' CHECK (compounding IN ('monthly', 'daily')),
  min_payment_cents bigint NOT NULL DEFAULT 0,
  payment_frequency text NOT NULL DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'fortnightly', 'monthly')),
  due_day integer CHECK (due_day >= 1 AND due_day <= 31),
  priority integer NOT NULL DEFAULT 0,
  account_up_id text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Recurring Items ──
CREATE TABLE IF NOT EXISTS recurring_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents bigint NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually')),
  category_up_id text,
  account_up_id text,
  next_due_date date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Category Mapping Rules ──
CREATE TABLE IF NOT EXISTS category_mapping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  category_up_id text NOT NULL,
  merchant_label text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Budget Envelopes ──
CREATE TABLE IF NOT EXISTS budget_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  monthly_allocation_cents bigint NOT NULL DEFAULT 0,
  colour text DEFAULT '#64748b',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Budget Envelope Categories (join table) ──
CREATE TABLE IF NOT EXISTS budget_envelope_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id uuid NOT NULL REFERENCES budget_envelopes(id) ON DELETE CASCADE,
  category_up_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (envelope_id, category_up_id)
);

-- ── RLS ──
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_mapping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_envelope_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage debts"
  ON debts FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage recurring items"
  ON recurring_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage category mapping rules"
  ON category_mapping_rules FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage budget envelopes"
  ON budget_envelopes FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage budget envelope categories"
  ON budget_envelope_categories FOR ALL TO authenticated USING (true);

-- ── Seed default envelopes ──
INSERT INTO budget_envelopes (name, sort_order, colour) VALUES
  ('Fixed Essentials', 1, '#ef4444'),
  ('Variable Lifestyle', 2, '#f59e0b'),
  ('Business', 3, '#3b82f6'),
  ('Savings & Goals', 4, '#22c55e'),
  ('Debts', 5, '#a855f7');

-- ── Comments ──
COMMENT ON TABLE debts IS 'Track debts with interest rates for payoff simulation';
COMMENT ON TABLE recurring_items IS 'Recurring income and expense items for cash flow projection';
COMMENT ON TABLE category_mapping_rules IS 'ILIKE patterns to auto-assign Up category overrides during sync';
COMMENT ON TABLE budget_envelopes IS 'Budget envelope groupings for category spending';
COMMENT ON TABLE budget_envelope_categories IS 'Maps Up categories to budget envelopes';
