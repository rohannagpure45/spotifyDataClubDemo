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
from src.models.group_formation import GroupFormationEngine
from src.utils.group_namer import GroupNamer
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
if 'current_groups' not in st.session_state:
    st.session_state.current_groups = []
if 'groups_finalized' not in st.session_state:
    st.session_state.groups_finalized = False
if 'group_change_requests' not in st.session_state:
    st.session_state.group_change_requests = []

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
    group_engine = GroupFormationEngine()
    group_namer = GroupNamer()

    return sheets_client, processor, engineer, clusterer, predictor, visualizer, group_engine, group_namer

# Load components
sheets_client, processor, engineer, clusterer, predictor, visualizer, group_engine, group_namer = init_components()

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
def _normalize_imported_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names and map common fields for imported CSV/XLSX."""
    if df is None or df.empty:
        return pd.DataFrame()

    # Normalize column names
    df = df.copy()
    df.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]

    # Map favorite song
    if 'favorite_song' not in df.columns:
        for alt in ['song', 'track', 'track_name', 'song_title']:
            if alt in df.columns:
                df['favorite_song'] = df[alt]
                break

    # Map artist (from favorite_artists/artists -> first artist)
    if 'artist' not in df.columns:
        for alt in ['favorite_artists', 'artists', 'artist_name']:
            if alt in df.columns:
                def _first_artist(x) -> str:
                    try:
                        if isinstance(x, list):
                            return str(x[0]) if x else ''
                        s = str(x)
                        return s.split(',')[0].strip() if s else ''
                    except Exception:
                        return ''
                df['artist'] = df[alt].apply(_first_artist)
                break

    # Ensure name exists
    if 'name' not in df.columns:
        df['name'] = [f"Anonymous {i+1}" for i in range(len(df))]

    # Map genres if alternate present
    if 'genres' not in df.columns:
        for alt in ['genre', 'music_genres']:
            if alt in df.columns:
                df['genres'] = df[alt]
                break

    return df


def load_and_process_data(source_df: pd.DataFrame | None = None):
    """Load and process the latest data. If a source_df is provided or an uploaded
    file is present in session state, prefer that over Google Sheets."""
    # Prefer explicitly provided data
    base_df: pd.DataFrame | None = None

    if source_df is not None:
        base_df = source_df
    elif st.session_state.get('use_uploaded_data') and st.session_state.get('uploaded_df_raw') is not None:
        base_df = st.session_state.get('uploaded_df_raw')
    else:
        base_df = sheets_client.fetch_responses()

    df = _normalize_imported_dataframe(base_df) if base_df is not None else pd.DataFrame()

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
    "🎯 Live Feed", "🎵 Group Finder", "📊 Analysis",
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
    st.header("🎵 Group Finder")

    # CSV/XLSX Import (placed near group formation controls)
    st.subheader("Import Responses (CSV/XLSX)")
    import_cols = st.columns([3, 2])
    with import_cols[0]:
        uploaded_file = st.file_uploader(
            "Upload Google Forms export (.csv or .xlsx)",
            type=["csv", "xlsx"],
            accept_multiple_files=False,
            help="Use this if sharing a Google Sheet isn't working."
        )
    with import_cols[1]:
        if uploaded_file is not None:
            if st.button("Import File", type="primary", use_container_width=True):
                try:
                    if uploaded_file.name.lower().endswith('.csv'):
                        imported = pd.read_csv(uploaded_file)
                    else:
                        # Excel support requires openpyxl in the environment
                        try:
                            imported = pd.read_excel(uploaded_file)
                        except ImportError as e:
                            st.error("Reading .xlsx requires 'openpyxl'. Please install it or upload a CSV.")
                            imported = pd.DataFrame()

                    normalized = _normalize_imported_dataframe(imported)
                    if normalized.empty:
                        st.warning("Uploaded file appears empty or missing required columns.")
                    else:
                        st.session_state.uploaded_df_raw = normalized
                        st.session_state.use_uploaded_data = True
                        # Process and persist for all tabs/metrics
                        processed = load_and_process_data(source_df=normalized)
                        st.session_state.processed_df = processed
                        st.session_state.responses_count = len(processed)
                        st.success(f"Imported {len(processed)} rows from {uploaded_file.name}")
                        st.rerun()
                except Exception as e:
                    st.error(f"Failed to import file: {e}")

        # Clear imported data
        if st.session_state.get('use_uploaded_data'):
            if st.button("Clear Imported Data", type="secondary", use_container_width=True):
                st.session_state.use_uploaded_data = False
                st.session_state.uploaded_df_raw = None
                st.success("Cleared imported data; reverting to Google Sheets.")
                st.rerun()

    if not df.empty and len(df) >= 6:
        # Group formation controls
        col1, col2 = st.columns([3, 1])

        with col1:
            st.subheader("Form Music Groups")
            if not st.session_state.groups_finalized:
                if st.button("🎲 Create Groups", type="primary", disabled=len(st.session_state.current_groups) > 0):
                    # Create groups using the group formation engine
                    try:
                        groups = group_engine.create_groups(df)
                        groups_with_names = group_namer.generate_group_names(groups)
                        st.session_state.current_groups = groups_with_names
                        st.success(f"Created {len(groups_with_names)} groups!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error creating groups: {e}")

                if len(st.session_state.current_groups) > 0:
                    if st.button("🔄 Regenerate Groups", type="secondary"):
                        st.session_state.current_groups = []
                        st.rerun()
            else:
                st.success("Groups have been finalized! ✅")

        with col2:
            if len(st.session_state.current_groups) > 0 and not st.session_state.groups_finalized:
                if st.button("🔒 Finalize Groups", type="primary"):
                    st.session_state.groups_finalized = True
                    st.balloons()
                    st.success("Groups finalized!")
                    st.rerun()

        # Display current groups
        if len(st.session_state.current_groups) > 0:
            st.divider()
            st.subheader("Your Music Groups")

            for i, group in enumerate(st.session_state.current_groups):
                with st.container():
                    # Group header with roast name
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.markdown(f"### 🎤 {group.roast_name}")
                        st.caption(group.group_theme)
                    with col2:
                        st.metric("Compatibility", f"{group.compatibility_score:.1f}%")

                    # Group members
                    st.markdown("**Members:**")
                    member_cols = st.columns(min(len(group.members), 4))

                    for j, member_name in enumerate(group.members):
                        col_idx = j % len(member_cols)
                        with member_cols[col_idx]:
                            # Find member data
                            member_data = df[df['name'] == member_name]
                            if not member_data.empty:
                                member = member_data.iloc[0]
                                st.write(f"**{member_name}**")
                                st.write(f"🎵 {member.get('favorite_song', 'Unknown')}")
                                st.write(f"👤 {member.get('artist', 'Unknown')}")
                                st.write(f"📚 {member.get('major', 'Unknown')}")
                            else:
                                st.write(f"**{member_name}**")

                    # Group characteristics
                    if group.shared_artists:
                        st.write(f"🎤 **Shared Artists:** {', '.join(group.shared_artists[:3])}")
                    if group.shared_genres:
                        st.write(f"🎶 **Shared Genres:** {', '.join(group.shared_genres[:3])}")

                    # Request to join group (if groups not finalized)
                    if not st.session_state.groups_finalized and 'name' in df.columns:
                        with st.expander("Request to Join This Group"):
                            available_names = [name for name in df['name'].unique()
                                             if name not in group.members]
                            if available_names:
                                selected_name = st.selectbox(
                                    "Select your name:",
                                    ["Select..."] + available_names,
                                    key=f"join_group_{i}"
                                )
                                if selected_name != "Select..." and st.button(f"Request to Join", key=f"request_{i}"):
                                    # Check if user is already in another group
                                    current_group = group_engine.get_group_by_member(selected_name)
                                    if current_group and len(current_group.members) <= 3:
                                        st.warning("Your current group would become too small if you leave.")
                                    elif len(group.members) >= 6:
                                        st.warning("This group is already full.")
                                    else:
                                        # Add to requests
                                        request = {
                                            'member': selected_name,
                                            'target_group': i,
                                            'target_group_name': group.roast_name
                                        }
                                        st.session_state.group_change_requests.append(request)
                                        st.success(f"Request submitted to join {group.roast_name}!")
                            else:
                                st.info("All members are already in this group.")

                    st.divider()

            # Display pending requests (if any)
            if len(st.session_state.group_change_requests) > 0 and not st.session_state.groups_finalized:
                st.subheader("📋 Pending Group Change Requests")
                for i, request in enumerate(st.session_state.group_change_requests):
                    col1, col2, col3 = st.columns([2, 2, 1])
                    with col1:
                        st.write(f"**{request['member']}** wants to join **{request['target_group_name']}**")
                    with col2:
                        if st.button("✅ Approve", key=f"approve_{i}"):
                            # Process the request
                            success = group_engine.request_group_change(
                                request['member'],
                                request['target_group']
                            )
                            if success:
                                st.success("Request approved!")
                                # Remove the request
                                st.session_state.group_change_requests.pop(i)
                                st.rerun()
                            else:
                                st.error("Could not process request - group constraints violated.")
                    with col3:
                        if st.button("❌ Deny", key=f"deny_{i}"):
                            st.session_state.group_change_requests.pop(i)
                            st.rerun()
        else:
            st.info("Click 'Create Groups' to form music-based groups!")

    elif not df.empty and len(df) < 6:
        st.info(f"Need at least 6 people to form groups. Currently have {len(df)} people.")
        st.write("Groups will be created automatically when more people join!")

    else:
        st.info("Waiting for people to join... Groups will be formed automatically!")

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
