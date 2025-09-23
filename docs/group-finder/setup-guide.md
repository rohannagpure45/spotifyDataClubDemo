# Group Finder - Setup and Configuration Guide

## Prerequisites

### System Requirements

- **Python**: 3.8 or higher
- **Memory**: Minimum 4GB RAM (8GB recommended for 50+ participants)
- **Storage**: 500MB for dependencies and cache
- **Network**: Internet connection for API access (optional with mock data)

### Required Dependencies

```bash
# Core dependencies (already included in requirements.txt)
streamlit==1.40.2
pandas==2.2.3
numpy==2.2.1
scikit-learn==1.6.0

# Optional for enhanced functionality
faker==33.3.0  # Mock data generation
```

## Installation

### 1. Environment Setup

```bash
# Navigate to project directory
cd /path/to/spotifyDataClubDemo

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Verify Installation

```bash
# Test core imports
python -c "
from src.models.group_formation import GroupFormationEngine
from src.utils.group_namer import GroupNamer
print('✅ Group Finder components imported successfully')
"

# Test Streamlit integration
python -c "
import sys
sys.path.append('.')
from demo.app import group_engine, group_namer
print('✅ Streamlit integration working')
"
```

### 3. Run Application

```bash
# Quick start with run script
./run.sh

# Or manual start
source venv/bin/activate
streamlit run demo/app.py
```

## Google Forms Data Mapping

### Required Form Fields

For the application to work properly with Google Forms data, your form must include these exact field names (case-sensitive):

#### **Essential Fields (Required)**
- `email` - Respondent's email address (required for user mapping)
- `name` - Full name of the respondent
- `major` - Academic major or field of study
- `year` - Year in school (e.g., "Freshman", "Sophomore", "Junior", "Senior")
- `favorite_song` - Their favorite song title
- `favorite_artists` - Comma-separated list of favorite artists

#### **Music Preference Fields (Required)**
- `genres` - Comma-separated list of music genres they enjoy

#### **Audio Feature Fields (Optional but Recommended)**
- `energy` - Energy level preference (0-1 scale, where 1 = high energy)
- `valence` - Happiness/positivity preference (0-1 scale, where 1 = very positive)
- `danceability` - Danceability preference (0-1 scale, where 1 = very danceable)
- `acousticness` - Acoustic vs electronic preference (0-1 scale, where 1 = very acoustic)
- `tempo` - Preferred tempo in BPM (beats per minute)

### Google Form Setup Example

#### Form Questions:
1. **Email Address** → `email`
2. **Full Name** → `name`
3. **Academic Major** → `major`
4. **Year in School** → `year`
5. **Favorite Song** → `favorite_song`
6. **Favorite Artists** (separate with commas) → `favorite_artists`
7. **Music Genres You Enjoy** (separate with commas) → `genres`

#### Optional Advanced Questions:
8. **Energy Level** (0 = calm, 1 = high energy) → `energy`
9. **Positivity** (0 = melancholic, 1 = upbeat) → `valence`
10. **Danceability** (0 = not danceable, 1 = very danceable) → `danceability`
11. **Acoustic Preference** (0 = electronic, 1 = acoustic) → `acousticness`
12. **Preferred Tempo** (BPM, e.g., 120) → `tempo`

### CSV Column Headers

When exporting from Google Forms to CSV, ensure these exact column headers:

```csv
email,name,major,year,favorite_song,favorite_artists,genres,energy,valence,danceability,acousticness,tempo
john@example.com,John Doe,Computer Science,Junior,Bohemian Rhapsody,Queen,Rock,0.8,0.7,0.6,0.3,120
```

### Data Processing Flow

1. **User Creation**: System auto-creates user accounts based on email addresses
2. **Data Validation**: Required fields are validated during import
3. **Music Submissions**: Songs and preferences are stored in the database
4. **Real-time Updates**: All statistics and displays update automatically
5. **Group Formation**: Advanced algorithms use the data for compatibility matching

### Troubleshooting Common Issues

#### Missing Data
- **Problem**: "No submissions yet" shown on dashboard
- **Solution**: Ensure CSV has proper column headers and valid email addresses

#### Invalid Audio Features
- **Problem**: Audio features not processing correctly
- **Solution**: Ensure audio feature values are between 0 and 1 (decimal format)

#### User Mapping Issues
- **Problem**: Users not being created properly
- **Solution**: Check that email column exists and contains valid email addresses

## Configuration Options

### 1. Group Size Parameters

**File**: Modify `src/models/group_formation.py` line 40-41

```python
class GroupFormationEngine:
    def __init__(self, min_group_size: int = 3, max_group_size: int = 4, overflow_max: int = 6):
        # min_group_size: Minimum people per group (default: 3)
        # max_group_size: Target group size (default: 4)
        # overflow_max: Maximum allowed group size (default: 6)
