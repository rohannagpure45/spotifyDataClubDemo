# 🎵 Spotify Favorites Analysis - Complete Implementation Plan

## 📖 Executive Summary

A real-time, interactive data science demonstration that analyzes musical preferences to predict student majors, find "music twins," and reveal hidden patterns in listening habits. Built for a 5-minute club meeting presentation with live audience participation.

**Core Value Proposition:** Transform abstract data science concepts into tangible, personal insights using music everyone loves.

---

## 🏗️ Project Architecture

### Enhanced Project Structure

```
spotify-favorites/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Continuous integration
│       └── deploy.yml              # Auto-deployment
├── src/
│   ├── api/
│   │   ├── spotify_client.py      # Spotify API wrapper with PKCE
│   │   ├── google_sheets.py       # Real-time form data fetcher
│   │   └── rate_limiter.py        # API rate limiting handler
│   ├── processing/
│   │   ├── data_processor.py      # Data cleaning & enrichment
│   │   ├── feature_engineer.py    # Feature extraction
│   │   └── cache_manager.py       # Response caching system
│   ├── models/
│   │   ├── clustering.py          # K-means & DBSCAN implementations
│   │   ├── classifier.py          # Major prediction model
│   │   └── similarity.py          # Music twin algorithm
│   ├── visualization/
│   │   ├── templates.py           # Plotly visualization templates
│   │   ├── live_charts.py         # Real-time updating charts
│   │   └── static_fallback.py     # Offline visualization backup
│   └── utils/
│       ├── config.py              # Configuration management
│       ├── logger.py              # Structured logging
│       └── error_handler.py       # Graceful error handling
├── data/
│   ├── raw/                       # Original responses
│   ├── processed/                 # Enriched datasets
│   ├── cache/                     # API response cache
│   └── backups/                   # Offline fallback data
├── notebooks/
│   ├── 01_exploratory_analysis.ipynb
│   ├── 02_model_development.ipynb
│   ├── 03_visualization_prototypes.ipynb
│   └── 04_performance_testing.ipynb
├── tests/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── fixtures/                  # Test data
├── demo/
│   ├── app.py                     # Main Streamlit application
│   ├── pages/                     # Multi-page app structure
│   │   ├── 01_live_feed.py
│   │   ├── 02_music_twin.py
│   │   ├── 03_analysis.py
│   │   └── 04_game.py
│   └── components/                # Reusable UI components
├── deployment/
│   ├── Dockerfile                 # Container configuration
│   ├── docker-compose.yml         # Multi-service setup
│   └── kubernetes/                # K8s manifests (optional)
├── docs/
│   ├── API.md                     # API documentation
│   ├── SETUP.md                   # Setup instructions
│   └── TROUBLESHOOTING.md         # Common issues & solutions
├── scripts/
│   ├── generate_sample_data.py    # Create realistic test data
│   ├── stress_test.py             # Load testing
│   └── backup_data.py             # Data backup utility
├── .env.example                   # Environment variables template
├── requirements.txt               # Python dependencies
├── requirements-dev.txt           # Development dependencies
├── pyproject.toml                 # Project configuration
├── Makefile                       # Common commands
└── README.md                      # Project documentation
```

---

## 🔐 Security & Privacy Considerations

### Data Protection
- **PII Handling**: Name field optional, data anonymized for analysis
- **GDPR Compliance**: Clear data usage disclosure, deletion options
- **Secure Storage**: Encrypted credentials, no hardcoded secrets
- **Session Management**: Temporary user identifiers, auto-cleanup

### API Security (2025 Updates)
- **PKCE Authentication**: Required for public clients (single-page apps)
- **HTTPS Only**: All redirect URIs must use HTTPS (except localhost)
- **Rate Limiting**: Max ~20 requests/second, implement exponential backoff
- **Token Management**: Secure refresh token storage, automatic renewal

