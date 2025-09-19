"""
Google Sheets API integration for real-time form data fetching.
"""

import os
import time
import logging
import random
from typing import Optional, List, Dict, Any
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class GoogleSheetsClient:
    """
    Real-time Google Sheets data fetcher with intelligent caching.
    Optimized for live demo scenarios with fallback mechanisms.
    """

    # API rate limiting
    REQUESTS_PER_MINUTE = 60
    CACHE_DURATION_SECONDS = 5  # Short cache for live demo

    def __init__(self, credentials_file: str, sheet_id: str):
        """
        Initialize Google Sheets client.

        Args:
            credentials_file: Path to service account JSON file
            sheet_id: Google Sheet ID from URL
        """
        self.sheet_id = sheet_id
        self.credentials_file = credentials_file

        # Caching
        self.last_fetch: Optional[float] = None
        self.cache_duration = self.CACHE_DURATION_SECONDS
        self.cached_data: Optional[pd.DataFrame] = None
        self.last_row_count = 0

        # Rate limiting
        self.request_times: List[float] = []

        # Initialize service
        self._initialize_service()

    def _initialize_service(self):
        """Initialize Google Sheets API service."""
        try:
            if os.path.exists(self.credentials_file):
                creds = service_account.Credentials.from_service_account_file(
                    self.credentials_file,
                    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
                )
            else:
                logger.warning(f"Credentials file not found: {self.credentials_file}")
                self.service = None
                return

            self.service = build('sheets', 'v4', credentials=creds)
            logger.info("Google Sheets API service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets service: {e}")
            self.service = None

    def _check_rate_limit(self):
        """Enforce rate limiting to avoid API quota issues."""
        current_time = time.time()

        # Remove requests older than 1 minute
        self.request_times = [
            t for t in self.request_times
            if current_time - t < 60
        ]

        # Check if we're at the limit
        if len(self.request_times) >= self.REQUESTS_PER_MINUTE:
            sleep_time = 60 - (current_time - self.request_times[0])
            if sleep_time > 0:
                logger.info(f"Rate limit reached, waiting {sleep_time:.2f} seconds")
                time.sleep(sleep_time)

        self.request_times.append(current_time)

    def fetch_responses(self, force_refresh: bool = False,
                       range_name: str = 'Form Responses 1!A:Z') -> pd.DataFrame:
        """
        Fetch form responses with intelligent caching.

        Args:
            force_refresh: Force fetch new data ignoring cache
            range_name: A1 notation range to fetch

        Returns:
            DataFrame containing form responses
        """
        current_time = time.time()

        # Use cache if valid
        if (not force_refresh and
            self.cached_data is not None and
            self.last_fetch and
            current_time - self.last_fetch < self.cache_duration):
            return self.cached_data

        # Return cached data if service is unavailable
        if not self.service:
            logger.warning("Google Sheets service unavailable, using cached data")
            return self.cached_data if self.cached_data is not None else pd.DataFrame()

        try:
            # Rate limiting
            self._check_rate_limit()

            # Fetch fresh data
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.sheet_id,
                range=range_name
            ).execute()

            values = result.get('values', [])

            if not values:
                logger.info("No data found in sheet")
                return pd.DataFrame()

            # Convert to DataFrame
            headers = values[0] if values else []
            data = values[1:] if len(values) > 1 else []

            # Ensure all rows have the same number of columns
            max_cols = len(headers)
            normalized_data = []
            for row in data:
                normalized_row = row + [''] * (max_cols - len(row))
                normalized_data.append(normalized_row[:max_cols])

            df = pd.DataFrame(normalized_data, columns=headers)

            # Add metadata
            df['fetch_timestamp'] = datetime.now()

            # Clean column names
            df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]

            # Cache the result
            self.cached_data = df
            self.last_fetch = current_time

            # Log new responses
            new_count = len(df) - self.last_row_count
            if new_count > 0:
                logger.info(f"Fetched {new_count} new responses (total: {len(df)})")
                self.last_row_count = len(df)

            return df

        except HttpError as e:
            if e.resp.status == 429:
                logger.error("Google Sheets API quota exceeded")
            else:
                logger.error(f"HTTP error fetching data: {e}")
            return self.cached_data if self.cached_data is not None else pd.DataFrame()

        except Exception as e:
            logger.error(f"Error fetching data: {e}")
            return self.cached_data if self.cached_data is not None else pd.DataFrame()

    def get_new_responses(self, since_timestamp: Optional[datetime] = None) -> pd.DataFrame:
        """
        Get only new responses since last check.

        Args:
            since_timestamp: Get responses after this timestamp

        Returns:
            DataFrame containing only new responses
        """
        df = self.fetch_responses()

        if df.empty:
            return df

        if since_timestamp and 'fetch_timestamp' in df.columns:
            return df[df['fetch_timestamp'] > since_timestamp]

        return df

    def get_response_count(self) -> int:
        """Get current total response count."""
        df = self.fetch_responses()
        return len(df) if not df.empty else 0

    def get_column_stats(self, column: str) -> Dict[str, Any]:
        """
        Get statistics for a specific column.

        Args:
            column: Column name to analyze

        Returns:
            Dictionary with column statistics
        """
        df = self.fetch_responses()

        if df.empty or column not in df.columns:
            return {}

        col_data = df[column].dropna()

        stats = {
            'count': len(col_data),
            'unique': col_data.nunique(),
            'top_values': col_data.value_counts().head(5).to_dict()
        }

        # Add numeric stats if applicable
        try:
            numeric_data = pd.to_numeric(col_data, errors='coerce').dropna()
            if len(numeric_data) > 0:
                stats.update({
                    'mean': numeric_data.mean(),
                    'median': numeric_data.median(),
                    'std': numeric_data.std(),
                    'min': numeric_data.min(),
                    'max': numeric_data.max()
                })
        except:
            pass

        return stats

    def watch_for_changes(self, callback, poll_interval: int = 5):
        """
        Watch sheet for changes and trigger callback.

        Args:
            callback: Function to call when new data arrives
            poll_interval: Seconds between checks
        """
        logger.info(f"Starting to watch sheet for changes (polling every {poll_interval}s)")
        last_count = self.get_response_count()

        try:
            while True:
                time.sleep(poll_interval)
                current_count = self.get_response_count()

                if current_count > last_count:
                    new_rows = current_count - last_count
                    logger.info(f"Detected {new_rows} new responses")
                    callback(self.cached_data.tail(new_rows))
                    last_count = current_count

        except KeyboardInterrupt:
            logger.info("Stopped watching for changes")


