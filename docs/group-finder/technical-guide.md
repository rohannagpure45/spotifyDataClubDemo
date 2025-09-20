# Group Finder - Technical Implementation Guide

## Architecture Overview

The Group Finder feature consists of three main components working together to create and manage music-based groups:

1. **GroupFormationEngine** (`src/models/group_formation.py`) - Core clustering and group optimization
2. **GroupNamer** (`src/utils/group_namer.py`) - Humorous name generation system
3. **Streamlit UI** (`demo/app.py`) - Interactive user interface and session management

## Core Components

### 1. GroupFormationEngine

**Location**: `src/models/group_formation.py`

#### Key Classes and Methods

```python
@dataclass
class Group:
    id: int
    members: List[str]
    compatibility_score: float
    shared_genres: List[str]
    shared_artists: List[str]
    roast_name: str
    group_theme: str
    dominant_characteristics: Dict[str, float]
    member_data: List[Dict] = None

class GroupFormationEngine:
    def __init__(self, min_group_size: int = 3, max_group_size: int = 4, overflow_max: int = 6)
    def create_groups(self, df: pd.DataFrame) -> List[Group]
    def request_group_change(self, member_name: str, target_group_id: int) -> bool
```

#### Algorithm Details

**Similarity Matrix Calculation**
- **Genre Similarity (70% weight)**: Uses Jaccard similarity for genre overlap
- **Artist Similarity (30% weight)**: Exact match = 1.0, partial word match = 0.5
- **Combined Score**: `0.7 * genre_sim + 0.3 * artist_sim`

```python
def _calculate_similarity_matrix(self, df: pd.DataFrame) -> np.ndarray:
    # Creates n×n matrix where n = number of participants
    # Each cell [i,j] contains similarity score between person i and j
    for i in range(n_people):
        for j in range(i, n_people):
            genre_sim = self._calculate_genre_similarity(df.iloc[i], df.iloc[j])
            artist_sim = self._calculate_artist_similarity(df.iloc[i], df.iloc[j])
            total_sim = 0.7 * genre_sim + 0.3 * artist_sim
            similarity_matrix[i][j] = total_sim
            similarity_matrix[j][i] = total_sim  # Symmetric matrix
```

**Constrained Clustering**
- Uses K-means clustering on similarity matrix as feature space
- Automatically determines optimal number of groups: `max(1, n_people // max_group_size)`
- Handles overflow by redistributing small groups into larger ones

```python
def _constrained_clustering(self, similarity_matrix: np.ndarray, n_groups: int, n_people: int):
    # Convert similarity to distance matrix
    distance_matrix = 1 - similarity_matrix

    # Apply K-means clustering
    kmeans = KMeans(n_clusters=n_groups, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(similarity_matrix)
    return cluster_labels.tolist()
```

**Overflow Handling**
- Redistributes members from groups smaller than `min_group_size`
- Finds best merge target based on artist/genre compatibility
- Respects `overflow_max` constraint (default 6 people per group)

### 2. GroupNamer

**Location**: `src/utils/group_namer.py`

#### Name Generation Strategy

The naming system follows a priority hierarchy:

1. **Shared Artists (Highest Priority)** - Groups with common favorite artists
2. **Shared Genres** - Groups unified by musical genres
3. **Energy Patterns** - Based on average audio energy levels
4. **Age Demographics** - Generational music preferences
5. **Mixed Bag (Fallback)** - Generic humorous names

#### Data Structures

```python
self.artist_roasts = {
    'taylor swift': [
        ("Swifties (The Originals)", "Real fans since Fearless era"),
        ("Fake Swifties", "Joined after folklore went viral"),
        # ... more variations
    ],
    'drake': [
        ("Started From the Bottom", "Now we're still here complaining"),
        ("6ix God Disciples", "Toronto is the center of the universe"),
        # ... more variations
    ]
}

self.genre_roasts = {
    'pop': [
        ("Basic Pop Brigade", "Spotify Top 40 is their entire personality"),
        ("Mainstream Machines", "If it's not on the radio, it doesn't exist"),
    ]
}
```