### Implementation Example
```python
# src/api/spotify_client.py
import hashlib
import base64
import secrets
from urllib.parse import urlencode
import requests

class SpotifyPKCEClient:
    """Spotify client using PKCE flow for enhanced security."""

    def __init__(self, client_id: str, redirect_uri: str):
        self.client_id = client_id
        self.redirect_uri = redirect_uri
        self.code_verifier = None
        self.code_challenge = None

    def generate_pkce_params(self) -> tuple:
        """Generate PKCE code verifier and challenge."""
        # Generate code verifier (43-128 chars)
        self.code_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(96)
        ).decode('utf-8').rstrip('=')

        # Generate code challenge
        challenge = hashlib.sha256(
            self.code_verifier.encode('utf-8')
        ).digest()
        self.code_challenge = base64.urlsafe_b64encode(
            challenge
        ).decode('utf-8').rstrip('=')

        return self.code_verifier, self.code_challenge

    def get_authorization_url(self, scope: str) -> str:
        """Build authorization URL with PKCE parameters."""
        self.generate_pkce_params()

        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'redirect_uri': self.redirect_uri,
            'scope': scope,
            'code_challenge_method': 'S256',
            'code_challenge': self.code_challenge
        }

        return f"https://accounts.spotify.com/authorize?{urlencode(params)}"
```

---

## 🚀 Phase 1: Core Infrastructure Setup

### 1.1 Environment Configuration

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials
```

### 1.2 Spotify Developer Setup
1. Create app at https://developer.spotify.com/dashboard
2. Set redirect URI: `http://localhost:8501/callback`
3. Note Client ID (no secret needed for PKCE)
4. Configure scopes: `user-read-private user-top-read`

### 1.3 Google Forms & Sheets Integration
```python
# src/api/google_sheets.py
from google.oauth2 import service_account
from googleapiclient.discovery import build
import pandas as pd
from typing import Optional
import time

class GoogleSheetsClient:
    """Real-time Google Sheets data fetcher with caching."""

    def __init__(self, credentials_file: str, sheet_id: str):
        self.sheet_id = sheet_id
        self.last_fetch = None
        self.cache_duration = 5  # seconds
        self.cached_data = None

        # Initialize service
        creds = service_account.Credentials.from_service_account_file(
            credentials_file,
            scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
        )
        self.service = build('sheets', 'v4', credentials=creds)

    def fetch_responses(self, force_refresh: bool = False) -> pd.DataFrame:
        """Fetch form responses with intelligent caching."""
        current_time = time.time()

        # Use cache if valid
        if (not force_refresh and
            self.cached_data is not None and
            self.last_fetch and
            current_time - self.last_fetch < self.cache_duration):
            return self.cached_data

        try:
            # Fetch fresh data
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.sheet_id,
                range='Form Responses 1!A:Z'
            ).execute()

            values = result.get('values', [])
            if not values:
                return pd.DataFrame()

            # Convert to DataFrame
            df = pd.DataFrame(values[1:], columns=values[0])

            # Cache the result
            self.cached_data = df
            self.last_fetch = current_time

            return df

        except Exception as e:
            print(f"Error fetching data: {e}")
            # Return cached data if available
            return self.cached_data if self.cached_data is not None else pd.DataFrame()
```

---

## 🧪 Phase 2: Data Processing Pipeline

### 2.1 Enhanced Data Processor with Error Handling

