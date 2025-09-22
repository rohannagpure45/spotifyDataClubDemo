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
