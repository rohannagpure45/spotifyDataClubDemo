"""
🎵 Spotify Favorites Analysis - Live Demo Dashboard
Main Streamlit application for music preference analysis.
"""

import streamlit as st
import pandas as pd
import numpy as np
import time
from datetime import datetime
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our modules
from src.api.google_sheets import create_sheets_client
from src.api.spotify_client import SpotifyPKCEClient
from src.processing.data_processor import DataProcessor, CacheManager
from src.processing.feature_engineer import FeatureEngineer
from src.models.clustering import MusicClusterer
from src.models.classifier import MajorPredictor
from src.visualization.live_charts import LiveVisualizer

# Page configuration
st.set_page_config(
    page_title="🎵 Music DNA Analysis",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={'About': "Built with ❤️ by Data Science Club"}
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
    .big-font {
        font-size: 24px !important;
        font-weight: bold;
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
if 'processed_df' not in st.session_state:
    st.session_state.processed_df = None
if 'game_score' not in st.session_state:
    st.session_state.game_score = 0
if 'game_round' not in st.session_state:
    st.session_state.game_round = 0

# Initialize clients and processors
@st.cache_resource
def init_components():
    """Initialize all components with caching."""
    # Use mock data if no credentials
    use_mock = not os.path.exists('credentials.json')

    sheets_client = create_sheets_client(
        use_mock=use_mock,
        sheet_id=os.getenv('GOOGLE_SHEET_ID'),
        sample_size=50
    )

    # Spotify client (will work without credentials using mock data)
    spotify_client = None
    if os.getenv('SPOTIFY_CLIENT_ID'):
        spotify_client = SpotifyPKCEClient(
            client_id=os.getenv('SPOTIFY_CLIENT_ID'),
            redirect_uri=os.getenv('SPOTIFY_REDIRECT_URI', 'http://localhost:8501/callback')
        )

    # Initialize processors
    cache_manager = CacheManager()
    processor = DataProcessor(spotify_client, cache_manager)
    engineer = FeatureEngineer()
    clusterer = MusicClusterer()
    predictor = MajorPredictor()
    visualizer = LiveVisualizer()

    return sheets_client, processor, engineer, clusterer, predictor, visualizer

# Load components
sheets_client, processor, engineer, clusterer, predictor, visualizer = init_components()

# Sidebar
with st.sidebar:
    st.header("📊 Live Dashboard")

    # Auto-refresh toggle
    auto_refresh = st.toggle("Auto-refresh", value=False)
    refresh_interval = st.slider("Refresh interval (seconds)", 5, 30, 10)

    # Manual refresh
    if st.button("🔄 Refresh Now", type="primary", use_container_width=True):
        st.session_state.last_update = datetime.now()
        st.rerun()

    # Metrics
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Total Responses", st.session_state.responses_count,
                 delta=len(st.session_state.new_entries))
    with col2:
        clusters = st.session_state.processed_df['cluster'].nunique() if st.session_state.processed_df is not None and 'cluster' in st.session_state.processed_df.columns else 0
        st.metric("Active Clusters", clusters)

    st.caption(f"Last update: {st.session_state.last_update.strftime('%H:%M:%S')}")

    st.divider()
    st.info("📱 **Join the Analysis!**\nScan the QR code or fill out the form to add your music preferences!")

    # Demo mode indicator
    if not os.path.exists('credentials.json'):
        st.warning("🎭 Running in demo mode with sample data")

# Main title
st.title("🎵 Live Music DNA Analysis")
st.markdown("### *Can we predict your major from your music taste?*")

# Fetch and process data
def load_and_process_data():
    """Load and process the latest data."""
    df = sheets_client.fetch_responses()

    if not df.empty:
        # Process with Spotify enrichment
        processed_df = processor.process_batch(df)

        # Create music DNA if we have audio features
        audio_cols = [col for col in processed_df.columns if col.startswith('audio_')]
        if audio_cols:
            features = engineer.create_music_dna(processed_df)
            if len(features) > 0:
                # Add PCA components to dataframe
                for i in range(min(3, features.shape[1])):
                    processed_df[f'pca_{i+1}'] = features[:, i]

                # Perform clustering
                clusters = clusterer.fit_predict(features)
                processed_df['cluster'] = clusters

                # Calculate similarity matrix
                similarity_matrix = engineer.calculate_similarity_matrix(features)
                processed_df['similarity_matrix'] = [similarity_matrix] * len(processed_df)

        return processed_df

    return pd.DataFrame()

# Load data
df = load_and_process_data()
st.session_state.processed_df = df

# Update metrics
if not df.empty:
    new_count = len(df) - st.session_state.responses_count
    if new_count > 0:
        st.session_state.new_entries = df.tail(new_count)['name'].tolist() if 'name' in df.columns else []
        st.session_state.responses_count = len(df)
        if new_count > 3:
            st.balloons()

# Create tabs
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "🎯 Live Feed", "👥 Music Twin Finder", "📊 Analysis",
    "🎮 Major Guesser", "🏆 Leaderboard"
])

with tab1:
    st.header("Real-time Response Feed")

    if not df.empty:
        # Show recent entries
        st.subheader("Latest Entries")
        recent = df.tail(10)

        for idx, row in recent.iterrows():
            is_new = row.get('name', 'Anonymous') in st.session_state.new_entries

            with st.container():
                cols = st.columns([2, 3, 2, 1])
                with cols[0]:
                    name = row.get('name', 'Anonymous')
                    if is_new:
                        st.markdown(f"<span class='new-entry'>✨ **{name}**</span>", unsafe_allow_html=True)
                    else:
                        st.write(f"**{name}**")
                with cols[1]:
                    st.write(f"🎵 {row.get('favorite_song', 'Unknown')} - {row.get('artist', 'Unknown')}")
                with cols[2]:
                    st.write(f"📚 {row.get('major', 'Unknown')}")
                with cols[3]:
                    if 'audio_energy' in row:
                        energy = row['audio_energy']
                        st.progress(energy, text="Energy")
    else:
        st.info("Waiting for responses... The feed will update automatically!")