```python
# src/processing/data_processor.py
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import logging
from functools import lru_cache

@dataclass
class AudioFeatures:
    """Structured audio features from Spotify."""
    danceability: float
    energy: float
    key: int
    loudness: float
    mode: int
    speechiness: float
    acousticness: float
    instrumentalness: float
    liveness: float
    valence: float
    tempo: float
    duration_ms: int
    time_signature: int

class DataProcessor:
    """Advanced data processing with caching and error recovery."""

    def __init__(self, spotify_client, cache_manager):
        self.spotify = spotify_client
        self.cache = cache_manager
        self.logger = logging.getLogger(__name__)

    @lru_cache(maxsize=1000)
    def search_and_enrich(self, song: str, artist: str) -> Optional[Dict]:
        """Search for track and enrich with audio features."""
        # Check cache first
        cache_key = f"{song}:{artist}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        try:
            # Search for track
            results = self.spotify.search(
                q=f"track:{song} artist:{artist}",
                type='track',
                limit=1
            )

            if not results['tracks']['items']:
                # Fallback: broader search
                results = self.spotify.search(
                    q=f"{song} {artist}",
                    type='track',
                    limit=1
                )

            if results['tracks']['items']:
                track = results['tracks']['items'][0]
                track_id = track['id']

                # Get audio features
                features = self.spotify.audio_features(track_id)[0]

                # Get artist info
                artist_id = track['artists'][0]['id']
                artist_info = self.spotify.artist(artist_id)

                enriched_data = {
                    'track_id': track_id,
                    'track_name': track['name'],
                    'artist_name': track['artists'][0]['name'],
                    'genres': artist_info.get('genres', []),
                    'popularity': track['popularity'],
                    'audio_features': AudioFeatures(**features).__dict__
                }

                # Cache the result
                self.cache.set(cache_key, enriched_data, ttl=3600)

                return enriched_data

        except Exception as e:
            self.logger.error(f"Error enriching {song} by {artist}: {e}")
            return None

    def process_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process multiple responses efficiently."""
        enriched_rows = []

        for _, row in df.iterrows():
            enriched = self.search_and_enrich(
                row['favorite_song'],
                row['artist']
            )

            if enriched:
                # Flatten audio features
                features = enriched['audio_features']
                for key, value in features.items():
                    row[f'audio_{key}'] = value

                row['genres'] = ','.join(enriched.get('genres', []))
                row['popularity'] = enriched['popularity']

            enriched_rows.append(row)

        return pd.DataFrame(enriched_rows)
```

### 2.2 Feature Engineering

```python
# src/processing/feature_engineer.py
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from typing import Tuple

class FeatureEngineer:
    """Create meaningful features for ML models."""

    def __init__(self):
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=5)

    def create_music_dna(self, df: pd.DataFrame) -> np.ndarray:
        """Create music DNA profile from audio features."""
        audio_cols = [col for col in df.columns if col.startswith('audio_')]

        # Select relevant features
        feature_cols = [
            'audio_danceability', 'audio_energy', 'audio_valence',
            'audio_acousticness', 'audio_speechiness', 'audio_tempo'
        ]

        X = df[feature_cols].fillna(0)

        # Normalize
        X_scaled = self.scaler.fit_transform(X)

        # Reduce dimensions
        X_reduced = self.pca.fit_transform(X_scaled)

        return X_reduced

    def calculate_similarity_matrix(self, features: np.ndarray) -> np.ndarray:
        """Calculate pairwise similarity between users."""
        from sklearn.metrics.pairwise import cosine_similarity
        return cosine_similarity(features)

    def find_music_twins(self, user_idx: int, similarity_matrix: np.ndarray,
                        top_k: int = 5) -> List[Tuple[int, float]]:
        """Find most similar users."""
        similarities = similarity_matrix[user_idx]

        # Exclude self
        similarities[user_idx] = -1

        # Get top matches
        top_indices = np.argsort(similarities)[-top_k:][::-1]

        return [(idx, similarities[idx]) for idx in top_indices]
```

---

## 🎨 Phase 3: Interactive Visualization System

### 3.1 Advanced Plotly Visualizations

