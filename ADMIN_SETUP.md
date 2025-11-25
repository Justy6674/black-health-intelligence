# Admin User Setup Instructions

## Create Your Admin Account in Supabase

You need to create the admin user account in your Supabase dashboard. Here's how:

### Step 1: Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard/project/cnjxbthwxpkartbapfmk
2. Navigate to **Authentication** in the left sidebar
3. Click on **Users**

### Step 2: Create New User
1. Click **"Add User"** button (top right)
2. Select **"Create new user"**
3. Fill in:
   - **Email**: `downscale@icloud.com`
   - **Password**: `IloveBB0307$$`
   - **Auto Confirm User**: ✅ Check this box (so you don't need email verification)
4. Click **"Create user"**

### Step 3: Login to Admin Dashboard
1. Go to: http://localhost:3003/admin/login
2. Enter:
   - Email: `downscale@icloud.com`
   - Password: `IloveBB0307$$`
3. Click **"Login"**

You'll be redirected to the admin dashboard where you can:
- Manage projects
- Edit Solutions page content
- Upload logos
- Add all your portfolio details

---

## Important: Run Database Schema First!

Before you can use the admin panel, make sure you've run the updated database schema:

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste and click **Run**

This creates all the new tables and columns needed for the enhanced project management.

