"""
Data processor for enriching form responses with Spotify data.
Includes caching, batch processing, and error recovery.
"""

import os
import json
import hashlib
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from functools import lru_cache
import pickle
from pathlib import Path

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Manages caching of API responses to minimize API calls.
    Uses both in-memory and disk caching.
    """

    def __init__(self, cache_dir: str = "data/cache"):
        """Initialize cache manager."""
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.memory_cache: Dict[str, Any] = {}
        self.cache_ttl = timedelta(hours=24)  # Cache for 24 hours

    def _get_cache_key(self, data_type: str, identifier: str) -> str:
        """Generate cache key."""
        return f"{data_type}:{identifier}"

    def _get_file_path(self, cache_key: str) -> Path:
        """Get file path for cache key."""
        # Hash the key to create a valid filename
        key_hash = hashlib.md5(cache_key.encode()).hexdigest()
        return self.cache_dir / f"{key_hash}.pkl"

    def get(self, data_type: str, identifier: str) -> Optional[Any]:
        """
        Get cached data if available and not expired.

        Args:
            data_type: Type of data (e.g., 'audio_features', 'track')
            identifier: Unique identifier (e.g., track ID)

        Returns:
            Cached data or None
        """
        cache_key = self._get_cache_key(data_type, identifier)

        # Check memory cache first
        if cache_key in self.memory_cache:
            data, timestamp = self.memory_cache[cache_key]
            if datetime.now() - timestamp < self.cache_ttl:
                return data

        # Check disk cache
        file_path = self._get_file_path(cache_key)
        if file_path.exists():
            try:
                with open(file_path, 'rb') as f:
                    data, timestamp = pickle.load(f)
                    if datetime.now() - timestamp < self.cache_ttl:
                        # Update memory cache
                        self.memory_cache[cache_key] = (data, timestamp)
                        return data
            except Exception as e:
                logger.warning(f"Failed to load cache from {file_path}: {e}")

        return None

    def set(self, data_type: str, identifier: str, data: Any):
        """
        Cache data.

        Args:
            data_type: Type of data
            identifier: Unique identifier
            data: Data to cache
        """
        cache_key = self._get_cache_key(data_type, identifier)
        timestamp = datetime.now()

        # Update memory cache
        self.memory_cache[cache_key] = (data, timestamp)

        # Save to disk
        file_path = self._get_file_path(cache_key)
        try:
            with open(file_path, 'wb') as f:
                pickle.dump((data, timestamp), f)
        except Exception as e:
            logger.warning(f"Failed to save cache to {file_path}: {e}")

    def clear_expired(self):
        """Clear expired cache entries."""
        # Clear memory cache
        current_time = datetime.now()
        expired_keys = [
            key for key, (_, timestamp) in self.memory_cache.items()
            if current_time - timestamp >= self.cache_ttl
        ]
        for key in expired_keys:
            del self.memory_cache[key]

        # Clear disk cache
        for file_path in self.cache_dir.glob("*.pkl"):
            try:
                with open(file_path, 'rb') as f:
                    _, timestamp = pickle.load(f)
                    if current_time - timestamp >= self.cache_ttl:
                        file_path.unlink()
            except:
                # Remove corrupted cache files
                file_path.unlink()


class DataProcessor:
    """
    Processes form responses by enriching them with Spotify data.
    Handles batch processing, caching, and error recovery.
    """

    def __init__(self, spotify_client=None, cache_manager: Optional[CacheManager] = None):
        """
        Initialize data processor.

        Args:
            spotify_client: Spotify API client instance
            cache_manager: Cache manager instance
        """
        self.spotify = spotify_client
        self.cache = cache_manager or CacheManager()
        self.processed_count = 0
        self.error_count = 0

    def process_response(self, response: pd.Series) -> pd.Series:
        """
        Process a single form response.

        Args:
            response: Single row from form responses

        Returns:
            Enriched response with Spotify data
        """
        try:
            # Extract relevant fields
            song = response.get('favorite_song', '')
            artist = response.get('artist', '')

            if not song or not artist:
                logger.warning(f"Missing song or artist in response")
                return response

            # Check cache first
            cache_key = f"{song}:{artist}"
            cached_data = self.cache.get('enriched', cache_key)

            if cached_data:
                logger.debug(f"Using cached data for {song} by {artist}")
                # Update response with cached data
                for key, value in cached_data.items():
                    response[key] = value
                return response

            # If Spotify client is not available, return with mock data
            if not self.spotify or not hasattr(self.spotify, 'access_token'):
                logger.info("Using mock enrichment (no Spotify client)")
                return self._mock_enrichment(response)

            # Search for track on Spotify
            query = f"track:{song} artist:{artist}"
            track = self.spotify.search_track(query)

            if not track:
                # Try broader search
                query = f"{song} {artist}"
                track = self.spotify.search_track(query)

            if track:
                # Get audio features
                track_id = track['id']
                audio_features = self.spotify.get_audio_features(track_id)

                # Get artist info
                artist_id = track['artists'][0]['id']
                artist_info = self.spotify.get_artist(artist_id)

                # Enrich response
                enrichment = {
                    'track_id': track_id,
                    'track_name': track['name'],
                    'artist_name': track['artists'][0]['name'],
                    'popularity': track.get('popularity', 0),
                    'genres': ','.join(artist_info.get('genres', []) if artist_info else [])
                }

                # Add audio features
                if audio_features:
                    enrichment.update({
                        'audio_danceability': audio_features.danceability,
                        'audio_energy': audio_features.energy,
                        'audio_valence': audio_features.valence,
                        'audio_acousticness': audio_features.acousticness,
                        'audio_speechiness': audio_features.speechiness,
                        'audio_instrumentalness': audio_features.instrumentalness,
                        'audio_liveness': audio_features.liveness,
                        'audio_loudness': audio_features.loudness,
                        'audio_tempo': audio_features.tempo,
                        'audio_key': audio_features.key,
                        'audio_mode': audio_features.mode,
                        'audio_duration_ms': audio_features.duration_ms
                    })

                # Cache the enrichment
                self.cache.set('enriched', cache_key, enrichment)

                # Update response
                for key, value in enrichment.items():
                    response[key] = value

                self.processed_count += 1
                logger.info(f"Enriched: {song} by {artist}")

            else:
                logger.warning(f"Track not found: {song} by {artist}")
                self.error_count += 1

        except Exception as e:
            logger.error(f"Error processing response: {e}")
            self.error_count += 1

        return response

    def process_batch(self, df: pd.DataFrame, parallel: bool = False) -> pd.DataFrame:
        """
        Process multiple form responses.

        Args:
            df: DataFrame of form responses
            parallel: Whether to process in parallel (requires Spotify batch API)

        Returns:
            Enriched DataFrame
        """
        if df.empty:
            return df

        logger.info(f"Processing batch of {len(df)} responses")

        # Apply enrichment to each row
        enriched_df = df.apply(self.process_response, axis=1)

        # Add processing metadata
        enriched_df['processed_at'] = datetime.now()
        enriched_df['processor_version'] = '1.0.0'

        logger.info(f"Batch processing complete. Processed: {self.processed_count}, Errors: {self.error_count}")

        return enriched_df

    def _mock_enrichment(self, response: pd.Series) -> pd.Series:
        """
        Add mock Spotify data for testing without API.

        Args:
            response: Form response

        Returns:
            Response with mock enrichment
        """
        import random

        # Generate realistic mock audio features
        response['track_id'] = f"mock_{hashlib.md5(response.get('favorite_song', '').encode()).hexdigest()[:22]}"
        response['popularity'] = random.randint(20, 100)
        response['genres'] = random.choice(['pop', 'rock', 'hip-hop', 'electronic', 'indie'])

        # Mock audio features (realistic ranges)
        response['audio_danceability'] = random.uniform(0.3, 0.9)
        response['audio_energy'] = random.uniform(0.2, 1.0)
        response['audio_valence'] = random.uniform(0.1, 0.95)
        response['audio_acousticness'] = random.uniform(0.0, 0.8)
        response['audio_speechiness'] = random.uniform(0.02, 0.3)
        response['audio_instrumentalness'] = random.uniform(0.0, 0.5)
        response['audio_liveness'] = random.uniform(0.05, 0.4)
        response['audio_loudness'] = random.uniform(-20, 0)
        response['audio_tempo'] = random.uniform(60, 180)
        response['audio_key'] = random.randint(0, 11)
        response['audio_mode'] = random.randint(0, 1)
        response['audio_duration_ms'] = random.randint(150000, 300000)

        return response

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get processing statistics.

        Returns:
            Dictionary with processing stats
        """
        return {
            'processed_count': self.processed_count,
            'error_count': self.error_count,
            'success_rate': self.processed_count / (self.processed_count + self.error_count)
            if (self.processed_count + self.error_count) > 0 else 0,
            'cache_size': len(self.cache.memory_cache)
        }


