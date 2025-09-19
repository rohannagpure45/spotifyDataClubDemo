"""
Spotify API client with PKCE authentication flow.
Implements 2025 security requirements for public clients.
"""

import hashlib
import base64
import secrets
import time
from urllib.parse import urlencode, parse_qs, urlparse
from typing import Dict, Optional, Tuple, List, Any
import requests
import logging
from dataclasses import dataclass
from functools import lru_cache

logger = logging.getLogger(__name__)


@dataclass
class AudioFeatures:
    """Structured audio features from Spotify API."""
    danceability: float
    energy: float
    key: int
    loudness: float
    mode: int
    speechiness: float
    acousticness: float
    instrumentalness: float
    liveness: float
    valence: float
    tempo: float
    duration_ms: int
    time_signature: int
    track_id: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AudioFeatures':
        """Create AudioFeatures from API response."""
        return cls(
            danceability=data.get('danceability', 0.0),
            energy=data.get('energy', 0.0),
            key=data.get('key', 0),
            loudness=data.get('loudness', 0.0),
            mode=data.get('mode', 0),
            speechiness=data.get('speechiness', 0.0),
            acousticness=data.get('acousticness', 0.0),
            instrumentalness=data.get('instrumentalness', 0.0),
            liveness=data.get('liveness', 0.0),
            valence=data.get('valence', 0.0),
            tempo=data.get('tempo', 0.0),
            duration_ms=data.get('duration_ms', 0),
            time_signature=data.get('time_signature', 4),
            track_id=data.get('id', '')
        )


