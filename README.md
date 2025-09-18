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

## 🎯 Demo Highlights
- **Live visualization** showing how the audience's favorites cluster together
- **Interactive explorer** where people can find others with similar taste
- **"Musical DNA" profiles** for different majors/age groups
- **Surprising statistics** about our community's listening habits

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

---
*Perfect for a 5-minute showcase that will leave potential club members excited about what data science can reveal about the world around them!*