#### Smart Selection Logic

```python
def _select_artist_roast(self, roasts: List[Tuple[str, str]], group: Group):
    # Special case for Taylor Swift - differentiate by age
    if any('swift' in artist.lower() for artist in group.shared_artists):
        avg_age = group.dominant_characteristics.get('avg_age', 20)
        if avg_age >= 23:
            return roasts[0]  # "Swifties (The Originals)"
        else:
            return roasts[1]  # "Fake Swifties"

    # For other artists, select based on energy level
    energy = group.dominant_characteristics.get('avg_energy', 0.5)
    if energy > 0.7:
        return roasts[0]  # High energy gets intense roasts
    else:
        return roasts[-1]  # Lower energy gets gentler roasts
```

### 3. Streamlit Integration

**Location**: `demo/app.py` (lines 230-370)

#### Session State Management

```python
# Group-specific session state variables
if 'current_groups' not in st.session_state:
    st.session_state.current_groups = []
if 'groups_finalized' not in st.session_state:
    st.session_state.groups_finalized = False
if 'group_change_requests' not in st.session_state:
    st.session_state.group_change_requests = []
```

#### Component Initialization

```python
@st.cache_resource
def init_components():
    # ... existing components ...
    group_engine = GroupFormationEngine()
    group_namer = GroupNamer()
    return sheets_client, processor, engineer, clusterer, predictor, visualizer, group_engine, group_namer
```

#### UI State Flow

1. **Check Data Availability** - Minimum 6 people required
2. **Group Formation Button** - Triggers clustering algorithm
3. **Group Display** - Shows cards with names, members, compatibility
4. **Request Management** - Handles group change requests
5. **Finalization** - Locks groups and prevents further changes

## Data Flow

### Input Processing

```
Google Sheets/Mock Data → DataProcessor → Feature Engineering → Group Formation
                                             ↓
Spotify API Enrichment → Audio Features → Similarity Calculation → Clustering
```

### Group Creation Pipeline

```python
# Step 1: Create similarity matrix
similarity_matrix = group_engine._calculate_similarity_matrix(df)

# Step 2: Perform constrained clustering
group_assignments = group_engine._constrained_clustering(similarity_matrix, n_groups, n_people)

# Step 3: Handle overflow and create Group objects
groups = group_engine._create_group_objects(df, group_assignments)

# Step 4: Generate humorous names
groups_with_names = group_namer.generate_group_names(groups)

# Step 5: Store in session state
st.session_state.current_groups = groups_with_names
```

### Request Processing

```python
# Validation pipeline for group change requests
def process_group_request(member_name: str, target_group_id: int):
    # 1. Find current group
    current_group = group_engine.get_group_by_member(member_name)

    # 2. Validate constraints
    if len(current_group.members) <= min_group_size:
        return False  # Would make current group too small

    if len(target_group.members) >= overflow_max:
        return False  # Target group is full

    # 3. Execute transfer
    current_group.members.remove(member_name)
    target_group.members.append(member_name)
    return True
```

## Performance Considerations

### Computational Complexity

- **Similarity Matrix**: O(n²) where n = number of participants
- **K-means Clustering**: O(n × k × i) where k = clusters, i = iterations
- **Name Generation**: O(g) where g = number of groups (linear)

### Optimization Strategies

1. **Caching**: Similarity matrices cached in session state
2. **Lazy Loading**: Group names generated only when displayed
3. **Batch Processing**: All similarity calculations done in vectorized operations
4. **Early Termination**: Stop processing if insufficient data

### Scalability Limits

- **Recommended**: 6-50 participants (optimal user experience)
- **Maximum Tested**: 100 participants (performance may degrade)
- **Memory Usage**: ~O(n²) for similarity matrix storage

## Error Handling

### Graceful Degradation

