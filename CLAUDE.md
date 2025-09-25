# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spotify Favorites Analysis - A data science demonstration app that predicts college majors from music preferences using Spotify API data and machine learning. Built for live presentations at Data Science Club meetings.

**IMPORTANT: This is a PRODUCTION DEMO APPLICATION** deployed on Vercel for live presentation. Multiple users will access the live website simultaneously during the demo. The application uses a cloud PostgreSQL database for concurrent user support and real-time data updates.

## Essential Commands

### Development
```bash
# Quick start (automated setup)
./run.sh

# Manual development
source venv/bin/activate
streamlit run demo/app.py

# Using Makefile
make run        # Run app
make install    # Setup environment
make clean      # Clean cache
make test       # Run tests
```

### Docker Operations
```bash
make docker-build
make docker-run
```

## Architecture & Data Flow

### Core Pipeline
1. **User Authentication** → SQLite database with NextAuth.js handles user sessions
2. **Data Collection** → Google Forms/Sheets processed with email-based user mapping
3. **Data Storage** → User-specific data stored in Prisma/SQLite database
4. **Processing** → Feature engineering creates "Music DNA" profiles per user
5. **Group Formation** → Advanced clustering algorithms create optimized groups
6. **Export** → CSV download functionality for administrators

### Authentication System
- **Database**: PostgreSQL cloud database with Prisma ORM for production deployment
- **Auth**: NextAuth.js with simple email/password credentials
- **User Mapping**: Auto-creates accounts when processing Google Forms by email
- **Admin Access**: Restricted to specific email addresses for database management

### Key Components

**Web App**: Next.js application with React components and Tailwind CSS

**Authentication** (`web/src/`):
- `lib/auth.ts`: NextAuth.js configuration with credentials provider
- `lib/prisma.ts`: Database client with connection pooling
- `middleware.ts`: Route protection for authenticated endpoints

**API Layer** (`web/src/app/api/`):
- `auth/`: Login, signup, and NextAuth endpoints
- `google/process-forms/`: Advanced form processing with user mapping
- `groups/create/`: Group formation with compatibility algorithms

**Database** (`prisma/`):
- `schema.prisma`: User, form responses, groups, and analysis data models
- PostgreSQL cloud database with auto-generated migrations
- Connection via `DATABASE_URL` environment variable

**Components** (`web/src/components/`):
- `GroupFormProcessor.tsx`: Main interface for Google Forms processing
- `AuthProvider.tsx`: Session management wrapper
- `UserNav.tsx`: User authentication navigation

### Critical Implementation Details

**Caching Strategy**:
- In-memory LRU cache for session data
- Disk cache with 24-hour TTL for API responses
- Cache invalidation on force_refresh flag

**API Rate Limiting**:
- Spotify: Exponential backoff, session pooling
- Google Sheets: 60 requests/minute with queue management

**Demo Mode**:
- Fully functional without credentials using Faker-generated mock data
- Automatic fallback when APIs unavailable

## Environment Configuration

Required for API access (optional - app runs in demo mode without):
```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:8501/callback
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_PATH=
```

## Common Issues & Solutions

**Missing Google OAuth modules**:
```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

**Dependency conflicts**:
```bash
pip install streamlit pandas numpy scikit-learn plotly spotipy python-dotenv --upgrade
```

## Testing & Quality

```bash
# Run tests
pytest tests/

# Code formatting
black src/ demo/

# Linting
pylint src/
```

## Deployment Notes

- App auto-creates required directories (`data/cache`, `data/raw`, etc.)
- Streamlit runs on port 8501 by default
- Docker health check endpoint: `/_stcore/health`
- Session state persists across tab switches but not page refreshes

## Dynamic Data Architecture

### Data Flow Overview

The application now uses **100% dynamic data** from the database, with no hardcoded mock values:

1. **Google Forms** → Process endpoint → Database storage
2. **Database** → Statistics APIs → Frontend display
3. **Real-time updates** every 30 seconds
4. **Empty states** when no data exists

### Key Database Tables

- **User**: Auto-created from form emails with authentication
- **MusicSubmission**: Stores songs with audio features (energy, valence, etc.)
- **Group**: Optimized group formations with compatibility scores
- **AnalysisResult**: Predictions and analysis cache for accuracy tracking

### API Endpoints (All Dynamic)

#### Statistics APIs
- `/api/stats` - Real-time statistics (total submissions, unique artists, top artist/genre, averages, extremes)
- `/api/live-feed` - Recent submissions with timestamps and activity rate
- `/api/major/predict` - GET: accuracy metrics, POST: actual predictions

#### Twin Finder APIs (Updated)
- `/api/twins/audio-match` - Real similarity calculations using database
- `/api/twins/genre-match` - Real genre overlap calculations

### Frontend Data Loading

- **Initial Load**: All APIs called on page mount
- **Auto-refresh**: Every 30 seconds for live updates
- **Post-import Refresh**: After Google Forms processing
- **Empty States**: Graceful handling when no data exists

### Real-time Features

- Live response count updates
- Recent submissions with "time ago" formatting
- Dynamic leaderboards (most energetic, happiest, most danceable songs)
- Calculated community averages (energy, valence, danceability, tempo)
- Prediction accuracy from historical data

### Google Forms Integration

- Field mapping documented in setup guide
- Auto-user creation by email
- Validation of required vs optional fields
- Real-time dashboard updates after processing

### Group Creation System

The group formation feature creates optimized music groups based on compatibility algorithms:

#### Data Requirements
- **Real Data Only**: Groups are only created from actual Google Forms submissions
- **No Mock Data**: All previous test data has been cleared from the database
- **User Authentication**: Groups are tied to authenticated user sessions

#### Group Generation Process
1. **Data Collection**: Loads users with music submissions from database
2. **Compatibility Analysis**: Calculates pairwise compatibility scores using music features
3. **Group Formation**: Uses optimization algorithms to form balanced groups
4. **Name Generation**: Creates realistic group names based on genres and majors
5. **Database Storage**: Persists groups for the authenticated user only

#### Group Names
Group names are generated using realistic patterns:
- `{Genre} Music Group` (e.g., "Pop Music Group")
- `{Genre} Study Group` (e.g., "Jazz Study Group")
- `{Major} Music Group` (e.g., "Computer Science Music Group")
- Fallback: `Music Group {timestamp}`

#### API Endpoints
- `/api/groups/create` - POST: Creates new groups from real user data
- `/api/groups` - GET: Retrieves user's saved groups (no public groups)
- `/api/admin/reset` - POST: Admin-only endpoint to clear all demo data quickly
- Requires authentication for all operations

### Database Management for Demo

#### Production Deployment Setup
- **Vercel Deployment**: Live production application accessible by multiple concurrent users
- **Cloud PostgreSQL**: Persistent database for real-time data sharing
- **Environment Variables**: `DATABASE_URL` configured in Vercel dashboard

#### Quick Reset Workflow
Before each demo session:
1. **Admin Login**: Log in with authorized admin email (nagpure.r@northeastern.edu)
2. **Database Reset**: Call `/api/admin/reset` endpoint to clear all data
3. **Fresh Start**: Database is empty and ready for new Google Forms import
4. **Live Demo**: Import real participant data and demonstrate real-time features

#### Data Flow Process
1. **Pre-Demo**: Database is cleared of any previous demo data
2. **Data Import**: Upload Google Sheets/CSV with participant music preferences
3. **Live Updates**: Dashboard shows real submissions with 30-second auto-refresh
4. **Group Formation**: Create optimized groups from real participant data
5. **Real-time Display**: Multiple users can view live statistics and groups simultaneously

#### Admin Capabilities
- Database reset without losing admin accounts
- Quick data clearing for demo preparation
- Monitoring of total users, submissions, and groups
- CSV export functionality for post-demo analysis

## Key Files Reference

- **Frontend**: `web/src/app/page.tsx` (fully dynamic UI)
- **APIs**: `web/src/app/api/stats/route.ts`, `web/src/app/api/live-feed/route.ts`
- **Database**: `web/prisma/schema.prisma` (User, MusicSubmission, Group, AnalysisResult)
- **Documentation**: `docs/group-finder/setup-guide.md`, `README.md`
- **Legacy**: `demo/app.py` (old Streamlit app)
- **Config**: `.streamlit/config.toml` (dark theme settings)

## Important Guidelines

**NEVER claim something as fact unless you are 100% certain.** Always be precise about what was actually observed vs. what is assumed. When testing or analyzing:
- Report exactly what was seen/tested
- Distinguish between working UI elements and actual functionality
- Note when APIs return errors or mock data
- Be honest about limitations and unknowns

### Dynamic Data Validation

When testing the application:
- Check that statistics change when new data is added
- Verify empty states show "No data yet" when database is empty
- Confirm live feed updates with real submissions
- Test that Google Forms processing triggers UI updates