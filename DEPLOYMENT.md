# Deployment Guide

## ✅ GitHub Repository Created

Your code is already pushed to: **https://github.com/Justy6674/black-health-intelligence**

## Prerequisites

- ✅ GitHub account (Justy6674)
- Vercel account (sign up at https://vercel.com if you don't have one)
- Supabase database set up (see DATABASE_SETUP.md)

## Step 1: GitHub Repository - COMPLETE ✅
```bash
gh repo create black-health-intelligence --public --source=. --remote=origin
git push -u origin main
```

### Option B: Using GitHub Web Interface
1. Go to https://github.com/new
2. Repository name: `black-health-intelligence`
3. Description: "Premium portfolio website for Black Health Intelligence"
4. Choose Public or Private
5. Do NOT initialize with README (we already have one)
6. Click "Create repository"

7. Then run these commands:
```bash
git remote add origin https://github.com/YOUR-USERNAME/black-health-intelligence.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### Connect Repository

1. Go to https://vercel.com/new

2. Click "Import Git Repository"

3. Find and select your `black-health-intelligence` repository

4. Click "Import"

### Configure Project

1. **Framework Preset**: Next.js (should auto-detect)

2. **Root Directory**: `./` (leave as default)

3. **Build Command**: `npm run build` (should auto-fill)

4. **Output Directory**: `.next` (should auto-fill)

### Add Environment Variables

Click "Environment Variables" and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cnjxbthwxpkartbapfmk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuanhidGh3eHBrYXJ0YmFwZm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMjg2MTcsImV4cCI6MjA3OTYwNDYxN30.a6rnOV-lgCwfJeti1Gh_hT3msyzfRi0iGknYTdBGIRs` |

### Deploy

1. Click "Deploy"

2. Wait for the build to complete (usually 2-3 minutes)

3. Once deployed, you'll get a URL like: `https://black-health-intelligence.vercel.app`

## Step 3: Configure Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"

2. Add your custom domain (e.g., `blackhealthintelligence.com`)

3. Follow Vercel's instructions to update your DNS records

4. Wait for DNS propagation (can take up to 48 hours)

## Step 4: Test Production Site

1. Visit your Vercel URL

2. Test the public homepage

3. Test admin login at `/admin/login`

4. Verify all projects display correctly

5. Test creating/editing/deleting projects

## Automatic Deployments

From now on, every time you push to the `main` branch:
- Vercel will automatically build and deploy your changes
- You'll get a preview URL for each deployment
- Production will update once the build succeeds

## Troubleshooting

### Build Fails
- Check the build logs in Vercel dashboard
- Ensure environment variables are set correctly
- Verify the database schema is applied in Supabase

### Admin Login Not Working
- Verify Supabase environment variables are correct
- Check that you created an admin user in Supabase
- Clear browser cookies and try again

### Images Not Loading
- Verify the Supabase Storage bucket is public
- Check that `next.config.ts` has the correct Supabase domain
- Ensure RLS policies allow public read access

## Support

For issues with:
- **Next.js**: https://nextjs.org/docs
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