```

**Customization Example**:
```python
# For larger events, use bigger groups
group_engine = GroupFormationEngine(min_group_size=4, max_group_size=6, overflow_max=8)

# For intimate gatherings, use smaller groups
group_engine = GroupFormationEngine(min_group_size=2, max_group_size=3, overflow_max=4)
```

### 2. Similarity Algorithm Weights

**File**: Modify `src/models/group_formation.py` line 117

```python
def _calculate_similarity_matrix(self, df: pd.DataFrame) -> np.ndarray:
    # Current weights: 70% genre, 30% artist
    total_sim = 0.7 * genre_sim + 0.3 * artist_sim

    # Custom weights examples:
    # total_sim = 0.8 * genre_sim + 0.2 * artist_sim  # Emphasize genres
    # total_sim = 0.5 * genre_sim + 0.5 * artist_sim  # Equal weight
```

### 3. Custom Group Names

**File**: Add to `src/utils/group_namer.py`

```python
# Add custom artist roasts
custom_artist_roasts = {
    'your_local_artist': [
        ("Local Legends", "Supporting hometown heroes"),
        ("Indie Discoverers", "Found them before they were cool"),
    ]
}

# Integrate in __init__ method
def __init__(self):
    # ... existing roasts ...
    self.artist_roasts.update(custom_artist_roasts)
```

### 4. UI Customization

**File**: Modify `demo/app.py` tab2 section (lines 230-370)

```python
# Custom group card styling
def render_custom_group_card(group):
    with st.container():
        # Add custom CSS classes
        st.markdown(f'<div class="custom-group-card">', unsafe_allow_html=True)
        st.markdown(f"### 🎵 {group.roast_name}")
        # ... custom layout ...
        st.markdown('</div>', unsafe_allow_html=True)
```

## Integration Setup

### 1. Existing Streamlit App Integration

If integrating into an existing Streamlit application:

```python
# 1. Import components
from src.models.group_formation import GroupFormationEngine
from src.utils.group_namer import GroupNamer

# 2. Initialize in your app
@st.cache_resource
def init_group_finder():
    return GroupFormationEngine(), GroupNamer()

group_engine, group_namer = init_group_finder()

# 3. Add session state management
if 'current_groups' not in st.session_state:
    st.session_state.current_groups = []
if 'groups_finalized' not in st.session_state:
    st.session_state.groups_finalized = False
if 'group_change_requests' not in st.session_state:
    st.session_state.group_change_requests = []

# 4. Add your UI components (see demo/app.py for reference)
```

### 2. Data Source Integration

**With Pandas DataFrame**:
```python
# Your data must include these columns:
required_columns = ['name', 'favorite_song', 'artist', 'major']
optional_columns = ['genres', 'age', 'audio_energy', 'audio_valence']

# Example integration
df = load_your_data()  # Your data loading function
groups = group_engine.create_groups(df)
named_groups = group_namer.generate_group_names(groups)
```

**With Google Sheets** (already integrated):
```python
# Set environment variables
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_PATH=path/to/credentials.json
```

**With Custom API**:
```python
# Create adapter function
def load_from_custom_api():
    data = fetch_from_your_api()  # Your API call
    df = pd.DataFrame(data)

    # Ensure required format
    df = df.rename(columns={
        'user_name': 'name',
        'song_title': 'favorite_song',
        'song_artist': 'artist',
        'study_major': 'major'
    })
    return df
```

## Environment Variables

### Required (Optional with Mock Data)

```bash
# .env file
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8501/callback

GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_PATH=path/to/service-account.json
```

### Optional Configuration

```bash
# Group formation settings
GROUP_MIN_SIZE=3
GROUP_MAX_SIZE=4
GROUP_OVERFLOW_MAX=6

# Cache settings
ENABLE_CACHE=true
CACHE_TTL_HOURS=24

# UI settings
ENABLE_BALLOONS=true
SHOW_COMPATIBILITY_SCORES=true
```

## Testing Setup

### 1. Mock Data Testing

The system automatically uses mock data when API credentials are not available:

```python
# Test with mock data (no setup required)
# Simply run the app without API credentials
streamlit run demo/app.py

# Generate custom mock data
from src.api.google_sheets import MockGoogleSheetsClient
mock_client = MockGoogleSheetsClient(sample_size=20)
df = mock_client.fetch_responses()
```

### 2. Unit Testing

```bash
# Run tests (if test suite is created)
pytest tests/test_group_formation.py
pytest tests/test_group_namer.py

