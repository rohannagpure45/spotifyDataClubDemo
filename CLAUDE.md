# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spotify Favorites Analysis - A data science demonstration app that predicts college majors from music preferences using Spotify API data and machine learning. Built for live presentations at Data Science Club meetings.

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
1. **Data Collection** → Google Sheets API fetches form responses (or uses mock data)
2. **Enrichment** → Spotify API adds audio features via PKCE authentication
3. **Processing** → Feature engineering creates "Music DNA" profiles
4. **ML Models** → K-means clustering + Random Forest classification
5. **Visualization** → Streamlit app with 5 interactive tabs

### Key Components

**Entry Point**: `demo/app.py` - Streamlit application with session state management

**API Layer** (`src/api/`):
- `spotify_client.py`: PKCE OAuth flow, rate limiting (20 req/s), batch processing
- `google_sheets.py`: Real-time form fetching with MockGoogleSheetsClient fallback

**Processing Layer** (`src/processing/`):
- `data_processor.py`: Multi-layer caching (memory + disk), enrichment pipeline
- `feature_engineer.py`: PCA for Music DNA, similarity matrix calculations

**ML Layer** (`src/models/`):
- `clustering.py`: Groups users by musical similarity
- `classifier.py`: Predicts majors from audio features

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