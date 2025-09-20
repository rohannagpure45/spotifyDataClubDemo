# Spotify Favorites Analysis Dashboard - Technical Documentation

**Internal Engineering Reference**
*Last Updated: September 2025*

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Data Flow & Pipeline](#data-flow--pipeline)
4. [API Integrations](#api-integrations)
5. [Machine Learning Components](#machine-learning-components)
6. [Caching Strategy](#caching-strategy)
7. [Database Schema](#database-schema)
8. [Performance Considerations](#performance-considerations)
9. [Security Implementation](#security-implementation)
10. [Deployment Architecture](#deployment-architecture)
11. [Error Handling](#error-handling)
12. [Testing Strategy](#testing-strategy)
13. [Monitoring & Logging](#monitoring--logging)
14. [Development Workflow](#development-workflow)

---

## System Architecture

### High-Level Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Google Forms  │    │  Spotify API    │    │   Frontend UI   │
│   Data Source   │    │   (PKCE Auth)   │    │   (Streamlit)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Processing Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Google    │  │   Spotify   │  │    Data     │            │
│  │ Sheets API  │  │   Client    │  │ Processor   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Machine Learning Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Feature    │  │ Clustering  │  │ Classification│           │
│  │ Engineering │  │  (K-Means)  │  │(Random Forest)│           │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Visualization Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Plotly    │  │ Interactive │  │   Live      │            │
│  │   Charts    │  │  Dashboard  │  │ Updates     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Frontend Layer:**
- **Framework**: Streamlit 1.40.2
- **Session Management**: Streamlit's built-in session state
- **Styling**: Custom CSS via `.streamlit/config.toml`
- **Real-time Updates**: Auto-refresh with configurable intervals

**API Layer:**
- **Spotify Integration**: OAuth2 PKCE flow (2025 compliant)
- **Google Sheets**: Service account authentication
- **Rate Limiting**: Exponential backoff with circuit breaker pattern

**Processing Layer:**
- **Data Enrichment**: Spotify audio features enhancement
- **Caching**: Multi-tier (memory + disk) with TTL
- **Batch Processing**: Optimized for multiple concurrent requests

**ML Layer:**
- **Clustering**: K-means with PCA dimensionality reduction
- **Classification**: Random Forest with feature importance analysis
- **Feature Engineering**: 13-dimensional audio feature space

---

## Technology Stack

### Core Dependencies
```python
# Web Framework
streamlit==1.40.2

# Data Processing
pandas==2.2.3
numpy==2.2.1

# Machine Learning
scikit-learn==1.6.0

# Visualization
plotly==5.24.1

# API Clients
spotipy==2.24.0
google-api-python-client==2.155.0
google-auth==2.37.0
google-auth-oauthlib==1.2.0

# Utilities
python-dotenv==1.0.1
faker==33.3.0
requests==2.32.3
```

### Development Tools
```python
# Testing
pytest==8.3.4
pytest-asyncio==0.25.1

# Code Quality
black==24.10.0
pylint==3.3.3

# Performance
redis==5.2.1  # Optional caching backend
```

---

## Data Flow & Pipeline

### 1. Data Ingestion
```python
# Entry Point: demo/app.py:load_and_process_data()
def load_and_process_data():
    df = sheets_client.fetch_responses()  # Google Sheets API
    enriched_df = processor.enrich_with_spotify_data(df)  # Spotify API
    return enriched_df
```

### 2. Data Enrichment Pipeline
```python
# src/processing/data_processor.py:enrich_with_spotify_data()
def enrich_with_spotify_data(self, df: pd.DataFrame) -> pd.DataFrame:
    # 1. Extract track information
    # 2. Fetch audio features from Spotify
    # 3. Apply caching layer
    # 4. Batch process for efficiency
    # 5. Handle API failures gracefully
```

### 3. Feature Engineering
```python
# src/processing/feature_engineer.py:create_music_dna()
def create_music_dna(self, df: pd.DataFrame) -> pd.DataFrame:
    # 1. Normalize audio features [0,1]
    # 2. Apply PCA (13D → 3D)
    # 3. Create similarity matrix
    # 4. Generate cluster assignments
```

### 4. Model Training & Inference
```python
# Real-time model training on new data
def update_models(self, df: pd.DataFrame):
    self.clusterer.fit(audio_features)
    self.classifier.fit(features, majors)
    # Models are retrained on each data refresh
```

---

## API Integrations

### Spotify Web API

**Authentication:** PKCE OAuth2 Flow
```python
# src/api/spotify_client.py:SpotifyPKCEClient
class SpotifyPKCEClient:
    def generate_pkce_params(self) -> Tuple[str, str]:
        # Generate code_verifier and code_challenge
        # Base64 URL-safe encoding
        # SHA256 hashing for challenge

    def get_auth_url(self) -> str:
        # Construct authorization URL
        # Include PKCE parameters

    def exchange_code_for_token(self, code: str) -> Dict:
        # Exchange authorization code for access token
        # Verify PKCE challenge
```

**Rate Limiting:**
- **Requests per second**: 20 (with burst tolerance)
- **Backoff Strategy**: Exponential (2^retry_count seconds)
- **Circuit Breaker**: After 5 consecutive failures

**Audio Features Retrieved:**
```python
AUDIO_FEATURES = [
    'danceability', 'energy', 'key', 'loudness', 'mode',
    'speechiness', 'acousticness', 'instrumentalness',
    'liveness', 'valence', 'tempo', 'duration_ms', 'time_signature'
]
```

### Google Sheets API

**Authentication:** Service Account
```python
# src/api/google_sheets.py:GoogleSheetsClient
def authenticate(self):
    credentials = service_account.Credentials.from_service_account_file(
        self.service_account_path,
        scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
    )
```

**Data Schema Expected:**
```python
EXPECTED_COLUMNS = [
    'timestamp', 'name', 'age', 'major', 'year', 'hometown',
    'favorite_song', 'artist', 'hours_per_day', 'listening_time'
]
```

**Mock Data Generation:**
```python
# Faker-based realistic data generation
def _generate_sample_data(self) -> pd.DataFrame:
    # 50 realistic student profiles
    # Diverse musical preferences
    # Realistic demographic distribution
```

---

## Machine Learning Components

### Feature Engineering

**Audio Feature Normalization:**
```python
def normalize_features(self, df: pd.DataFrame) -> pd.DataFrame:
    numerical_features = ['danceability', 'energy', 'valence', ...]
    scaler = StandardScaler()
    df[numerical_features] = scaler.fit_transform(df[numerical_features])
    return df
```

**Dimensionality Reduction:**
```python
def apply_pca(self, features: np.ndarray) -> np.ndarray:
    pca = PCA(n_components=3)
    return pca.fit_transform(features)
```

### Clustering Algorithm

**K-Means Implementation:**
```python
# src/models/clustering.py:MusicClusterer
class MusicClusterer:
    def __init__(self, n_clusters: int = 5):
        self.kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=42,
            n_init=10,
            max_iter=300
        )

    def fit_predict(self, features: np.ndarray) -> np.ndarray:
        return self.kmeans.fit_predict(features)
```

**Similarity Calculation:**
```python
def calculate_similarity_matrix(self, features: np.ndarray) -> np.ndarray:
    # Cosine similarity for high-dimensional audio features
    return cosine_similarity(features)
```

### Classification Model

**Random Forest for Major Prediction:**
```python
# src/models/classifier.py:MajorPredictor
class MajorPredictor:
    def __init__(self):
        self.rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )

    def predict_with_confidence(self, features: np.ndarray) -> Tuple[str, float]:
        prediction = self.rf.predict(features)[0]
        probabilities = self.rf.predict_proba(features)[0]
        confidence = np.max(probabilities)
        return prediction, confidence
```

---

## Caching Strategy

### Multi-Tier Caching Architecture

**Level 1: Memory Cache (LRU)**
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_track_features(track_id: str) -> Dict:
    # In-memory cache for frequently accessed tracks
    # Automatically evicts least recently used entries
```

**Level 2: Disk Cache**
```python
class CacheManager:
    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = Path(cache_dir)
        self.ttl_hours = 24

    def get_cached_response(self, key: str) -> Optional[Dict]:
        # File-based caching with TTL
        # Survives application restarts

    def cache_response(self, key: str, data: Dict) -> None:
        # Atomic write operations
        # Compressed JSON storage
```

**Cache Invalidation Strategy:**
- **TTL-based**: 24 hours for API responses
- **Manual**: Force refresh via UI controls
- **Size-based**: LRU eviction when memory limit reached

### Cache Key Generation
```python
def generate_cache_key(self, track_name: str, artist: str) -> str:
    # Normalize strings for consistent caching
    normalized = f"{track_name.lower().strip()}:{artist.lower().strip()}"
    return hashlib.md5(normalized.encode()).hexdigest()
```

---

## Database Schema

### In-Memory Data Structure

**Primary DataFrame Schema:**
```python
ENRICHED_SCHEMA = {
    # User Information
    'timestamp': 'datetime64[ns]',
    'name': 'object',
    'age': 'int64',
    'major': 'object',
    'year': 'object',
    'hometown': 'object',

    # Music Preferences
    'favorite_song': 'object',
    'artist': 'object',
    'hours_per_day': 'float64',
    'listening_time': 'object',

    # Spotify Enrichment
    'track_id': 'object',
    'popularity': 'int64',
    'genres': 'object',  # JSON list

    # Audio Features (13 dimensions)
    'danceability': 'float64',
    'energy': 'float64',
    'key': 'int64',
    'loudness': 'float64',
    'mode': 'int64',
    'speechiness': 'float64',
    'acousticness': 'float64',
    'instrumentalness': 'float64',
    'liveness': 'float64',
    'valence': 'float64',
    'tempo': 'float64',
    'duration_ms': 'int64',
    'time_signature': 'int64',

    # ML Features
    'cluster': 'int64',
    'pca_1': 'float64',
    'pca_2': 'float64',
    'pca_3': 'float64',
    'music_dna_score': 'float64'
}
```

---

## Performance Considerations

### Optimization Strategies

**1. Lazy Loading:**
```python
# Components initialized only when needed
@st.cache_resource
def init_components():
    # Heavy initialization cached across sessions
    return sheets_client, processor, engineer, clusterer, predictor
```

**2. Batch Processing:**
```python
def batch_spotify_requests(self, track_ids: List[str], batch_size: int = 50):
    # Process multiple tracks in single API call
    # Reduce API overhead by ~95%
    for batch in chunked(track_ids, batch_size):
        features = self.spotify.audio_features(batch)
        yield features
```

**3. Session State Management:**
```python
# Persistent data across user interactions
if 'processed_data' not in st.session_state:
    st.session_state.processed_data = load_and_process_data()
    st.session_state.last_refresh = time.time()
```

**4. Streaming Data Updates:**
```python
def incremental_update(self, new_data: pd.DataFrame):
    # Only process new records since last update
    # Avoid reprocessing entire dataset
    last_processed = st.session_state.get('last_processed_timestamp')
    new_records = new_data[new_data['timestamp'] > last_processed]
    return self.process_batch(new_records)
```

### Performance Metrics

**Target Benchmarks:**
- **Page Load Time**: < 3 seconds
- **Data Refresh**: < 5 seconds for 100 records
- **Chart Rendering**: < 2 seconds for 3D plots
- **Memory Usage**: < 500MB for 1000 records
- **API Response Time**: < 1 second for cached data

---

## Security Implementation

### Authentication & Authorization

**Spotify API Security:**
```python
# PKCE OAuth2 implementation (2025 compliant)
def generate_pkce_params(self) -> Tuple[str, str]:
    # Cryptographically secure random generation
    self.code_verifier = base64.urlsafe_b64encode(
        secrets.token_bytes(96)
    ).decode('utf-8').rstrip('=')

    # SHA256 challenge generation
    challenge = hashlib.sha256(self.code_verifier.encode()).digest()
    self.code_challenge = base64.urlsafe_b64encode(challenge).decode('utf-8').rstrip('=')
```

**Environment Variable Management:**
```python
# Secure credential handling
def load_credentials():
    load_dotenv()  # Never commit .env files
    return {
        'spotify_client_id': os.getenv('SPOTIFY_CLIENT_ID'),
        'spotify_client_secret': os.getenv('SPOTIFY_CLIENT_SECRET'),
        'google_service_account': os.getenv('GOOGLE_SERVICE_ACCOUNT_PATH')
    }
```

### Data Protection

**PII Handling:**
```python
def anonymize_data(self, df: pd.DataFrame) -> pd.DataFrame:
    # Hash personally identifiable information
    df['name_hash'] = df['name'].apply(lambda x: hashlib.sha256(x.encode()).hexdigest()[:8])
    # Remove original PII for production analytics
    return df.drop(['name'], axis=1)
```

**Rate Limiting Protection:**
```python
def rate_limit_decorator(max_calls: int, window_seconds: int):
    # Prevent API abuse
    # Track requests per IP/session
    # Implement sliding window algorithm
```

---

## Deployment Architecture

### Local Development
```bash
# Development server
streamlit run demo/app.py --server.port 8501

# With live reload
streamlit run demo/app.py --server.fileWatcherType poll
```

### Production Deployment

**Docker Configuration:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Health check
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

# Run application
CMD ["streamlit", "run", "demo/app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spotify-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spotify-dashboard
  template:
    metadata:
      labels:
        app: spotify-dashboard
    spec:
      containers:
      - name: dashboard
        image: spotify-dashboard:latest
        ports:
        - containerPort: 8501
        env:
        - name: SPOTIFY_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: spotify-secrets
              key: client-id
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Error Handling

### Hierarchical Error Management

**Level 1: API Failures**
```python
class APIErrorHandler:
    def handle_spotify_error(self, error: Exception) -> Dict:
        if isinstance(error, spotipy.SpotifyException):
            if error.http_status == 429:  # Rate limit
                return self.apply_exponential_backoff()
            elif error.http_status == 401:  # Auth failure
                return self.refresh_token()
            elif error.http_status == 404:  # Track not found
                return self.use_mock_data()

        # Fallback to cached data
        return self.get_cached_fallback()
```

**Level 2: Data Processing Failures**
```python
def safe_data_processing(self, df: pd.DataFrame) -> pd.DataFrame:
    try:
        return self.enrich_with_spotify_data(df)
    except Exception as e:
        logger.error(f"Data processing failed: {e}")
        # Return original data with mock enrichment
        return self.apply_mock_enrichment(df)
```

**Level 3: UI Error Recovery**
```python
def render_with_fallback(render_func, fallback_message: str):
    try:
        return render_func()
    except Exception as e:
        st.error(f"Rendering failed: {fallback_message}")
        logger.exception("UI rendering error")
        return st.empty()  # Graceful degradation
```

### Error Logging Strategy
```python
import logging
import structlog

# Structured logging for better debugging
logger = structlog.get_logger(__name__)

def log_api_call(endpoint: str, response_time: float, status_code: int):
    logger.info(
        "api_call_completed",
        endpoint=endpoint,
        response_time_ms=response_time * 1000,
        status_code=status_code,
        timestamp=time.time()
    )
```

---

## Testing Strategy

### Test Categories

**1. Unit Tests:**
```python
# tests/test_spotify_client.py
def test_pkce_parameter_generation():
    client = SpotifyPKCEClient()
    verifier, challenge = client.generate_pkce_params()

    assert len(verifier) >= 43  # RFC 7636 requirement
    assert len(challenge) == 43  # Base64 URL-safe encoding
    assert verifier != challenge

def test_audio_features_normalization():
    features = {'danceability': 0.8, 'energy': 0.6, 'valence': 0.9}
    normalized = normalize_audio_features(features)

    for value in normalized.values():
        assert 0 <= value <= 1
```

**2. Integration Tests:**
```python
# tests/test_data_pipeline.py
def test_end_to_end_processing():
    # Mock Google Sheets data
    mock_data = create_mock_response_data()

    # Process through entire pipeline
    enriched_data = process_pipeline(mock_data)

    # Verify enrichment
    assert 'danceability' in enriched_data.columns
    assert 'cluster' in enriched_data.columns
    assert len(enriched_data) == len(mock_data)
```

**3. Performance Tests:**
```python
# tests/test_performance.py
def test_large_dataset_processing():
    large_dataset = generate_test_data(size=1000)

    start_time = time.time()
    result = process_data(large_dataset)
    processing_time = time.time() - start_time

    assert processing_time < 10.0  # Max 10 seconds
    assert len(result) == 1000
```

**4. UI Tests:**
```python
# tests/test_streamlit_app.py
def test_dashboard_rendering():
    from streamlit.testing.v1 import AppTest

    app = AppTest.from_file("demo/app.py")
    app.run()

    assert not app.exception
    assert "Live Feed" in str(app.tabs)
    assert "Music Twin Finder" in str(app.tabs)
```

---

## Monitoring & Logging

### Application Metrics

**Key Performance Indicators:**
```python
# Performance monitoring
METRICS = {
    'api_response_time': 'histogram',
    'cache_hit_rate': 'gauge',
    'active_sessions': 'counter',
    'data_processing_time': 'histogram',
    'error_rate': 'gauge'
}

def track_metric(metric_name: str, value: float, tags: Dict = None):
    # Integration with monitoring systems (Prometheus, DataDog, etc.)
    pass
```

**Health Check Endpoint:**
```python
def health_check() -> Dict:
    return {
        'status': 'healthy',
        'timestamp': time.time(),
        'services': {
            'spotify_api': check_spotify_connection(),
            'google_sheets': check_sheets_connection(),
            'cache': check_cache_availability()
        },
        'version': get_app_version()
    }
```

### Structured Logging
```python
# Centralized logging configuration
LOGGING_CONFIG = {
    'version': 1,
    'formatters': {
        'json': {
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'level': 'INFO'
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/app.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'json'
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console', 'file']
    }
}
```

---

## Development Workflow

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-visualization
git commit -m "feat: add 3D scatter plot for cluster visualization"

# Bug fixes
git checkout -b fix/api-rate-limiting
git commit -m "fix: implement exponential backoff for Spotify API"

# Hot fixes
git checkout -b hotfix/security-patch
git commit -m "security: update dependencies for CVE-2023-XXXX"
```

### Code Quality Gates
```bash
# Pre-commit hooks
pre-commit install

# Code formatting
black src/ demo/ tests/

# Linting
pylint src/ demo/

# Type checking
mypy src/ demo/

# Security scanning
bandit -r src/

# Dependency vulnerability check
safety check
```

### Release Process
```bash
# Version bumping
bump2version patch  # 1.0.0 -> 1.0.1

# Build and test
docker build -t spotify-dashboard:$(git describe --tags) .
docker run --rm spotify-dashboard:$(git describe --tags) pytest

# Deploy to staging
kubectl apply -f k8s/staging/

# Run integration tests
pytest tests/integration/

# Deploy to production (after approval)
kubectl apply -f k8s/production/
```

---

## Appendix

### Configuration Files

**Environment Variables (.env):**
```bash
# Spotify API Configuration
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:8501/callback

# Google Sheets Configuration
GOOGLE_SHEETS_ID=your_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_PATH=path/to/service-account.json

# Application Configuration
DEBUG=false
LOG_LEVEL=INFO
CACHE_TTL_HOURS=24
MAX_CONCURRENT_REQUESTS=10
```

**Streamlit Configuration (.streamlit/config.toml):**
```toml
[theme]
primaryColor = "#FF6B6B"
backgroundColor = "#0E1117"
secondaryBackgroundColor = "#262730"
textColor = "#FAFAFA"
font = "sans serif"

[server]
maxUploadSize = 10
enableCORS = true
enableXsrfProtection = true

[browser]
gatherUsageStats = false
```

### API Rate Limits

**Spotify Web API:**
- **Rate Limit**: 20 requests/second
- **Daily Quota**: 100,000 requests
- **Burst Tolerance**: 100 requests
- **Retry Strategy**: Exponential backoff (max 5 retries)

**Google Sheets API:**
- **Rate Limit**: 60 requests/minute per user
- **Daily Quota**: 25,000 requests
- **Batch Size**: 1000 rows per request

### Dependencies Graph
```
streamlit
├── pandas (data manipulation)
├── numpy (numerical computing)
├── plotly (interactive visualizations)
├── scikit-learn (machine learning)
│   ├── numpy
│   └── scipy
├── spotipy (Spotify API client)
│   └── requests
└── google-api-python-client
    ├── google-auth
    ├── google-auth-oauthlib
    └── google-auth-httplib2
```

---

**Document Version:** 1.0
**Last Reviewed:** September 2025
**Next Review:** December 2025
**Maintainer:** Engineering Team
**Classification:** Internal Use Only