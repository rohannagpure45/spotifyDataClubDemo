"""
Major prediction classifier based on music preferences.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import LabelEncoder
import logging

logger = logging.getLogger(__name__)


class MajorPredictor:
    """Random Forest classifier for predicting major from music taste."""

    def __init__(self, random_state: int = 42):
        self.model = RandomForestClassifier(n_estimators=100, random_state=random_state)
        self.label_encoder = LabelEncoder()
        self.is_fitted = False
        self.classes_ = None

    def fit(self, features: np.ndarray, labels: pd.Series):
        """Train the classifier."""
        if len(np.unique(labels)) < 2:
            logger.warning("Not enough classes to train classifier")
            return self

        encoded_labels = self.label_encoder.fit_transform(labels)
        self.model.fit(features, encoded_labels)
        self.classes_ = self.label_encoder.classes_
        self.is_fitted = True

        # Calculate cross-validation score
        scores = cross_val_score(self.model, features, encoded_labels, cv=3)
        logger.info(f"Classifier trained with accuracy: {scores.mean():.2%}")

        return self

    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        """Predict probabilities for each major."""
        if not self.is_fitted:
            # Return uniform probabilities if not fitted
            n_samples = len(features) if hasattr(features, '__len__') else 1
            return np.ones((n_samples, 1)) / 1

        return self.model.predict_proba(features)