```python
# src/visualization/live_charts.py
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np

class LiveVisualizer:
    """Create interactive, updating visualizations."""

    def __init__(self, theme='plotly_dark'):
        self.theme = theme
        self.colors = px.colors.qualitative.Set3

    def create_cluster_scatter(self, df: pd.DataFrame,
                              highlight_new: List[str] = None) -> go.Figure:
        """3D scatter plot of music clusters with animation."""
        fig = px.scatter_3d(
            df,
            x='pca_1', y='pca_2', z='pca_3',
            color='cluster',
            size='popularity',
            hover_data=['name', 'favorite_song', 'major'],
            title='Music Taste Clusters - Live View',
            template=self.theme,
            animation_frame='timestamp' if 'timestamp' in df else None
        )

        # Highlight new entries
        if highlight_new:
            new_df = df[df['name'].isin(highlight_new)]
            fig.add_trace(go.Scatter3d(
                x=new_df['pca_1'],
                y=new_df['pca_2'],
                z=new_df['pca_3'],
                mode='markers',
                marker=dict(
                    size=15,
                    color='red',
                    symbol='diamond',
                    line=dict(color='white', width=2)
                ),
                name='New Entries',
                hovertext=new_df['name']
            ))

        fig.update_layout(
            showlegend=True,
            height=700,
            updatemenus=[{
                'buttons': [
                    {'label': 'Play',
                     'method': 'animate',
                     'args': [None, {'frame': {'duration': 500}}]}
                ]
            }]
        )

        return fig

    def create_music_dna_radar(self, user_features: Dict,
                               cluster_avg: Dict) -> go.Figure:
        """Radar chart comparing user to cluster average."""
        categories = list(user_features.keys())

        fig = go.Figure()

        # User profile
        fig.add_trace(go.Scatterpolar(
            r=list(user_features.values()),
            theta=categories,
            fill='toself',
            name='Your Music DNA',
            line_color='cyan'
        ))

        # Cluster average
        fig.add_trace(go.Scatterpolar(
            r=list(cluster_avg.values()),
            theta=categories,
            fill='toself',
            name='Cluster Average',
            line_color='orange',
            opacity=0.6
        ))

        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[0, 1]
                )
            ),
            showlegend=True,
            title="Your Music DNA vs. Your Cluster",
            template=self.theme
        )

        return fig

    def create_major_predictor_gauge(self, predictions: Dict) -> go.Figure:
        """Gauge chart showing major prediction confidence."""
        top_major = max(predictions, key=predictions.get)
        confidence = predictions[top_major] * 100

        fig = go.Figure(go.Indicator(
            mode="gauge+number+delta",
            value=confidence,
            title={'text': f"Predicted Major: {top_major}"},
            domain={'x': [0, 1], 'y': [0, 1]},
            gauge={
                'axis': {'range': [None, 100]},
                'bar': {'color': "darkblue"},
                'steps': [
                    {'range': [0, 25], 'color': "lightgray"},
                    {'range': [25, 50], 'color': "gray"},
                    {'range': [50, 75], 'color': "lightblue"},
                    {'range': [75, 100], 'color': "blue"}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 90
                }
            }
        ))

        fig.update_layout(
            template=self.theme,
            height=400
        )

        return fig
```

---

## 🎮 Phase 4: Streamlit Application

### 4.1 Main Application with Real-time Updates

