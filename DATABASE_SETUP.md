# Database Setup Instructions

## Step 1: Run the Database Schema

You need to run the SQL schema in your Supabase project to create the necessary tables and storage.

1. Go to your Supabase project: https://supabase.com/dashboard/project/cnjxbthwxpkartbapfmk

2. Navigate to **SQL Editor** in the left sidebar

3. Click **New Query**

4. Copy the entire contents of `supabase-schema.sql` and paste it into the SQL editor

5. Click **Run** to execute the schema

This will create:
- `projects` table with all necessary columns
- `site_settings` table (for future use)
- `project-logos` storage bucket for logo uploads
- Row Level Security (RLS) policies
- Indexes for better performance
- Triggers for automatic timestamp updates

## Step 2: Create an Admin User

1. In Supabase dashboard, go to **Authentication** > **Users**

2. Click **Add User** > **Create new user**

3. Enter your email and password

4. Click **Create user**

5. You can now log in to the admin dashboard at `http://localhost:3002/admin/login`

## Step 3: Test the Application

The dev server is running at: **http://localhost:3002**

### Test Public Website:
1. Visit http://localhost:3002
2. You should see the Hero section with animated background
3. Since there are no projects yet, only Hero, About, and Footer sections will show

### Test Admin Dashboard:
1. Visit http://localhost:3002/admin/login
2. Log in with the credentials you created
3. You should be redirected to the admin dashboard
4. Click "Add New Project" to create your first project
5. Fill in the form and upload a logo
6. Submit and verify it appears on the homepage

## Step 4: Add Your Projects

You can now add all your portfolio projects through the admin dashboard:

### Clinical Practice:
- **Downscale Weight Loss Clinic**
  - Category: Clinical Practice
  - Status: Active
  - Website: https://downscale.com.au (or your actual URL)

### Health SaaS:
- **Abe.AI** - AI-powered health assistant
- **Telecheck** - Telehealth platform
- **Endorse Me** - Healthcare credentialing
- **Path Pal** - Patient pathway management

### Other Ventures:
- **Scent Swap** - Fragrance exchange platform
- **Vibe Code Plan** - Wellness planning tool

## Next Steps

Once you've tested locally and added your projects, you're ready to:
1. Create a GitHub repository
2. Push your code
3. Deploy to Vercel
4. Configure environment variables in Vercel
5. Your portfolio will be live!
