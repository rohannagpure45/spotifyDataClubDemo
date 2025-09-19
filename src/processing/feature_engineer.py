"""
Feature engineering for music data analysis.
Creates music DNA profiles and finds similarities.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import PCA
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
from typing import List, Tuple, Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Create meaningful features for ML models from audio characteristics.
    """

    # Key audio features for music DNA
    CORE_FEATURES = [
        'audio_danceability', 'audio_energy', 'audio_valence',
        'audio_acousticness', 'audio_speechiness', 'audio_instrumentalness'
    ]

    EXTENDED_FEATURES = [
        'audio_liveness', 'audio_loudness', 'audio_tempo'
    ]

    def __init__(self, use_extended: bool = True):
        """
        Initialize feature engineer.

        Args:
            use_extended: Whether to use extended features
        """
        self.use_extended = use_extended
        self.scaler = StandardScaler()
        self.normalizer = MinMaxScaler()
        self.pca = None
        self.features = self.CORE_FEATURES + (self.EXTENDED_FEATURES if use_extended else [])
        self.is_fitted = False

    def create_music_dna(self, df: pd.DataFrame, n_components: int = 5) -> np.ndarray:
        """
        Create music DNA profile from audio features using PCA.

        Args:
            df: DataFrame with audio features
            n_components: Number of PCA components

        Returns:
            Array of music DNA vectors
        """
        # Check if required features exist
        missing_features = [f for f in self.features if f not in df.columns]
        if missing_features:
            logger.warning(f"Missing features: {missing_features}. Using available features.")
            available_features = [f for f in self.features if f in df.columns]
            if not available_features:
                logger.error("No audio features available")
                return np.array([])
        else:
            available_features = self.features

        # Extract features
        X = df[available_features].fillna(0).values

        if len(X) == 0:
            return np.array([])

        # Standardize features
        X_scaled = self.scaler.fit_transform(X)
        self.is_fitted = True

        # Apply PCA for dimensionality reduction
        n_components = min(n_components, X_scaled.shape[1], X_scaled.shape[0])
        self.pca = PCA(n_components=n_components)
        X_pca = self.pca.fit_transform(X_scaled)

        logger.info(f"Created music DNA with {n_components} components, "
                   f"explaining {self.pca.explained_variance_ratio_.sum():.2%} of variance")

        return X_pca

    def calculate_similarity_matrix(self, features: np.ndarray,
                                  metric: str = 'cosine') -> np.ndarray:
        """
        Calculate pairwise similarity between users.

        Args:
            features: Music DNA features
            metric: Similarity metric ('cosine' or 'euclidean')

        Returns:
            Similarity matrix
        """
        if len(features) == 0:
            return np.array([])

        if metric == 'cosine':
            # Cosine similarity (1 = identical, 0 = orthogonal)
            similarity = cosine_similarity(features)
        elif metric == 'euclidean':
            # Convert euclidean distance to similarity
            distances = euclidean_distances(features)
            # Normalize to 0-1 range (1 = identical, 0 = very different)
            max_dist = distances.max() if distances.max() > 0 else 1
            similarity = 1 - (distances / max_dist)
        else:
            raise ValueError(f"Unknown metric: {metric}")

        return similarity

    def find_music_twins(self, user_idx: int, similarity_matrix: np.ndarray,
                        top_k: int = 5, min_similarity: float = 0.7) -> List[Tuple[int, float]]:
        """
        Find most similar users (music twins).

        Args:
            user_idx: Index of user to find twins for
            similarity_matrix: Precomputed similarity matrix
            top_k: Number of twins to return
            min_similarity: Minimum similarity threshold

        Returns:
            List of (user_index, similarity_score) tuples
        """
        if user_idx >= len(similarity_matrix):
            return []

        similarities = similarity_matrix[user_idx].copy()

        # Exclude self
        similarities[user_idx] = -1

        # Filter by minimum similarity
        valid_indices = np.where(similarities >= min_similarity)[0]

        if len(valid_indices) == 0:
            # If no one meets threshold, return top matches anyway
            valid_indices = np.arange(len(similarities))
            valid_indices = valid_indices[valid_indices != user_idx]

        # Get top k matches
        valid_similarities = similarities[valid_indices]
        top_indices = valid_indices[np.argsort(valid_similarities)[-top_k:][::-1]]

        return [(idx, similarities[idx]) for idx in top_indices]

    def create_taste_profile(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create a taste profile summary for each user.

        Args:
            df: DataFrame with audio features

        Returns:
            DataFrame with taste profiles
        """
        profiles = pd.DataFrame(index=df.index)

        # Energy level categories
        if 'audio_energy' in df.columns:
            profiles['energy_level'] = pd.cut(
                df['audio_energy'],
                bins=[0, 0.33, 0.66, 1.0],
                labels=['Low', 'Medium', 'High']
            )

        # Mood categories
        if 'audio_valence' in df.columns:
            profiles['mood'] = pd.cut(
                df['audio_valence'],
                bins=[0, 0.33, 0.66, 1.0],
                labels=['Melancholic', 'Neutral', 'Happy']
            )

        # Music style
        if 'audio_acousticness' in df.columns and 'audio_instrumentalness' in df.columns:
            acoustic = df['audio_acousticness'] > 0.5
            instrumental = df['audio_instrumentalness'] > 0.3

            profiles['style'] = 'Mainstream'
            profiles.loc[acoustic, 'style'] = 'Acoustic'
            profiles.loc[instrumental, 'style'] = 'Instrumental'
            profiles.loc[acoustic & instrumental, 'style'] = 'Acoustic Instrumental'

        # Danceability category
        if 'audio_danceability' in df.columns:
            profiles['vibe'] = pd.cut(
                df['audio_danceability'],
                bins=[0, 0.5, 0.7, 1.0],
                labels=['Chill', 'Groovy', 'Party']
            )

        return profiles

    def get_feature_importance(self) -> pd.DataFrame:
        """
        Get feature importance from PCA components.

        Returns:
            DataFrame with feature importance scores
        """
        if not self.pca:
            return pd.DataFrame()

        # Get absolute loadings
        loadings = np.abs(self.pca.components_)

        # Calculate importance as sum of absolute loadings weighted by explained variance
        importance = np.sum(
            loadings * self.pca.explained_variance_ratio_[:, np.newaxis],
            axis=0
        )

        # Get feature names
        feature_names = [f for f in self.features if f in self.CORE_FEATURES + self.EXTENDED_FEATURES]
        if len(feature_names) != len(importance):
            feature_names = [f"feature_{i}" for i in range(len(importance))]

        return pd.DataFrame({
            'feature': feature_names[:len(importance)],
            'importance': importance,
            'importance_pct': importance / importance.sum() * 100
        }).sort_values('importance', ascending=False)

    def create_cluster_profiles(self, df: pd.DataFrame, clusters: np.ndarray) -> pd.DataFrame:
        """
        Create profiles for each cluster.

        Args:
            df: DataFrame with audio features
            clusters: Cluster assignments

        Returns:
            DataFrame with cluster profiles
        """
        df['cluster'] = clusters
        cluster_profiles = []

        for cluster_id in np.unique(clusters):
            cluster_data = df[df['cluster'] == cluster_id]

            profile = {
                'cluster_id': cluster_id,
                'size': len(cluster_data),
                'size_pct': len(cluster_data) / len(df) * 100
            }

            # Add mean values for each audio feature
            for feature in self.features:
                if feature in cluster_data.columns:
                    profile[f"{feature}_mean"] = cluster_data[feature].mean()
                    profile[f"{feature}_std"] = cluster_data[feature].std()

            # Add most common major if available
            if 'major' in cluster_data.columns:
                profile['top_major'] = cluster_data['major'].mode().iloc[0] if not cluster_data['major'].mode().empty else 'Unknown'
                profile['top_major_pct'] = (cluster_data['major'] == profile['top_major']).mean() * 100

            cluster_profiles.append(profile)

        return pd.DataFrame(cluster_profiles)

    def calculate_diversity_score(self, features: np.ndarray) -> float:
        """
        Calculate diversity score for a set of music preferences.

        Args:
            features: Music DNA features

        Returns:
            Diversity score (0-1, higher = more diverse)
        """
        if len(features) < 2:
            return 0.0

        # Calculate pairwise distances
        distances = euclidean_distances(features)

        # Get mean distance (excluding diagonal)
        n = len(features)
        mean_distance = (distances.sum() - np.diag(distances).sum()) / (n * (n - 1))

        # Normalize to 0-1 range
        max_possible_distance = np.sqrt(features.shape[1])  # Theoretical max
        diversity_score = min(mean_distance / max_possible_distance, 1.0)

        return diversity_score