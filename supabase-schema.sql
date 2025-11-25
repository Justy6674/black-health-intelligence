-- Black Health Intelligence Portfolio Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('clinical', 'health-saas', 'other')),
  subcategory TEXT CHECK (subcategory IN ('health-saas', 'non-health-saas')),
  short_description TEXT NOT NULL,
  long_description TEXT,
  logo_url TEXT,
  website_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'development', 'coming-soon', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  problem_solves TEXT,
  target_audience TEXT,
  build_details TEXT,
  estimated_release DATE,
  revenue_stream TEXT,
  market_scope TEXT CHECK (market_scope IN ('Local Australian', 'International', 'Both')),
  for_sale BOOLEAN DEFAULT false,
  sale_price DECIMAL(12, 2),
  investment_opportunity BOOLEAN DEFAULT false,
  development_phase TEXT CHECK (development_phase IN ('concept', 'mvp', 'beta', 'production')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solutions content table
CREATE TABLE IF NOT EXISTS solutions_content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section TEXT NOT NULL UNIQUE CHECK (section IN ('company_mission', 'founder_bio', 'career_history', 'downscale_history', 'clinical_governance', 'software_journey', 'bec_story', 'vision')),
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site settings table (optional, for future use)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for project logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view active projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON projects;
DROP POLICY IF EXISTS "Public can view solutions content" ON solutions_content;
DROP POLICY IF EXISTS "Authenticated users can manage solutions content" ON solutions_content;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON site_settings;

-- RLS policies for projects
-- Public can view non-archived projects
CREATE POLICY "Public can view active projects"
  ON projects FOR SELECT
  USING (status != 'archived');

-- Authenticated users can do everything with projects
CREATE POLICY "Authenticated users can manage projects"
  ON projects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for solutions_content
-- Public can view all solutions content
CREATE POLICY "Public can view solutions content"
  ON solutions_content FOR SELECT
  USING (true);

-- Authenticated users can manage solutions content
CREATE POLICY "Authenticated users can manage solutions content"
  ON solutions_content FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for site_settings
CREATE POLICY "Authenticated users can manage settings"
  ON site_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Storage policies
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;

CREATE POLICY "Public can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-logos');

CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-logos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'project-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-logos' AND auth.role() = 'authenticated');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_subcategory ON projects(subcategory);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_display_order ON projects(display_order);
CREATE INDEX IF NOT EXISTS idx_solutions_content_section ON solutions_content(section);
CREATE INDEX IF NOT EXISTS idx_solutions_content_display_order ON solutions_content(display_order);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_solutions_content_updated_at ON solutions_content;
CREATE TRIGGER update_solutions_content_updated_at
    BEFORE UPDATE ON solutions_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