with tab2:
    st.header("👥 Discover Your Music Twin")

    if not df.empty and 'name' in df.columns:
        selected_user = st.selectbox("Select your entry:", df['name'].unique())

        if selected_user and st.button("🔍 Find My Music Twin!", type="primary"):
            user_idx = df[df['name'] == selected_user].index[0]

            # Get similarity matrix from first row (it's the same for all)
            if 'similarity_matrix' in df.columns:
                similarity_matrix = df.iloc[0]['similarity_matrix']
                twins = engineer.find_music_twins(user_idx, similarity_matrix, top_k=3)

                st.subheader("Your Music Twins:")
                for twin_idx, similarity in twins:
                    twin = df.iloc[twin_idx]
                    match_percent = similarity * 100

                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.write(f"**{twin.get('name', 'Anonymous')}** - {match_percent:.1f}% match")
                        st.write(f"🎵 {twin.get('favorite_song', 'Unknown')} by {twin.get('artist', 'Unknown')}")
                        st.write(f"📚 Major: {twin.get('major', 'Unknown')}")
                    with col2:
                        st.metric("Match", f"{match_percent:.0f}%")
            else:
                st.warning("Processing data... Please try again in a moment.")
    else:
        st.info("Add your music preferences to find your twin!")

with tab3:
    st.header("📊 Group Analysis")

    if not df.empty:
        col1, col2 = st.columns(2)

        with col1:
            # Cluster visualization
            st.subheader("Music Taste Clusters")
            if 'cluster' in df.columns:
                fig = visualizer.create_cluster_scatter(df, st.session_state.new_entries)
                st.plotly_chart(fig, use_container_width=True)

        with col2:
            # Genre distribution
            st.subheader("Major vs Music Preferences")
            fig = visualizer.create_major_heatmap(df)
            st.plotly_chart(fig, use_container_width=True)

        # Statistics
        st.subheader("📈 Interesting Statistics")
        stats_cols = st.columns(4)

        with stats_cols[0]:
            if 'favorite_song' in df.columns:
                top_song = df['favorite_song'].mode().iloc[0] if not df['favorite_song'].mode().empty else 'N/A'
                st.metric("Most Popular Song", top_song[:20])

        with stats_cols[1]:
            if 'audio_energy' in df.columns:
                avg_energy = df['audio_energy'].mean()
                st.metric("Avg Energy", f"{avg_energy:.2f}")

        with stats_cols[2]:
            if 'audio_valence' in df.columns:
                avg_happiness = df['audio_valence'].mean()
                st.metric("Avg Happiness", f"{avg_happiness:.2f}")

        with stats_cols[3]:
            if 'cluster' in df.columns:
                n_clusters = df['cluster'].nunique()
                st.metric("Music Groups", n_clusters)
    else:
        st.info("Waiting for data to analyze...")

with tab4:
    st.header("🎮 Guess the Major Game")

    if not df.empty and 'major' in df.columns and len(df) > 1:
        col1, col2 = st.columns([2, 1])

        with col1:
            if st.button("🎲 New Round"):
                st.session_state.game_round += 1
                random_idx = np.random.randint(0, len(df))
                st.session_state.current_entry = df.iloc[random_idx]

            if 'current_entry' in st.session_state:
                entry = st.session_state.current_entry

                st.info(f"""
                **Song:** {entry.get('favorite_song', 'Unknown')}
                **Artist:** {entry.get('artist', 'Unknown')}
                **Listening Time:** {entry.get('listening_time', 'Unknown')}
                """)

                majors = df['major'].unique()
                guess = st.selectbox("Your guess:", ["Select..."] + list(majors))

                if guess != "Select..." and st.button("Submit Guess"):
                    if guess == entry.get('major'):
                        st.success("🎉 Correct!")
                        st.session_state.game_score += 1
                    else:
                        st.error(f"❌ Wrong! It was {entry.get('major')}")

        with col2:
            st.metric("Your Score", f"{st.session_state.game_score}/{st.session_state.game_round}")
    else:
        st.info("Need more data to play the game!")

with tab5:
    st.header("🏆 Leaderboard & Awards")

    if not df.empty:
        st.subheader("🥇 Music Awards")

        awards_cols = st.columns(3)

        with awards_cols[0]:
            if 'audio_energy' in df.columns:
                most_energetic = df.nlargest(1, 'audio_energy').iloc[0]
                st.markdown("### 🎸 Most Energetic")
                st.success(f"**{most_energetic.get('name', 'Anonymous')}**")
                st.caption(f"{most_energetic.get('favorite_song', 'Unknown')}")

        with awards_cols[1]:
            if 'audio_valence' in df.columns:
                most_happy = df.nlargest(1, 'audio_valence').iloc[0]
                st.markdown("### 😊 Happiest Vibes")
                st.success(f"**{most_happy.get('name', 'Anonymous')}**")
                st.caption(f"{most_happy.get('favorite_song', 'Unknown')}")

        with awards_cols[2]:
            if 'audio_danceability' in df.columns:
                most_danceable = df.nlargest(1, 'audio_danceability').iloc[0]
                st.markdown("### 🕺 Most Danceable")
                st.success(f"**{most_danceable.get('name', 'Anonymous')}**")
                st.caption(f"{most_danceable.get('favorite_song', 'Unknown')}")
    else:
        st.info("Awards will appear as data comes in!")

# Auto-refresh
if auto_refresh:
    time.sleep(refresh_interval)
    st.rerun()