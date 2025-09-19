"""
Interactive visualizations for music analysis using Plotly.
"""

import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Any


class LiveVisualizer:
    """Create interactive, updating visualizations."""

    def __init__(self, theme: str = 'plotly_dark'):
        self.theme = theme
        self.colors = px.colors.qualitative.Set3

    def create_cluster_scatter(self, df: pd.DataFrame,
                             highlight_new: List[str] = None) -> go.Figure:
        """3D scatter plot of music clusters."""
        # Ensure required columns exist
        required_cols = ['pca_1', 'pca_2', 'pca_3']
        for i, col in enumerate(required_cols):
            if col not in df.columns:
                df[col] = np.random.randn(len(df)) * 0.5

        if 'cluster' not in df.columns:
            df['cluster'] = np.random.randint(0, 5, len(df))

        fig = px.scatter_3d(
            df,
            x='pca_1', y='pca_2', z='pca_3',
            color='cluster',
            size='popularity' if 'popularity' in df.columns else None,
            hover_data=['name', 'favorite_song', 'major'] if all(c in df.columns for c in ['name', 'favorite_song', 'major']) else None,
            title='Music Taste Clusters - Live View',
            template=self.theme,
            color_continuous_scale='Viridis'
        )

        # Highlight new entries if specified
        if highlight_new and 'name' in df.columns:
            new_df = df[df['name'].isin(highlight_new)]
            if not new_df.empty:
                fig.add_trace(go.Scatter3d(
                    x=new_df['pca_1'],
                    y=new_df['pca_2'],
                    z=new_df['pca_3'],
                    mode='markers',
                    marker=dict(
                        size=15,
                        color='red',
                        symbol='diamond',
                        line=dict(color='white', width=2)
                    ),
                    name='New Entries'
                ))

        fig.update_layout(showlegend=True, height=700)
        return fig

    def create_music_dna_radar(self, user_features: Dict,
                              cluster_avg: Dict) -> go.Figure:
        """Radar chart comparing user to cluster average."""
        categories = list(user_features.keys())[:6]  # Limit to 6 features

        fig = go.Figure()

        fig.add_trace(go.Scatterpolar(
            r=[user_features.get(cat, 0.5) for cat in categories],
            theta=categories,
            fill='toself',
            name='Your Music DNA',
            line_color='cyan'
        ))

        fig.add_trace(go.Scatterpolar(
            r=[cluster_avg.get(cat, 0.5) for cat in categories],
            theta=categories,
            fill='toself',
            name='Cluster Average',
            line_color='orange',
            opacity=0.6
        ))

        fig.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
            showlegend=True,
            title="Your Music DNA vs. Your Cluster",
            template=self.theme
        )

        return fig

    def create_major_heatmap(self, df: pd.DataFrame) -> go.Figure:
        """Heatmap of major vs music preferences."""
        if 'major' not in df.columns or 'genres' not in df.columns:
            # Create mock data
            majors = ['CS', 'Business', 'Engineering', 'Psychology']
            genres = ['Pop', 'Rock', 'Hip-Hop', 'Electronic']
            data = np.random.rand(4, 4)

            fig = go.Figure(data=go.Heatmap(
                z=data,
                x=genres,
                y=majors,
                colorscale='Viridis'
            ))
        else:
            pivot = pd.crosstab(df['major'], df['genres'])
            fig = go.Figure(data=go.Heatmap(
                z=pivot.values,
                x=pivot.columns,
                y=pivot.index,
                colorscale='Viridis'
            ))

        fig.update_layout(
            title="Music Preferences by Major",
            template=self.theme,
            xaxis_title="Genre",
            yaxis_title="Major"
        )

        return fig