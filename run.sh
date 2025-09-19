#!/bin/bash

echo "🎵 Starting Spotify Favorites Analysis Dashboard..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Check if requirements are installed
if ! python -c "import streamlit" 2>/dev/null; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
fi

# Create necessary directories
mkdir -p data/cache data/raw data/processed data/backups

echo "🚀 Launching application..."
echo "📱 Open http://localhost:8501 in your browser"
echo ""
echo "Press Ctrl+C to stop the server"

# Run the app
streamlit run demo/app.py