class DataAggregator:
    """
    Aggregates and analyzes processed data for insights.
    """

    def __init__(self, df: pd.DataFrame):
        """Initialize with processed DataFrame."""
        self.df = df

    def get_genre_distribution(self) -> pd.Series:
        """Get distribution of genres."""
        if 'genres' not in self.df.columns:
            return pd.Series()

        # Split comma-separated genres and count
        all_genres = []
        for genres in self.df['genres'].dropna():
            if isinstance(genres, str):
                all_genres.extend(genres.split(','))

        return pd.Series(all_genres).value_counts()

    def get_audio_feature_stats(self) -> pd.DataFrame:
        """Get statistics for audio features."""
        audio_cols = [col for col in self.df.columns if col.startswith('audio_')]

        if not audio_cols:
            return pd.DataFrame()

        return self.df[audio_cols].describe()

    def get_major_preferences(self) -> pd.DataFrame:
        """Analyze preferences by major."""
        if 'major' not in self.df.columns:
            return pd.DataFrame()

        # Group by major and calculate mean audio features
        audio_cols = [col for col in self.df.columns if col.startswith('audio_')]

        if audio_cols:
            return self.df.groupby('major')[audio_cols].mean()

        return pd.DataFrame()

    def find_outliers(self, feature: str, threshold: float = 3) -> pd.DataFrame:
        """
        Find outliers based on z-score.

        Args:
            feature: Feature column to analyze
            threshold: Z-score threshold for outliers

        Returns:
            DataFrame of outliers
        """
        if feature not in self.df.columns:
            return pd.DataFrame()

        # Calculate z-scores
        z_scores = np.abs((self.df[feature] - self.df[feature].mean()) / self.df[feature].std())

        return self.df[z_scores > threshold]

    def get_correlation_matrix(self) -> pd.DataFrame:
        """Get correlation matrix of audio features."""
        audio_cols = [col for col in self.df.columns if col.startswith('audio_')]

        if len(audio_cols) < 2:
            return pd.DataFrame()

        return self.df[audio_cols].corr()