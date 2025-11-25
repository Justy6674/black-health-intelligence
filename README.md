# Black Health Intelligence Portfolio

Premium dark-themed portfolio website showcasing healthcare innovations and ventures.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Vercel
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd black-health-intelligence
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Set up the database:
- Go to your Supabase project dashboard
- Navigate to SQL Editor
- Run the SQL script from `supabase-schema.sql`

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Admin Access

1. Create an admin user in Supabase:
   - Go to Authentication > Users
   - Add a new user with email/password

2. Access the admin dashboard:
   - Navigate to `/admin/login`
   - Log in with your credentials
   - Manage projects at `/admin/projects`

## Project Structure

```
├── app/
│   ├── admin/           # Admin dashboard pages
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Homepage
├── components/
│   ├── admin/           # Admin components
│   ├── sections/        # Page sections
│   └── ui/              # Reusable UI components
├── lib/
│   ├── supabase/        # Supabase clients
│   └── types.ts         # TypeScript types
└── middleware.ts        # Auth middleware

```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. Configure environment variables:
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Deploy!

## Features

- ✨ Premium dark UI with metallic accents
- 🎨 Smooth animations and transitions
- 📱 Fully responsive design
- 🔐 Secure admin authentication
- 📊 Full CRUD for portfolio projects
- ↕️ Drag & drop project reordering
- 🖼️ Logo upload with drag & drop
- 🚀 Optimized for performance
- 🔍 SEO-friendly

## License

© 2025 Black Health Intelligence PTY LTD. All rights reserved.
