# Black Health Intelligence Portfolio

Premium dark-themed portfolio website showcasing healthcare innovations and ventures.

---

## 🎨 Design System

### Typography

| Element | Font | Weight | Usage |
|---------|------|--------|-------|
| **Headings (Chrome)** | Chakra Petch | 700 (Bold) | Hero titles, section headers |
| **Body Text** | Inter | 400 | Paragraphs, descriptions |
| **UI Elements** | Inter | 500-600 | Buttons, labels, nav links |

#### Font Loading

Fonts are loaded via `next/font/google` in `app/layout.tsx`:

```tsx
import { Inter, Chakra_Petch } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const chakraPetch = Chakra_Petch({ 
    subsets: ["latin"], 
    weight: ["300", "400", "500", "600", "700"], 
    variable: '--font-chakra' 
});
```

### Color Palette

| Variable | Hex | Usage |
|----------|-----|-------|
| `--deep-black` | `#0a0a0a` | Page backgrounds |
| `--charcoal` | `#1a1a1a` | Card backgrounds |
| `--metallic` | `#c0c0c0` | Metallic accents |
| `--slate-blue` | `#334155` | Primary buttons |
| `--electric-blue` | `#0ea5e9` | Accent highlights, hover states |
| `--deep-teal` | `#0f766e` | Secondary accents |
| `--gold` | `#eab308` | Premium highlights |

#### Tailwind Extended Colors

- `silver-300` to `silver-700`: Grayscale text hierarchy
- `charcoal`: Dark backgrounds with transparency support

### Heading Styles

#### `.heading-chrome` — Polished Chrome Effect

The signature metallic gradient text effect used on all major headings:

```css
.heading-chrome {
    font-family: var(--font-chakra), system-ui, sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    background: linear-gradient(
        180deg,
        #ffffff 0%,      /* Bright white top */
        #e8e8e8 15%,
        #d0d0d0 30%,
        #404040 48%,     /* Dark horizon band */
        #303030 52%,
        #808080 70%,     /* Silver reflection */
        #a0a0a0 85%,
        #c0c0c0 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: 
        drop-shadow(0 1px 0 rgba(255,255,255,0.4))
        drop-shadow(0 2px 2px rgba(0,0,0,0.5))
        drop-shadow(0 4px 4px rgba(0,0,0,0.3));
}
```

**Usage:**
```tsx
<h1 className="heading-chrome text-6xl md:text-8xl">BLACK HEALTH</h1>
```

#### Standard Heading Sizes

| Class | Mobile | Desktop |
|-------|--------|---------|
| `.heading-xl` | 3rem | 4.5rem |
| `.heading-lg` | 2.25rem | 3rem |
| `.heading-md` | 1.875rem | 2.25rem |
| `.heading-sm` | 1.5rem | 1.875rem |

### Card Styling

Cards feature a metallic floating border effect with hover animations:

```css
.card {
    @apply relative rounded-xl bg-charcoal/50 backdrop-blur-sm p-6;
    border: 1px solid transparent;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
}

.card::before {
    /* Metallic gradient border using mask technique */
    background: linear-gradient(145deg, 
        rgba(255,255,255,0.1) 0%,
        rgba(255,255,255,0.05) 45%,
        rgba(255,255,255,0.15) 55%,
        rgba(255,255,255,0.02) 100%
    );
}

.card:hover::before {
    /* Intensified glow on hover */
    background: linear-gradient(145deg,
        rgba(255,255,255,0.2) 0%,
        rgba(255,255,255,0.5) 50%,
        rgba(255,255,255,0.1) 100%
    );
    box-shadow: 0 0 15px rgba(255,255,255,0.15);
}
```

### Button Styles

| Class | Style |
|-------|-------|
| `.btn-primary` | Solid slate-blue with glow hover |
| `.btn-secondary` | Transparent with metallic border |

---

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (project logos)
- **Deployment**: Vercel
- **Animations**: Framer Motion

---

## 🚀 Getting Started

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

---

## 🔐 Admin Dashboard

### Access

1. Navigate to: `https://blackhealthintelligence.com/admin/login`
2. Login with your Supabase credentials:
   - **Email**: `downscale@icloud.com`
   - **Password**: Your Supabase auth password

### Dashboard Features

| Section | URL | Description |
|---------|-----|-------------|
| Dashboard | `/admin` | Overview with project counts |
| Projects | `/admin/projects` | List all portfolio projects |
| New Project | `/admin/projects/new` | Create a new project |
| Edit Project | `/admin/projects/[id]/edit` | Edit existing project |
| Solutions Page | `/admin/solutions` | Edit "Our Story" content sections |

---

## 📦 Adding Portfolio Projects

### Via Admin Dashboard

1. **Login** to the admin dashboard
2. Click **"Add New Project"**
3. Fill in the form:

