"""
Clustering models for music taste analysis.
"""

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from typing import Optional, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)


class MusicClusterer:
    """K-means clustering for music taste groups."""

    def __init__(self, n_clusters: int = 5, random_state: int = 42):
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.model = KMeans(n_clusters=n_clusters, random_state=random_state)
        self.scaler = StandardScaler()
        self.is_fitted = False

    def fit_predict(self, features: np.ndarray) -> np.ndarray:
        """Fit model and predict clusters."""
        if len(features) < self.n_clusters:
            self.n_clusters = max(1, len(features) // 2)
            self.model = KMeans(n_clusters=self.n_clusters, random_state=self.random_state)

        features_scaled = self.scaler.fit_transform(features)
        clusters = self.model.fit_predict(features_scaled)
        self.is_fitted = True

        logger.info(f"Created {self.n_clusters} clusters with inertia: {self.model.inertia_:.2f}")
        return clusters

    def update_clusters(self, new_features: np.ndarray) -> np.ndarray:
        """Update clusters with new data."""
        if not self.is_fitted:
            return self.fit_predict(new_features)

        features_scaled = self.scaler.transform(new_features)
        return self.model.predict(features_scaled)