```python
# demo/app.py
import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import time
import asyncio
from src.api.google_sheets import GoogleSheetsClient
from src.api.spotify_client import SpotifyPKCEClient
from src.processing.data_processor import DataProcessor
from src.visualization.live_charts import LiveVisualizer
from src.models.clustering import MusicClusterer
from src.models.classifier import MajorPredictor

# Page configuration
st.set_page_config(
    page_title="🎵 Music DNA Analysis",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'About': "Built with ❤️ by Data Science Club"
    }
)

# Custom CSS
st.markdown("""
<style>
    .stMetric {
        background-color: #1e1e1e;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #333;
    }
    .new-entry {
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'responses_count' not in st.session_state:
    st.session_state.responses_count = 0
if 'last_update' not in st.session_state:
    st.session_state.last_update = datetime.now()
if 'new_entries' not in st.session_state:
    st.session_state.new_entries = []

# Initialize clients
@st.cache_resource
def init_clients():
    """Initialize all API clients."""
    sheets_client = GoogleSheetsClient(
        credentials_file='credentials.json',
        sheet_id=st.secrets['GOOGLE_SHEET_ID']
    )
    spotify_client = SpotifyPKCEClient(
        client_id=st.secrets['SPOTIFY_CLIENT_ID'],
        redirect_uri='http://localhost:8501/callback'
    )
    return sheets_client, spotify_client

sheets_client, spotify_client = init_clients()

# Initialize processors
processor = DataProcessor(spotify_client, cache_manager=None)
visualizer = LiveVisualizer()
clusterer = MusicClusterer()
predictor = MajorPredictor()

# Sidebar with live metrics
with st.sidebar:
    st.header("📊 Live Dashboard")

    # Auto-refresh toggle
    auto_refresh = st.toggle("Auto-refresh", value=True)
    refresh_interval = st.slider("Refresh interval (seconds)", 5, 30, 10)

    # Manual refresh button
    if st.button("🔄 Refresh Now", type="primary"):
        st.session_state.last_update = datetime.now()
        st.rerun()

    # Live metrics
    col1, col2 = st.columns(2)
    with col1:
        st.metric(
            "Total Responses",
            st.session_state.responses_count,
            delta=len(st.session_state.new_entries)
        )
    with col2:
        st.metric(
            "Active Clusters",
            clusterer.n_clusters if hasattr(clusterer, 'n_clusters') else 0
        )

    # Last update time
    st.caption(f"Last update: {st.session_state.last_update.strftime('%H:%M:%S')}")

    # QR Code for form
    st.divider()
    st.subheader("📱 Join the Analysis!")
    st.image("qr_code.png", caption="Scan to submit your music preferences")

# Main content area
st.title("🎵 Live Music DNA Analysis")
st.markdown("### *Can we predict your major from your music taste?*")

# Create tabs
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "🎯 Live Feed",
    "👥 Find Your Twin",
    "📊 Analysis",
    "🎮 Major Guesser",
    "🏆 Leaderboard"
])

with tab1:
    st.header("Real-time Response Feed")

    # Fetch latest data
    df = sheets_client.fetch_responses()

    # Process new entries
    if len(df) > st.session_state.responses_count:
        new_count = len(df) - st.session_state.responses_count
        st.session_state.new_entries = df.tail(new_count)['name'].tolist()
        st.session_state.responses_count = len(df)

        # Show celebration for new entries
        st.balloons()
        st.success(f"🎉 {new_count} new {'response' if new_count == 1 else 'responses'} just arrived!")

    # Display recent entries with animation
    st.subheader("Latest Entries")
    if not df.empty:
        recent = df.tail(10)
        for _, row in recent.iterrows():
            is_new = row['name'] in st.session_state.new_entries
            css_class = "new-entry" if is_new else ""

            with st.container():
                cols = st.columns([2, 3, 2, 1])
                with cols[0]:
                    st.markdown(f"<div class='{css_class}'><b>{row.get('name', 'Anonymous')}</b></div>",
                               unsafe_allow_html=True)
                with cols[1]:
                    st.text(f"🎵 {row['favorite_song']} - {row['artist']}")
                with cols[2]:
                    st.text(f"📚 {row['major']}")
                with cols[3]:
                    if is_new:
                        st.markdown("✨ **NEW**")

with tab2:
    st.header("👥 Discover Your Music Twin")

    if not df.empty:
        # User selection
        selected_user = st.selectbox(
            "Select your entry:",
            df['name'].unique(),
            help="Choose your name from the dropdown"
        )

        if selected_user:
            user_data = df[df['name'] == selected_user].iloc[0]

            col1, col2 = st.columns([1, 2])

            with col1:
                st.subheader("Your Profile")
                st.metric("Favorite Song", user_data['favorite_song'])
                st.metric("Artist", user_data['artist'])
                st.metric("Major", user_data['major'])
                st.metric("Daily Listening", f"{user_data.get('hours_per_day', 0)} hours")

            with col2:
                # Find music twins
                if st.button("🔍 Find My Music Twin!"):
                    with st.spinner("Analyzing music DNA..."):
                        # Process and find twins
                        enriched_df = processor.process_batch(df)
                        features = feature_engineer.create_music_dna(enriched_df)
                        similarity_matrix = feature_engineer.calculate_similarity_matrix(features)

                        user_idx = df[df['name'] == selected_user].index[0]
                        twins = feature_engineer.find_music_twins(user_idx, similarity_matrix)

                        st.subheader("Your Music Twins")
                        for idx, similarity in twins:
                            twin = df.iloc[idx]
                            match_percent = similarity * 100

                            st.markdown(f"""
                            **{twin['name']}** - {match_percent:.1f}% match
                            - 🎵 {twin['favorite_song']} by {twin['artist']}
                            - 📚 {twin['major']}
                            """)

                            # Show similarity breakdown
                            with st.expander("See similarity details"):
                                # Create comparison radar chart
                                fig = visualizer.create_music_dna_radar(
                                    user_features=enriched_df.iloc[user_idx].to_dict(),
                                    cluster_avg=enriched_df.iloc[idx].to_dict()
                                )
                                st.plotly_chart(fig, use_container_width=True)

with tab3:
    st.header("📊 Group Analysis")

    if not df.empty:
        # Process all data
        enriched_df = processor.process_batch(df)

        col1, col2 = st.columns(2)

        with col1:
            # Cluster visualization
            st.subheader("Music Taste Clusters")
            features = feature_engineer.create_music_dna(enriched_df)
            clusters = clusterer.fit_predict(features)
            enriched_df['cluster'] = clusters

            fig = visualizer.create_cluster_scatter(
                enriched_df,
                highlight_new=st.session_state.new_entries
            )
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            # Major vs Genre heatmap
            st.subheader("Major vs Music Preferences")

            # Create heatmap data
            heatmap_data = enriched_df.groupby(['major', 'genres']).size().reset_index(name='count')
            fig = px.density_heatmap(
                heatmap_data,
                x='major',
                y='genres',
                z='count',
                title="Music Genre Preferences by Major"
            )
            st.plotly_chart(fig, use_container_width=True)

        # Statistics
        st.subheader("📈 Interesting Statistics")

        stats_cols = st.columns(4)
        with stats_cols[0]:
            most_popular_song = enriched_df.groupby('favorite_song').size().idxmax()
            st.metric("Most Popular Song", most_popular_song)

        with stats_cols[1]:
            avg_energy = enriched_df['audio_energy'].mean()
            st.metric("Average Energy Level", f"{avg_energy:.2f}")

        with stats_cols[2]:
            most_diverse_major = enriched_df.groupby('major')['genres'].nunique().idxmax()
            st.metric("Most Diverse Major", most_diverse_major)

        with stats_cols[3]:
            happiest_cluster = enriched_df.groupby('cluster')['audio_valence'].mean().idxmax()
            st.metric("Happiest Cluster", f"Cluster {happiest_cluster}")

with tab4:
    st.header("🎮 Guess the Major Game")

    if not df.empty:
        # Game setup
        if 'game_score' not in st.session_state:
            st.session_state.game_score = 0
        if 'game_round' not in st.session_state:
            st.session_state.game_round = 0

        col1, col2 = st.columns([2, 1])

        with col1:
            st.subheader("Can You Guess the Major?")

            # Select random entry
            if st.button("🎲 New Round"):
                st.session_state.game_round += 1
                random_idx = np.random.randint(0, len(df))
                st.session_state.current_entry = df.iloc[random_idx]

            if 'current_entry' in st.session_state:
                entry = st.session_state.current_entry

                # Show song info
                st.info(f"""
                **Song:** {entry['favorite_song']}
                **Artist:** {entry['artist']}
                **Hours/Day:** {entry.get('hours_per_day', 'Unknown')}
                **Listen Time:** {entry.get('listening_time', 'Unknown')}
                """)

                # Guess input
                majors = df['major'].unique()
                guess = st.selectbox("Your guess:", ["Select..."] + list(majors))

                if st.button("Submit Guess"):
                    if guess == entry['major']:
                        st.success("🎉 Correct!")
                        st.session_state.game_score += 1
                    else:
                        st.error(f"❌ Wrong! It was {entry['major']}")

                    # Show AI prediction
                    with st.expander("See what our AI predicted"):
                        predictions = predictor.predict_proba([entry])[0]
                        pred_df = pd.DataFrame({
                            'Major': predictor.classes_,
                            'Confidence': predictions * 100
                        }).sort_values('Confidence', ascending=False)

                        fig = px.bar(
                            pred_df.head(5),
                            x='Confidence',
                            y='Major',
                            orientation='h',
                            title="AI Predictions"
                        )
                        st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.metric("Your Score", f"{st.session_state.game_score}/{st.session_state.game_round}")

            # Leaderboard preview
            st.subheader("Top Players")
            # This would connect to a database in production
            leaderboard = pd.DataFrame({
                'Player': ['Alice', 'Bob', 'Charlie'],
                'Score': [15, 12, 10]
            })
            st.dataframe(leaderboard)

with tab5:
    st.header("🏆 Leaderboard & Awards")

    if not df.empty:
        # Calculate awards
        st.subheader("🥇 Music Awards")

        awards_cols = st.columns(3)

        with awards_cols[0]:
            st.markdown("### 🎸 Most Energetic")
            if 'audio_energy' in enriched_df.columns:
                most_energetic = enriched_df.nlargest(1, 'audio_energy').iloc[0]
                st.success(f"**{most_energetic['name']}**")
                st.caption(f"{most_energetic['favorite_song']}")

        with awards_cols[1]:
            st.markdown("### 😊 Most Happy Vibes")
            if 'audio_valence' in enriched_df.columns:
                most_happy = enriched_df.nlargest(1, 'audio_valence').iloc[0]
                st.success(f"**{most_happy['name']}**")
                st.caption(f"{most_happy['favorite_song']}")

        with awards_cols[2]:
            st.markdown("### 🕺 Most Danceable")
            if 'audio_danceability' in enriched_df.columns:
                most_danceable = enriched_df.nlargest(1, 'audio_danceability').iloc[0]
                st.success(f"**{most_danceable['name']}**")
                st.caption(f"{most_danceable['favorite_song']}")

        # Group statistics
        st.divider()
        st.subheader("📊 Major Rankings")

        major_stats = enriched_df.groupby('major').agg({
            'audio_energy': 'mean',
            'audio_valence': 'mean',
            'audio_danceability': 'mean',
            'name': 'count'
        }).round(2)
        major_stats.columns = ['Avg Energy', 'Avg Happiness', 'Avg Danceability', 'Total Students']

        st.dataframe(
            major_stats.sort_values('Total Students', ascending=False),
            use_container_width=True
        )

# Auto-refresh logic
if auto_refresh:
    time.sleep(refresh_interval)
    st.rerun()
```