```python
try:
    groups = group_engine.create_groups(df)
    groups_with_names = group_namer.generate_group_names(groups)
except Exception as e:
    st.error(f"Error creating groups: {e}")
    # Fallback to simple round-robin assignment
    groups = create_simple_groups(df)
```

### Validation Points

1. **Data Validation**: Check for minimum participant count
2. **Genre Parsing**: Handle malformed genre strings gracefully
3. **Artist Matching**: Case-insensitive with special character handling
4. **Group Constraints**: Enforce size limits throughout lifecycle
5. **Request Validation**: Prevent invalid group transfers

## Extension Points

### Adding New Similarity Metrics

```python
def _calculate_custom_similarity(self, person1: pd.Series, person2: pd.Series) -> float:
    # Add new similarity calculation logic
    # Return value between 0.0 and 1.0
    pass

# Integrate into main similarity calculation
total_sim = 0.5 * genre_sim + 0.3 * artist_sim + 0.2 * custom_sim
```

### Custom Name Generation

```python
# Add new roast categories to GroupNamer
self.custom_roasts = {
    'listening_time': [
        ("All Day Listeners", "Music is their full-time job"),
        ("Casual Browsers", "5 minutes of music per week"),
    ]
}

# Implement selection logic in _generate_single_group_name()
```

### UI Customization

```python
# Modify display components in demo/app.py
def render_custom_group_card(group: Group):
    with st.container():
        # Custom styling and layout
        st.markdown(f"### {group.roast_name}")
        # Add custom metrics, visualizations, etc.
```

## Testing Strategy

### Unit Tests

```python
def test_similarity_calculation():
    # Test genre and artist similarity functions
    assert calculate_genre_similarity(person1, person2) == expected_score

def test_group_formation():
    # Test clustering with known data
    groups = engine.create_groups(test_df)
    assert len(groups) == expected_group_count
    assert all(3 <= len(group.members) <= 6 for group in groups)

def test_name_generation():
    # Test roast name selection logic
    names = namer.generate_group_names(test_groups)
    assert all(group.roast_name for group in names)
```

### Integration Tests

```python
def test_full_pipeline():
    # Test complete workflow from data to named groups
    df = load_test_data()
    groups = engine.create_groups(df)
    named_groups = namer.generate_group_names(groups)
    assert len(named_groups) > 0
    assert all(group.roast_name and group.group_theme for group in named_groups)
```

### Mock Data Testing

The system includes comprehensive mock data generation for testing without API dependencies:

```python
# Mock data includes realistic music preferences
mock_data = MockGoogleSheetsClient.generate_sample_data(sample_size=20)
# Covers edge cases: single genres, multiple artists, various demographics
```

## Database Schema

### Session State Structure

```python
st.session_state = {
    'current_groups': [
        Group(
            id=0,
            members=['Alice', 'Bob', 'Charlie'],
            compatibility_score=85.3,
            shared_genres=['pop', 'rock'],
            shared_artists=['taylor swift'],
            roast_name='Swifties (The Originals)',
            group_theme='Real fans since Fearless era',
            dominant_characteristics={
                'avg_energy': 0.72,
                'avg_age': 24.5,
                'avg_valence': 0.68
            }
        )
    ],
    'groups_finalized': False,
    'group_change_requests': [
        {
            'member': 'Dave',
            'target_group': 1,
            'target_group_name': 'Basic Pop Brigade'
        }
    ]
}
```

## Security Considerations

### Input Validation

- **Name Sanitization**: Prevent HTML/script injection in group names
- **Request Validation**: Verify user permissions for group changes
- **Data Bounds**: Limit similarity scores to [0.0, 1.0] range

### Privacy Protection

- **No Personal Data Storage**: Only music preferences and first names
- **Session Isolation**: Groups don't persist across browser sessions
- **Anonymization**: Option to use anonymous identifiers

---

*For setup instructions, see [Setup Guide](setup-guide.md)*
*For usage examples, see [User Guide](user-guide.md)*