# Manual testing scripts
python tests/manual_test_clustering.py
python tests/manual_test_names.py
```

### 3. Load Testing

```python
# Test with larger datasets
from src.api.google_sheets import MockGoogleSheetsClient

# Generate 100 participants
large_mock = MockGoogleSheetsClient(sample_size=100)
df = large_mock.fetch_responses()

# Test performance
import time
start_time = time.time()
groups = group_engine.create_groups(df)
named_groups = group_namer.generate_group_names(groups)
end_time = time.time()

print(f"Processing time for {len(df)} participants: {end_time - start_time:.2f} seconds")
```

## Performance Optimization

### 1. Caching Configuration

```python
# Increase cache size for large events
@st.cache_data(max_entries=100)  # Default is 100
def cached_similarity_calculation(df_hash):
    return calculate_similarity_matrix(df)
```

### 2. Memory Management

```python
# For very large datasets (100+ participants)
import gc

def optimize_memory_usage():
    # Clear unnecessary variables
    gc.collect()

    # Use chunked processing for similarity matrix
    chunk_size = 50  # Process 50 participants at a time
    # Implementation depends on specific needs
```

### 3. Algorithm Optimization

```python
# Use approximate clustering for speed (less accurate)
from sklearn.cluster import MiniBatchKMeans

def fast_clustering(similarity_matrix, n_groups):
    kmeans = MiniBatchKMeans(n_clusters=n_groups, random_state=42, batch_size=100)
    return kmeans.fit_predict(similarity_matrix)
```

## Troubleshooting

### Common Issues

**1. Import Errors**
```bash
# Error: "No module named 'src'"
# Solution: Run from project root directory
cd /path/to/spotifyDataClubDemo
python -c "import sys; sys.path.append('.'); from src.models.group_formation import GroupFormationEngine"
```

**2. Memory Issues with Large Groups**
```bash
# Error: "MemoryError" with 200+ participants
# Solution: Reduce batch size or use sampling
df_sample = df.sample(n=100)  # Process subset
```

**3. Clustering Convergence Issues**
```python
# Error: "KMeans failed to converge"
# Solution: Increase iterations or use different initialization
kmeans = KMeans(n_clusters=n_groups, max_iter=1000, n_init=20)
```

**4. Session State Issues**
```python
# Error: Groups disappear on page refresh
# Solution: This is expected behavior. Groups are session-based only.
# For persistence, implement database storage or export functionality.
```

### Debug Mode

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test individual components
def debug_group_formation():
    engine = GroupFormationEngine()
    df = load_test_data()

    print(f"Input data shape: {df.shape}")
    print(f"Required columns present: {all(col in df.columns for col in ['name', 'artist'])}")

    groups = engine.create_groups(df)
    print(f"Created {len(groups)} groups")
    for i, group in enumerate(groups):
        print(f"Group {i}: {len(group.members)} members, compatibility: {group.compatibility_score:.1f}%")
```

## Production Deployment

### 1. Docker Setup

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8501

CMD ["streamlit", "run", "demo/app.py", "--server.address", "0.0.0.0"]
```

### 2. Environment Configuration

```bash
# Production environment variables
STREAMLIT_SERVER_HEADLESS=true
STREAMLIT_SERVER_PORT=8501
STREAMLIT_BROWSER_GATHER_USAGE_STATS=false
```

### 3. Security Considerations

```python
# Sanitize user inputs
import html

def sanitize_group_name(name: str) -> str:
    return html.escape(name)[:100]  # Limit length and escape HTML

# Validate user requests
def validate_group_request(member_name: str, target_group_id: int) -> bool:
    if not isinstance(member_name, str) or len(member_name) > 50:
        return False
    if not isinstance(target_group_id, int) or target_group_id < 0:
        return False
    return True
```

## Support and Maintenance

### Logging Setup

```python
# Add to your application
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('group_finder.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('group_finder')
logger.info("Group formation started")
```

### Monitoring

```python
# Add metrics collection
def collect_usage_metrics():
    metrics = {
        'total_participants': len(st.session_state.get('processed_df', [])),
        'groups_created': len(st.session_state.get('current_groups', [])),
        'requests_processed': len(st.session_state.get('group_change_requests', [])),
        'session_duration': time.time() - st.session_state.get('start_time', time.time())
    }
    return metrics
```

---

*For usage instructions, see [User Guide](user-guide.md)*
*For technical details, see [Technical Guide](technical-guide.md)*