---

## 🧪 Phase 5: Testing Strategy

### 5.1 Unit Tests
```python
# tests/unit/test_data_processor.py
import pytest
from unittest.mock import Mock, patch
from src.processing.data_processor import DataProcessor

class TestDataProcessor:
    @pytest.fixture
    def processor(self):
        mock_spotify = Mock()
        mock_cache = Mock()
        return DataProcessor(mock_spotify, mock_cache)

    def test_search_and_enrich_with_cache(self, processor):
        # Setup
        processor.cache.get.return_value = {'cached': 'data'}

        # Execute
        result = processor.search_and_enrich("song", "artist")

        # Assert
        assert result == {'cached': 'data'}
        processor.spotify.search.assert_not_called()

    def test_search_and_enrich_spotify_api(self, processor):
        # Setup
        processor.cache.get.return_value = None
        processor.spotify.search.return_value = {
            'tracks': {'items': [{'id': '123', 'name': 'Test Song'}]}
        }

        # Execute
        result = processor.search_and_enrich("song", "artist")

        # Assert
        assert result is not None
        processor.cache.set.assert_called_once()
```

### 5.2 Integration Tests
```python
# tests/integration/test_live_updates.py
import pytest
from demo.app import sheets_client, processor

@pytest.mark.integration
def test_live_data_pipeline():
    """Test complete data flow from Google Sheets to processed output."""
    # Fetch data
    df = sheets_client.fetch_responses()
    assert not df.empty

    # Process data
    enriched = processor.process_batch(df.head(5))
    assert len(enriched) == 5
    assert 'audio_energy' in enriched.columns
```

