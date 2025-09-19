# 🎵 Spotify Favorites Analysis Project

## Overview
A data science project that analyzes the musical preferences of our community by collecting data on favorite songs and artists, then using the Spotify API to uncover hidden patterns and insights about how music taste correlates with demographics.

## 📊 Data Collection

### Survey Form
We'll collect data through a simple form asking participants:
- **Music Preferences**
  - What's your favorite song?
  - Who's your favorite artist?
  
- **Demographics** 
  - Hometown/Region
  - Age
  - Academic Major
  - Year in School
  - *[Additional questions to be determined]*

## 🔬 Analysis Pipeline

### 1. Data Enrichment
Using the Spotify Web API to enhance our survey data with:
- **Genre Classification** - What genres dominate different groups?
- **Audio Features** - Energy, danceability, valence (mood), acousticness
- **Tempo (BPM)** - Are certain majors drawn to faster/slower songs?
- **Mood Analysis** - Mapping emotional characteristics of favorites

### 2. Visualizations & Insights

#### Clustering Analysis
- Group participants based on musical similarity
- Identify "musical neighborhoods" within our community
- Find your "music twin" - who has the most similar taste to you?

#### Heatmaps
- Major vs. Genre preferences
- Geographic regions vs. Audio features  
- Age groups vs. Song characteristics (energy, mood, tempo)

#### Predictive Classifier
- Build a model that predicts someone's major based on their favorite song
- "Can we guess your hometown from your music taste?"
- Identify which demographic factors most strongly influence musical preferences

## 🎯 Demo Features

### Interactive Dashboard (5 Tabs)
- **🎯 Live Feed** - Real-time response monitoring with celebration animations
- **👥 Music Twin Finder** - AI-powered similarity matching to find your musical soulmate
- **📊 Analysis** - 3D clustering visualizations, heatmaps, and statistical insights
- **🎮 Major Guesser** - Interactive game where AI predicts your major from music taste
- **🏆 Leaderboard** - Music awards (most energetic, happiest songs) and community stats

### Key Features
- **Live visualization** showing how the audience's favorites cluster together
- **Interactive explorer** where people can find others with similar taste
- **"Musical DNA" profiles** for different majors/age groups using PCA analysis
- **Surprising statistics** about our community's listening habits
- **Demo mode** with realistic mock data for presentations without API setup

## 🛠️ Tech Stack
- **Data Collection**: Google Forms / Microsoft Forms
- **API**: Spotify Web API (via Spotipy)
- **Analysis**: Python (pandas, scikit-learn)
- **Visualization**: Plotly/Seaborn for interactive charts
- **Presentation**: Streamlit/Dash for live demo

## 📈 Expected Outcomes
- Discover unexpected connections between demographics and music preferences
- Create a reusable framework for music-based community analysis
- Generate engaging visualizations that make data science accessible to beginners
- Build a "recommended friends" list based on musical compatibility

## 🚀 Why This Project?
This demo showcases core data science concepts (clustering, classification, API integration, data visualization) while using data that's personally relevant to every audience member. When people see insights about their own music taste, the power of data science becomes immediately tangible.

## 🔧 Installation & Setup

### Quick Start
```bash
# Clone the repository
git clone https://github.com/yourusername/spotifyDataClubDemo.git
cd spotifyDataClubDemo

# Run the setup script
./run.sh
```

The app will automatically:
- Create a virtual environment
- Install all dependencies
- Launch at http://localhost:8501

### Manual Installation
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the app
streamlit run demo/app.py
```

### Troubleshooting

**Common Issues & Solutions:**

1. **Missing Google OAuth modules:**
   ```bash
   pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
   ```

2. **Missing faker module:**
   ```bash
   pip install faker
   ```

3. **Import errors (random module):**
   The app automatically handles missing imports. If you encounter module errors, restart the app:
   ```bash
   # Kill any running instances, then restart
   streamlit run demo/app.py --server.headless true
   ```

4. **Dependency version conflicts:**
   ```bash
   # Use latest compatible versions
   pip install streamlit pandas numpy scikit-learn plotly spotipy python-dotenv faker --upgrade
   ```

5. **Performance optimization:**
   ```bash
   # For better file watching performance (optional)
   pip install watchdog
   ```

## 📝 Configuration

### Environment Variables
Create a `.env` file (optional for API access):
```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_PATH=path/to/credentials.json
```

The app runs in **demo mode** by default with mock data, so API credentials are not required for testing.

---
*Perfect for a 5-minute showcase that will leave potential club members excited about what data science can reveal about the world around them!*