#### Basic Information (Required)
| Field | Description |
|-------|-------------|
| **Project Logo** | Drag & drop PNG/JPG/SVG (max 10MB) |
| **Project Name** | e.g., "Downscale Weight Loss Clinic" |
| **Category** | Clinical Practice / Health SaaS / Other Ventures |
| **Subcategory** | Health-Related SaaS / Non-Health-Related SaaS (if Health SaaS) |
| **Short Description** | Brief text for card preview |
| **Status** | Active / In Development / Coming Soon / Archived |

#### Business Details (Optional)
| Field | Description |
|-------|-------------|
| Long Description | Detailed description for modal/detail view |
| Website URL | Link to live project |
| Problem It Solves | What pain point does this address? |
| Target Audience | Who is this for? |
| Build Details | Tech stack (e.g., "Next.js, Supabase, Tailwind") |
| Estimated Release | Date picker for upcoming projects |
| Revenue Stream | Subscription / One-time / Freemium |
| Market Scope | Local Australian / International / Both |
| Development Phase | Concept / MVP / Beta / Production |

#### Investment & Sale
| Field | Description |
|-------|-------------|
| Available for Sale | Toggle + price field |
| Seeking Investment | Toggle for partnership opportunities |

4. Click **"Create Project"**

### Project Display

Projects appear on the **Platform** page (`/platform`) grouped by:
- **Clinical Site**: Single featured clinical practice
- **Health-Related SaaS**: Health tech products
- **Non-Health-Related SaaS**: Other SaaS ventures

---

## 📁 Project Structure

```
├── app/
│   ├── admin/              # Admin dashboard pages
│   │   ├── login/          # Login page
│   │   ├── projects/       # Project CRUD
│   │   └── solutions/      # Solutions page editor
│   ├── platform/           # Portfolio display page
│   ├── solutions/          # "Our Story" page
│   ├── layout.tsx          # Root layout with fonts
│   ├── globals.css         # Global styles & design system
│   └── page.tsx            # Homepage
├── components/
│   ├── admin/              # Admin components
│   │   ├── ProjectForm.tsx # Create/edit form
│   │   └── ProjectList.tsx # Draggable project list
│   ├── sections/           # Page sections
│   │   ├── Hero.tsx        # Homepage hero
│   │   ├── About.tsx       # About section
│   │   └── PortfolioSection.tsx
│   ├── modals/             # Modal components
│   │   └── PartnerLoginModal.tsx
│   └── ui/                 # Reusable UI components
│       ├── Navigation.tsx  # Site navigation
│       ├── ProjectCard.tsx # Portfolio card
│       └── NeuralBackground.tsx
├── lib/
│   ├── supabase/           # Supabase clients
│   │   ├── client.ts       # Browser client
│   │   └── server.ts       # Server client
│   └── types.ts            # TypeScript types
├── public/
│   ├── LOGO.png            # Site logo (header, social sharing)
│   └── FAVICON.png         # Favicon
└── middleware.ts           # Auth middleware
```

---

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import the project in Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (optional, for SEO)

4. Deploy!

---

## ✨ Features

- 🎨 **Premium dark UI** with polished chrome metallic accents
- ✍️ **Chakra Petch font** for industrial heading style
- 🪞 **Metallic floating cards** with gradient borders
- 🎬 **Smooth animations** via Framer Motion
- 📱 **Fully responsive** design
- 🔐 **Secure admin** authentication
- 📊 **Full CRUD** for portfolio projects
- ↕️ **Drag & drop** project reordering
- 🖼️ **Logo upload** with drag & drop
- 🚀 **Optimized** for performance
- 🔍 **SEO-friendly** with Open Graph support

---

## 📜 Database Schema

### `projects` Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Project name |
| slug | text | URL-friendly slug |
| category | text | clinical / health-saas / other |
| subcategory | text | health-saas / non-health-saas |
| short_description | text | Card preview text |
| long_description | text | Full description |
| logo_url | text | Supabase storage URL |
| website_url | text | External link |
| status | text | active / development / coming-soon / archived |
| display_order | integer | Sort order |
| featured | boolean | Featured flag |
| problem_solves | text | Problem statement |
| target_audience | text | Target users |
| build_details | text | Tech stack |
| estimated_release | date | Release date |
| revenue_stream | text | Business model |
| market_scope | text | Local Australian / International / Both |
| for_sale | boolean | Available for purchase |
| sale_price | numeric | Sale price in AUD |
| investment_opportunity | boolean | Seeking investors |
| development_phase | text | concept / mvp / beta / production |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### `solutions_content` Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| section | text | company_mission / founder_bio / etc. |
| content | text | HTML content |
| display_order | integer | Sort order |

---

## 🔧 Customization

### Adding New Heading Styles

Edit `app/globals.css` in the `@layer components` section:

```css
.heading-custom {
    @apply font-bold tracking-tight;
    /* Add your custom styles */
}
```

### Changing the Chrome Gradient

Modify the `.heading-chrome` class in `globals.css`:
- Adjust the gradient color stops for different metallic effects
- Change the `drop-shadow` values for more/less 3D depth

---

## 📄 License

© 2025 Black Health Intelligence PTY LTD. All rights reserved.