---

## 🚀 Phase 6: Deployment Options

### 6.1 Docker Deployment
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8501

# Health check
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

# Run application
CMD ["streamlit", "run", "demo/app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### 6.2 Cloud Deployment Options

#### Streamlit Cloud (Recommended for Demo)
```yaml
# .streamlit/config.toml
[theme]
primaryColor = "#FF6B6B"
backgroundColor = "#0E1117"
secondaryBackgroundColor = "#262730"
textColor = "#FAFAFA"

[server]
maxUploadSize = 10
enableCORS = true
```

#### Heroku
```yaml
# Procfile
web: sh setup.sh && streamlit run demo/app.py
```

#### Google Cloud Run
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/spotify-demo
gcloud run deploy --image gcr.io/PROJECT_ID/spotify-demo --platform managed
```

---

## 📋 Meeting Day Checklist

### T-30 Minutes
- [ ] Start all services locally
- [ ] Verify API credentials are valid
- [ ] Test form submission → dashboard pipeline
- [ ] Load backup data (minimum 50 entries)
- [ ] Check projector/screen connection
- [ ] Generate fresh QR code for form
- [ ] Open dashboard on presentation laptop
- [ ] Test internet connection stability

### T-5 Minutes
- [ ] Display QR code prominently
- [ ] Open dashboard in full-screen mode
- [ ] Clear any test/debug data
- [ ] Start screen recording (backup)
- [ ] Deep breath, you've got this! 🎯

### During Presentation
- [ ] Hook: "Can AI predict your major from your music?"
- [ ] Show QR code while explaining
- [ ] Demo pre-populated dashboard features
- [ ] Click refresh to show new real entries
- [ ] Find music twin for volunteer
- [ ] Run major predictor game
- [ ] Show GitHub repo QR for interested students

### Post-Meeting
- [ ] Export participant data
- [ ] Send follow-up email with results
- [ ] Share GitHub repository link
- [ ] Schedule follow-up workshop

---

## 🚨 Troubleshooting Guide

| Issue | Solution | Fallback |
|-------|----------|----------|
| No form responses | Check Google Sheets API | Use pre-generated sample data |
| Spotify API rate limit | Implement exponential backoff | Use cached responses |
| Slow visualization | Disable animations | Show static screenshots |
| Network failure | Switch to local data | Run offline demo version |
| Dashboard crash | Restart Streamlit | Switch to backup slides |
| Authentication fails | Check PKCE implementation | Use development token |

---

## 📦 Requirements

```txt
# requirements.txt
streamlit==1.28.0
spotipy==2.23.0
pandas==2.1.0
numpy==1.24.3
scikit-learn==1.3.0
plotly==5.17.0
google-api-python-client==2.100.0
google-auth==2.23.0
python-dotenv==1.0.0
requests==2.31.0
redis==5.0.0  # For caching
pytest==7.4.0
pytest-asyncio==0.21.0
black==23.9.0
pylint==3.0.0
```

---

## 🎯 Success Metrics

### Quantitative
- ✅ 20+ live form submissions
- ✅ <2 second dashboard refresh time
- ✅ 90%+ uptime during demo
- ✅ 10+ new club signups

### Qualitative
- ✅ At least 3 "wow" moments
- ✅ 5+ engaged questions
- ✅ Positive audience energy
- ✅ Clear understanding of data science applications

---

## 🔗 Additional Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
- [Streamlit Documentation](https://docs.streamlit.io)
- [Google Sheets API Guide](https://developers.google.com/sheets/api)
- [Project Repository](https://github.com/YOUR_USERNAME/spotify-favorites)
- [Live Demo](https://spotify-demo.streamlit.app)

---

*Built with passion for data science education. Let's make learning fun! 🚀*