class SpotifyPKCEClient:
    """
    Spotify client using PKCE (Proof Key for Code Exchange) flow.
    Compliant with 2025 security requirements.
    """

    BASE_AUTH_URL = "https://accounts.spotify.com/authorize"
    TOKEN_URL = "https://accounts.spotify.com/api/token"
    API_BASE_URL = "https://api.spotify.com/v1"

    # Rate limiting
    MAX_REQUESTS_PER_SECOND = 20
    RATE_LIMIT_WINDOW = 30  # seconds

    def __init__(self, client_id: str, redirect_uri: str):
        """
        Initialize Spotify PKCE client.

        Args:
            client_id: Spotify app client ID
            redirect_uri: Redirect URI (must use HTTPS except for localhost)
        """
        self.client_id = client_id
        self.redirect_uri = redirect_uri
        self.code_verifier: Optional[str] = None
        self.code_challenge: Optional[str] = None
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expiry: Optional[float] = None

        # Rate limiting
        self.request_times: List[float] = []

        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })

    def generate_pkce_params(self) -> Tuple[str, str]:
        """
        Generate PKCE code verifier and challenge.

        Returns:
            Tuple of (code_verifier, code_challenge)
        """
        # Generate code verifier (43-128 characters)
        self.code_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(96)
        ).decode('utf-8').rstrip('=')

        # Generate code challenge using SHA256
        challenge = hashlib.sha256(
            self.code_verifier.encode('utf-8')
        ).digest()
        self.code_challenge = base64.urlsafe_b64encode(
            challenge
        ).decode('utf-8').rstrip('=')

        logger.debug(f"Generated PKCE params - verifier length: {len(self.code_verifier)}")

        return self.code_verifier, self.code_challenge

    def get_authorization_url(self, scope: str = "user-read-private user-top-read",
                            state: Optional[str] = None) -> str:
        """
        Build authorization URL with PKCE parameters.

        Args:
            scope: Space-separated list of Spotify scopes
            state: Optional state parameter for CSRF protection

        Returns:
            Authorization URL
        """
        self.generate_pkce_params()

        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'redirect_uri': self.redirect_uri,
            'scope': scope,
            'code_challenge_method': 'S256',
            'code_challenge': self.code_challenge
        }

        if state:
            params['state'] = state

        auth_url = f"{self.BASE_AUTH_URL}?{urlencode(params)}"
        logger.info("Generated authorization URL with PKCE")

        return auth_url

    def exchange_code_for_token(self, authorization_code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token using PKCE.

        Args:
            authorization_code: Code received from authorization callback

        Returns:
            Token response containing access_token and refresh_token
        """
        if not self.code_verifier:
            raise ValueError("Code verifier not found. Call get_authorization_url first.")

        data = {
            'grant_type': 'authorization_code',
            'code': authorization_code,
            'redirect_uri': self.redirect_uri,
            'client_id': self.client_id,
            'code_verifier': self.code_verifier
        }

        response = requests.post(self.TOKEN_URL, data=data)
        response.raise_for_status()

        token_data = response.json()

        # Store tokens
        self.access_token = token_data['access_token']
        self.refresh_token = token_data.get('refresh_token')
        self.token_expiry = time.time() + token_data.get('expires_in', 3600)

        # Update session headers
        self.session.headers['Authorization'] = f"Bearer {self.access_token}"

        logger.info("Successfully exchanged code for access token")

        return token_data

    def refresh_access_token(self) -> Dict[str, Any]:
        """
        Refresh the access token using refresh token.

        Returns:
            New token data
        """
        if not self.refresh_token:
            raise ValueError("No refresh token available")

        data = {
            'grant_type': 'refresh_token',
            'refresh_token': self.refresh_token,
            'client_id': self.client_id
        }

        response = requests.post(self.TOKEN_URL, data=data)
        response.raise_for_status()

        token_data = response.json()

        # Update tokens
        self.access_token = token_data['access_token']
        if 'refresh_token' in token_data:
            self.refresh_token = token_data['refresh_token']
        self.token_expiry = time.time() + token_data.get('expires_in', 3600)

        # Update session headers
        self.session.headers['Authorization'] = f"Bearer {self.access_token}"

        logger.info("Successfully refreshed access token")

        return token_data

    def _check_rate_limit(self):
        """Check and enforce rate limiting."""
        current_time = time.time()

        # Remove old requests outside the window
        self.request_times = [
            t for t in self.request_times
            if current_time - t < self.RATE_LIMIT_WINDOW
        ]

        # Check if we're at the limit
        if len(self.request_times) >= self.MAX_REQUESTS_PER_SECOND * self.RATE_LIMIT_WINDOW / 30:
            sleep_time = self.RATE_LIMIT_WINDOW - (current_time - self.request_times[0])
            if sleep_time > 0:
                logger.warning(f"Rate limit reached, sleeping for {sleep_time:.2f} seconds")
                time.sleep(sleep_time)

        self.request_times.append(current_time)

    def _ensure_token_valid(self):
        """Ensure access token is valid, refresh if needed."""
        if not self.access_token:
            raise ValueError("No access token available. Please authorize first.")

        if self.token_expiry and time.time() >= self.token_expiry - 60:
            logger.info("Access token expired or expiring soon, refreshing...")
            self.refresh_access_token()

    def _api_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make an authenticated API request with rate limiting and retries.

        Args:
            method: HTTP method
            endpoint: API endpoint (relative to base URL)
            **kwargs: Additional request parameters

        Returns:
            JSON response
        """
        self._ensure_token_valid()
        self._check_rate_limit()

        url = f"{self.API_BASE_URL}/{endpoint}"

        # Retry logic with exponential backoff
        max_retries = 3
        retry_delay = 1

        for attempt in range(max_retries):
            try:
                response = self.session.request(method, url, **kwargs)

                if response.status_code == 429:  # Rate limited
                    retry_after = int(response.headers.get('Retry-After', retry_delay))
                    logger.warning(f"Rate limited, retrying after {retry_after} seconds")
                    time.sleep(retry_after)
                    continue

                response.raise_for_status()
                return response.json()

            except requests.exceptions.RequestException as e:
                if attempt == max_retries - 1:
                    logger.error(f"API request failed after {max_retries} attempts: {e}")
                    raise

                logger.warning(f"API request failed (attempt {attempt + 1}), retrying...")
                time.sleep(retry_delay)
                retry_delay *= 2

        return {}

    @lru_cache(maxsize=1000)
    def search_track(self, query: str, limit: int = 1) -> Optional[Dict[str, Any]]:
        """
        Search for tracks on Spotify.

        Args:
            query: Search query (e.g., "track:Song artist:Artist")
            limit: Number of results to return

        Returns:
            Search results or None if not found
        """
        params = {
            'q': query,
            'type': 'track',
            'limit': limit
        }

        try:
            results = self._api_request('GET', 'search', params=params)
            tracks = results.get('tracks', {}).get('items', [])
            return tracks[0] if tracks else None
        except Exception as e:
            logger.error(f"Search failed for query '{query}': {e}")
            return None

    def get_audio_features(self, track_id: str) -> Optional[AudioFeatures]:
        """
        Get audio features for a track.

        Args:
            track_id: Spotify track ID

        Returns:
            AudioFeatures object or None if not found
        """
        try:
            features = self._api_request('GET', f'audio-features/{track_id}')
            return AudioFeatures.from_dict(features) if features else None
        except Exception as e:
            logger.error(f"Failed to get audio features for track {track_id}: {e}")
            return None

    def get_audio_features_batch(self, track_ids: List[str]) -> List[Optional[AudioFeatures]]:
        """
        Get audio features for multiple tracks (more efficient).

        Args:
            track_ids: List of Spotify track IDs (max 100)

        Returns:
            List of AudioFeatures objects
        """
        if not track_ids:
            return []

        # Spotify API limits to 100 IDs per request
        batch_size = 100
        all_features = []

        for i in range(0, len(track_ids), batch_size):
            batch = track_ids[i:i + batch_size]
            params = {'ids': ','.join(batch)}

            try:
                response = self._api_request('GET', 'audio-features', params=params)
                features_list = response.get('audio_features', [])

                for features in features_list:
                    if features:
                        all_features.append(AudioFeatures.from_dict(features))
                    else:
                        all_features.append(None)

            except Exception as e:
                logger.error(f"Failed to get batch audio features: {e}")
                all_features.extend([None] * len(batch))

        return all_features

    def get_artist(self, artist_id: str) -> Optional[Dict[str, Any]]:
        """
        Get artist information including genres.

        Args:
            artist_id: Spotify artist ID

        Returns:
            Artist data or None if not found
        """
        try:
            return self._api_request('GET', f'artists/{artist_id}')
        except Exception as e:
            logger.error(f"Failed to get artist {artist_id}: {e}")
            return None

    def get_track(self, track_id: str) -> Optional[Dict[str, Any]]:
        """
        Get track information.

        Args:
            track_id: Spotify track ID

        Returns:
            Track data or None if not found
        """
        try:
            return self._api_request('GET', f'tracks/{track_id}')
        except Exception as e:
            logger.error(f"Failed to get track {track_id}: {e}")
            return None

    def get_recommendations(self, seed_tracks: List[str] = None,
                          seed_artists: List[str] = None,
                          **kwargs) -> List[Dict[str, Any]]:
        """
        Get track recommendations based on seeds.

        Args:
            seed_tracks: List of track IDs (max 5 total seeds)
            seed_artists: List of artist IDs (max 5 total seeds)
            **kwargs: Additional parameters (target_energy, target_valence, etc.)

        Returns:
            List of recommended tracks
        """
        params = {}

        if seed_tracks:
            params['seed_tracks'] = ','.join(seed_tracks[:5])
        if seed_artists:
            params['seed_artists'] = ','.join(seed_artists[:5])

        # Add target parameters
        for key, value in kwargs.items():
            if key.startswith('target_') or key.startswith('min_') or key.startswith('max_'):
                params[key] = value

        try:
            response = self._api_request('GET', 'recommendations', params=params)
            return response.get('tracks', [])
        except Exception as e:
            logger.error(f"Failed to get recommendations: {e}")
            return []