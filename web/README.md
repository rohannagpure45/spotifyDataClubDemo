# 🎵 Northeastern Data Club - Web Application

A Next.js web application for processing Google Forms responses and creating optimized music-based groups with user authentication and data persistence.

## ✨ Features

### 🔐 **Authentication System**
- **NextAuth.js** - Secure email/password authentication
- **User Profiles** - Major, year, and music preference tracking
- **Auto Account Creation** - Automatically creates accounts from Google Forms emails
- **Session Management** - Persistent login with route protection

### 📊 **Google Forms Integration**
- **CSV Upload** - Process Google Forms exports directly
- **Google Sheets URL** - Direct integration with live sheets
- **Email Mapping** - Links form responses to user accounts by email
- **Flexible Format** - Handles various question structures

### 🤖 **Advanced Group Formation**
- **Smart Algorithms** - Multi-factor compatibility scoring using cosine similarity
- **Music Analysis** - Genre overlap, artist similarity, and audio feature matching
- **Balanced Groups** - Considers diversity, cohesion, and member distribution
- **Configurable Sizes** - Support for 2-8 person groups
- **Intelligent Recommendations** - Playlist suggestions and activity ideas

### 🎨 **Modern UI/UX**
- Beautiful gradient backgrounds (purple → blue → indigo)
- Glassmorphism effects with backdrop blur
- Color-coded tabs with Lucide icons
- Responsive design (mobile + desktop)
- Professional typography and spacing
- Smooth transitions and hover effects

### 💾 **Data Persistence**
- **SQLite Database** - Local file-based database for demo simplicity
- **Prisma ORM** - Type-safe database operations with auto-generated client
- **User-Scoped Data** - Each user only sees their own groups and submissions
- **Form History** - Complete tracking of processed forms and responses

### 📥 **Export & Analysis**
- **CSV Download** - Complete group analysis with member details
- **Compatibility Metrics** - Detailed scoring and explanations
- **Activity Suggestions** - AI-generated recommendations for each group
- **Meeting Planning** - Optimal times and locations based on preferences

### 🛠️ **Tech Stack**
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: SQLite + Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **File Processing**: CSV parsing with email mapping
- **Build Tool**: Turbopack (enabled)

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── api/spotify/          # API routes for backend logic
│   │   ├── globals.css           # Global styles + Tailwind config
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Main dashboard
│   ├── components/ui/            # Reusable UI components
│   │   ├── card.tsx              # Card component
│   │   └── tabs.tsx              # Tabs component
│   └── lib/
│       └── utils.ts              # Utility functions
├── vercel.json                   # Vercel deployment config
└── package.json
```

## 🔌 API Routes

### GET `/api/spotify`
Query parameters:
- `?action=recent` - Get recent submissions
- `?action=stats` - Get aggregated statistics
- `?action=analysis` - Get clustering/analysis data
- `?action=leaderboard` - Get awards and leaderboard data

### POST `/api/spotify`
Submit new song entry:
```json
{
  "song": "Anti-Hero",
  "artist": "Taylor Swift",
  "major": "Computer Science",
  "name": "Alex"
}
```

## 🎨 Design System

### Colors
- **Primary Gradient**: Purple (900) → Blue (900) → Indigo (900)
- **Accent Colors**:
  - Green (400) - Live Feed
  - Blue (400) - Music Twin
  - Purple (400) - Analysis
  - Orange (400) - Major Guesser
  - Yellow (400) - Leaderboard

### Components
- **Cards**: Dark background with glassmorphism effects
- **Tabs**: Color-coded with icons and hover states
- **Typography**: Gradient text for headings, hierarchy for content

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub repository
2. Connect to Vercel
3. Deploy automatically

#### HTTPS and Auth on Vercel
- Set the following environment variables in your Vercel project settings:
  - `NEXTAUTH_URL` = `https://your-project-name.vercel.app`
  - `NEXTAUTH_SECRET` = a long random string
  - `AUTH_TRUST_HOST` = `true`
- This repo also enables:
  - Global HSTS headers to encourage HTTPS
  - Middleware redirect from HTTP → HTTPS for protected routes
  - Secure cookies via NextAuth when `NEXTAUTH_URL` uses HTTPS

## 🧑‍💼 Admin Guide: Accounts, Data, and Demos

### Claim Account Flow (Email → Auto Account → User Signup)
- When form responses are processed, the backend attempts to map each response by `email`:
  - If no user exists for that email, it creates an account with `autoCreated = true` and a random password.
  - If a user exists with placeholder values (e.g., `major = 'Undeclared'`, `year = 'Unknown'`), they are updated with form data when available.
- Later, the real user signs up via `/auth/signup` using the same email:
  - The signup route detects the `autoCreated` user and upgrades it with the provided password, preserving the profile fields from the forms.

### Safely Preload the Database (for demos)
- Minimal tables to link:
  - `User` — create one row per email appearing in the form data.
    - For accounts that should be “claimable” later, set `autoCreated = true` and use any placeholder password (it will be replaced at signup).
    - Placeholders used by the app: `major = 'Undeclared'`, `year = 'Unknown'` (these will be updated when form data exists).
  - `FormResponse` — store raw form JSON (string) and link with `userId` (the `User.id` you created or looked up).
  - `MusicSubmission` — optional but recommended; stores audio features per user (energy, valence, danceability, acousticness, tempo). Link with `userId`.