class MockGoogleSheetsClient:
    """
    Mock client for testing without Google Sheets access.
    Generates realistic sample data.
    """

    def __init__(self, sample_size: int = 50):
        """Initialize mock client with sample data."""
        self.sample_size = sample_size
        self.cached_data = self._generate_sample_data()
        self.last_row_count = len(self.cached_data)

    def _generate_sample_data(self) -> pd.DataFrame:
        """Generate realistic sample form responses."""
        import random
        from faker import Faker

        fake = Faker()
        random.seed(42)  # Reproducible randomness

        # Sample data pools
        songs = [
            ("Blinding Lights", "The Weeknd"),
            ("Shape of You", "Ed Sheeran"),
            ("Someone Like You", "Adele"),
            ("Bohemian Rhapsody", "Queen"),
            ("Hotel California", "Eagles"),
            ("Starboy", "The Weeknd"),
            ("Perfect", "Ed Sheeran"),
            ("Rolling in the Deep", "Adele"),
            ("Uptown Funk", "Mark Ronson"),
            ("Can't Stop the Feeling!", "Justin Timberlake"),
            ("Thinking Out Loud", "Ed Sheeran"),
            ("Hello", "Adele"),
            ("Shake It Off", "Taylor Swift"),
            ("All of Me", "John Legend"),
            ("Radioactive", "Imagine Dragons"),
            ("Counting Stars", "OneRepublic"),
            ("Sugar", "Maroon 5"),
            ("Cheap Thrills", "Sia"),
            ("Closer", "The Chainsmokers"),
            ("Sorry", "Justin Bieber")
        ]

        majors = [
            "Computer Science", "Business", "Engineering", "Psychology",
            "Biology", "Economics", "Marketing", "Data Science",
            "Physics", "Chemistry", "Mathematics", "English"
        ]

        years = ["Freshman", "Sophomore", "Junior", "Senior"]
        listening_times = ["Morning", "Afternoon", "Evening", "Late Night"]

        # Generate sample data
        data = []
        for i in range(self.sample_size):
            song, artist = random.choice(songs)
            favorite_artist = artist if random.random() > 0.3 else random.choice([a for _, a in songs])

            data.append({
                'timestamp': fake.date_time_between(start_date='-7d', end_date='now'),
                'name': fake.first_name() if random.random() > 0.1 else 'Anonymous',
                'favorite_song': song,
                'artist': artist,
                'favorite_artist': favorite_artist,
                'age': random.randint(18, 25),
                'major': random.choice(majors),
                'year': random.choice(years),
                'hometown': fake.city(),
                'hours_per_day': round(random.uniform(0.5, 8), 1),
                'listening_time': random.choice(listening_times),
                'fetch_timestamp': datetime.now()
            })

        df = pd.DataFrame(data)
        df = df.sort_values('timestamp').reset_index(drop=True)

        return df

    def fetch_responses(self, force_refresh: bool = False,
                       range_name: str = None) -> pd.DataFrame:
        """Return mock sample data."""
        # Simulate gradual data arrival
        if random.random() < 0.3 and len(self.cached_data) < 100:
            new_row = self._generate_sample_data().iloc[0:1]
            new_row['timestamp'] = datetime.now()
            new_row['name'] = f"LiveUser{len(self.cached_data) + 1}"
            self.cached_data = pd.concat([self.cached_data, new_row], ignore_index=True)

        return self.cached_data

    def get_response_count(self) -> int:
        """Get current response count."""
        return len(self.cached_data)

    def get_new_responses(self, since_timestamp: Optional[datetime] = None) -> pd.DataFrame:
        """Get new responses."""
        if since_timestamp:
            return self.cached_data[self.cached_data['timestamp'] > since_timestamp]
        return self.cached_data.tail(5)

    def get_column_stats(self, column: str) -> Dict[str, Any]:
        """Get column statistics."""
        if column not in self.cached_data.columns:
            return {}

        col_data = self.cached_data[column].dropna()
        return {
            'count': len(col_data),
            'unique': col_data.nunique(),
            'top_values': col_data.value_counts().head(5).to_dict()
        }


# Factory function for easy switching between real and mock
def create_sheets_client(use_mock: bool = False,
                        credentials_file: str = 'credentials.json',
                        sheet_id: str = None,
                        sample_size: int = 50):
    """
    Create appropriate Google Sheets client.

    Args:
        use_mock: Use mock client for testing
        credentials_file: Path to credentials
        sheet_id: Google Sheet ID
        sample_size: Sample size for mock data

    Returns:
        GoogleSheetsClient or MockGoogleSheetsClient instance
    """
    if use_mock or not sheet_id or not os.path.exists(credentials_file):
        logger.info("Using mock Google Sheets client with sample data")
        return MockGoogleSheetsClient(sample_size=sample_size)

    logger.info("Using real Google Sheets client")
    return GoogleSheetsClient(credentials_file, sheet_id)