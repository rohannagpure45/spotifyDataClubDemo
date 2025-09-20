# 🎵 Spotify Music DNA Analysis - Web Dashboard

A modern Next.js reimplementation of the Spotify Data Club Demo with improved UI/UX and Vercel deployment capabilities.

## ✨ Features

### 📊 **Interactive Dashboard**
- **🎯 Live Feed** - Real-time response monitoring with celebration animations
- **👥 Music Twin Finder** - AI-powered similarity matching to find your musical soulmate
- **📊 Analysis** - 3D clustering visualizations, heatmaps, and statistical insights
- **🎮 Major Guesser** - Interactive game where AI predicts your major from music taste
- **🏆 Leaderboard** - Music awards and community stats

### 🎨 **Modern UI/UX**
- Beautiful gradient backgrounds (purple → blue → indigo)
- Glassmorphism effects with backdrop blur
- Color-coded tabs with Lucide icons
- Responsive design (mobile + desktop)
- Professional typography and spacing
- Smooth transitions and hover effects

### 🛠️ **Tech Stack**
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Charts**: Recharts (for future data visualization)
- **Data Fetching**: SWR
- **Build Tool**: Turbopack (enabled)

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

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