- Basic preload order:
  1) Insert/create `User` for each email (set `autoCreated=true`).
  2) Insert `FormResponse` rows referencing those users.
  3) Optionally insert `MusicSubmission` rows referencing those users.
- On signup, users with `autoCreated=true` will “claim” their account by setting a password.

### End‑to‑End Setup Checklist

1) Local development
- `cd web && npm install`
- `npx prisma generate && npx prisma db push`
- Create `web/.env.local` with at least:
  - `NEXTAUTH_SECRET="your-long-random-string"`
  - `NEXTAUTH_URL="http://localhost:3000"`
- `npm run dev` → open `http://localhost:3000`

2) Vercel deployment
- Connect repo to Vercel → set project env vars:
  - `NEXTAUTH_URL` = `https://your-project-name.vercel.app`
  - `NEXTAUTH_SECRET` = long random string
  - `AUTH_TRUST_HOST` = `true`
  - `DATABASE_URL` = production database (recommended: Postgres/Neon, MySQL/PlanetScale, or remote SQLite/Turso)
- Deploy. HTTPS is enforced via headers + middleware for protected routes.

3) Authentication
- The app uses NextAuth Credentials provider (email + password).
- Auto‑created users (from forms) will be upgraded at `/auth/signup` by signing up with the same email.

4) Database setup
- Dev: SQLite file `web/prisma/dev.db` is created by `npx prisma db push`.
- Prod: Use a hosted database and set `DATABASE_URL` in Vercel.
- Run `npx prisma generate` on deploy (Vercel automatically runs build commands; ensure Prisma client is generated).

5) Google Form questions (recommended)
- Required fields (exact header names for CSV compatibility):
  - `email` — used to link responses to users (required)
  - `name`
  - `major`
  - `year`
  - `genres` — comma‑separated string (e.g., `Pop, Electronic`)
  - `favorite_artists` — comma‑separated string
  - `favorite_song` — a single song title
  - Audio features as numbers in [0,1] unless noted:
    - `energy`
    - `valence`
    - `danceability`
    - `acousticness`
    - `tempo` (BPM, number)
- Notes:
  - CSV headers must match those keys exactly for the best mapping.
  - If using a Google Sheet URL in the dashboard, the current demo uses mock data (no real Google API calls yet). CSV upload is recommended for live demos.

6) Getting data into the database
- Automatic (recommended for demos):
  - Go to `/forms-processor`, upload the Google Forms CSV export, choose group size, and click Create Groups.
  - Or on the dashboard, use the “📥 Import + Process” (Sheets URL → mock data) option.
  - Processing will:
    - Create/update Users per response email (`autoCreated` if new)
    - Save `FormResponse` and `MusicSubmission` rows
    - Create and save Groups
- Manual preload (alternative):
  - Insert Users, FormResponses, and optional MusicSubmissions as described above.
  - Start the app; users can sign up and claim their accounts by email.

7) Shared groups visibility
- The API `GET /api/groups?public=true` returns recent groups across all users for demo sharing.
- The dashboard’s automatic 10s refresh and manual refresh both use the public scope to ensure one person’s processing is visible to everyone.

### API Quick Reference (demo scope)
- `POST /api/google/process-forms` — Process CSV/Sheets form data, map to users, persist responses and groups.
- `GET /api/groups?limit=50&public=true` — Fetch recent groups for demo viewing (across users).
- `POST /api/major/predict` — Predict a user’s major from features or latest submission. Requires a mapped FormResponse for the current user.

### Admin: Backfill Placeholder Profiles
- Some users may be created with placeholders (e.g., `major='Undeclared'`, `year='Unknown'`).
- To backfill these fields from the latest `FormResponse`:
  - Set `ADMIN_EMAILS` in your environment (comma‑separated list).
  - Call `POST /api/admin/backfill-placeholders` while authenticated as an admin email.
  - `GET /api/admin/backfill-placeholders` returns a quick summary (counts) without modifying data.
  - This updates only placeholder fields when valid values exist in the latest form JSON.

### Demo Tips & Pitfalls
- Prefer CSV uploads for live demos (Sheets URL uses mock responses in the current code).
- Avoid leaving “Auto‑import every 60s” running for long — it will keep creating new Groups; use manual refresh to browse saved groups.
- For the Major Predictor, ensure users have at least one `FormResponse` (and ideally some `MusicSubmission` rows) so the model has sufficient training data and the user is authorized to predict.


### Manual Deployment
```bash
# Build
npm run build

# Deploy build folder to any static hosting
```

## 🔮 Future Enhancements

### Data Visualization
- Interactive 3D clustering with Three.js
- Real-time charts with Recharts
- Animated data transitions

### Backend Integration
- Real Spotify API integration
- Google Sheets API for live data
- Machine learning model endpoints
- WebSocket for real-time updates

### Advanced Features
- Music Twin matching algorithm
- Major prediction ML model
- Advanced filtering and search
- Export functionality

## 🔧 Configuration

### Environment Variables
```bash
# Optional - for real Spotify API integration
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_API_URL=your_api_url
```

### Tailwind CSS v4
Uses the new `@theme` directive for custom properties:
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... custom design tokens */
}
```

## 📊 Performance

- **Next.js 15** with Turbopack for fast development
- **App Router** for optimized routing and loading
- **TypeScript** for type safety and better DX
- **Tailwind CSS** for optimal CSS bundling
- **Component-based architecture** for code reusability

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS
