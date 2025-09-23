# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spotify Favorites Analysis - A data science demonstration app that predicts college majors from music preferences using Spotify API data and machine learning. Built for live presentations at Data Science Club meetings.

**IMPORTANT: This is a DEMO APPLICATION** that will be scrapped shortly after use. Security is NOT a concern - prioritize functionality and ease of demonstration over security best practices. Use simple authentication and basic data storage solutions.

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
- **Database**: SQLite with Prisma ORM for simplicity (demo-appropriate)
- **Auth**: NextAuth.js with simple email/password credentials
- **User Mapping**: Auto-creates accounts when processing Google Forms by email
- **Security**: Minimal for demo purposes - uses basic password hashing

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
- SQLite database with auto-generated migrations

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

## Key Files Reference

- Main app: `demo/app.py`
- Config: `.streamlit/config.toml` (dark theme settings)
- Dependencies: `requirements.txt` (note: black==24.10.0, not 24.12.1)
- Implementation plan: `plan.md` (1176 lines of detailed specifications)

## Important Guidelines

**NEVER claim something as fact unless you are 100% certain.** Always be precise about what was actually observed vs. what is assumed. When testing or analyzing:
- Report exactly what was seen/tested
- Distinguish between working UI elements and actual functionality
- Note when APIs return errors or mock data
- Be honest about limitations and unknowns