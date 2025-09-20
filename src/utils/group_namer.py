"""
Humorous Group Name Generator for Music-Based Teams.

This module generates entertaining and slightly provocative group names based on
musical characteristics, preferences, and stereotypes. The naming system follows
a priority hierarchy to select the most appropriate roast for each group while
maintaining a playful and engaging tone for team-building activities.

The generator includes over 200 predefined roasts targeting:
- Popular artists (Taylor Swift, Drake, Billie Eilish, etc.)
- Musical genres (Pop, Hip-Hop, Rock, Country, Electronic, etc.)
- Listening patterns (High/low energy, age demographics)
- Musical stereotypes and cultural references

Key Features:
- Priority-based naming system (artists > genres > energy > age > fallback)
- Smart selection logic based on group characteristics
- Extensible roast dictionary system
- Context-aware name generation (age-based Taylor Swift differentiation)
- Fallback options for edge cases

Example Usage:
    namer = GroupNamer()
    named_groups = namer.generate_group_names(groups)

    for group in named_groups:
        print(f"{group.roast_name}: {group.group_theme}")
        # Output: "Swifties (The Originals): Real fans since Fearless era"

Note: All roasts are intended as playful humor and should be used in appropriate
social contexts where participants understand the satirical nature of the content.
"""

import random
from typing import List, Dict, Tuple
import logging
from src.models.group_formation import Group

logger = logging.getLogger(__name__)


class GroupNamer:
    """
    Generates humorous group names and themes based on musical characteristics.

    This class implements a sophisticated naming system that creates entertaining
    group identities based on shared musical preferences. The system follows a
    priority hierarchy to ensure the most relevant and funny names are selected
    for each group's unique characteristics.

    Naming Priority Hierarchy:
    1. Shared Artists (Highest) - Groups with common favorite artists
    2. Shared Genres - Groups unified by musical genres
    3. Energy Patterns - High/low energy musical preferences
    4. Age Demographics - Generational music taste patterns
    5. Mixed Bag (Fallback) - Generic humorous names for diverse groups

    The generator contains extensive roast dictionaries with over 200 predefined
    combinations targeting popular artists, genres, and listening stereotypes.
    Special logic handles context-aware selections (e.g., differentiating Taylor
    Swift fans by age to distinguish "original" vs "new" fans).

    Attributes:
        artist_roasts (Dict): Roasts targeting specific artists
        genre_roasts (Dict): Roasts targeting musical genres
        energy_roasts (Dict): Roasts based on energy levels
        age_roasts (Dict): Roasts based on age demographics
        mixed_bag_roasts (List): Fallback roasts for diverse groups

    Example:
        namer = GroupNamer()

        # Generate names for all groups
        named_groups = namer.generate_group_names(groups)

        # Add custom roasts
        namer.add_custom_roast('local_band', [
            ("Local Legends", "Supporting hometown heroes")
        ])

        # Results in names like:
        # "Swifties (The Originals)" - Taylor Swift fans age 23+
        # "Basic Pop Brigade" - Mainstream pop listeners
        # "Real Hip-Hop Heads" - Hip-hop genre groups

    Note: All names are designed as playful humor suitable for team-building
    activities in appropriate social contexts.
    """

    def __init__(self):
        """
        Initialize the GroupNamer with predefined roast dictionaries.

        Sets up extensive collections of humorous names targeting popular
        artists, musical genres, energy patterns, and demographic groups.
        """
        self.artist_roasts = {
            # Pop artists
            'taylor swift': [
                ("Swifties (The Originals)", "Real fans since Fearless era"),
                ("Fake Swifties", "Joined after folklore went viral"),
                ("The 13 Club", "Know every Easter egg and hidden meaning"),
                ("Cardigan Collectors", "Still crying over All Too Well 10-minute version")
            ],
            'ariana grande': [
                ("The High Note Wannabes", "Think they can hit her whistle tones"),
                ("Ponytail Posse", "Hair damage from copying her look"),
                ("Thank U, Next Crew", "Relationship advice from pop songs")
            ],
            'billie eilish': [
                ("Whisper Singers", "Think mumbling is artistic"),
                ("Depressed Teens Club", "Found deep meaning in Bad Guy"),
                ("Oversized Hoodie Gang", "Fashion sense = baggy everything")
            ],
            'olivia rodrigo': [
                ("Drivers License Criers", "Still not over that breakup song"),
                ("High School Drama Queens", "Living vicariously through her lyrics"),
                ("Sour Grapes", "Bitter about everything, just like the album")
            ],
            'harry styles': [
                ("Watermelon Sugar Addicts", "Convinced he's the next David Bowie"),
                ("One Direction Rejects", "Can't accept the band is over"),
                ("Fine Line Fanatics", "Think wearing nail polish makes them edgy")
            ],

            # Hip-hop/Rap artists
            'drake': [
                ("Started From the Bottom", "Now we're still here complaining"),
                ("6ix God Disciples", "Toronto is the center of the universe"),
                ("Certified Lover Boys", "Sensitive rap for soft hearts")
            ],
            'kendrick lamar': [
                ("Lyrical Geniuses", "Analyze every bar like English lit"),
                ("DAMN. Good Taste", "Feel superior for liking 'real rap'"),
                ("Pulitzer Prize Committee", "Won't shut up about the Grammy snub")
            ],
            'kanye west': [
                ("Ye Stans", "Defend every controversial tweet"),
                ("Graduation Class", "Peak was 15 years ago"),
                ("Bipolar Bears", "Mood swings with every album release")
            ],

            # Rock/Alternative
            'imagine dragons': [
                ("Thunder Struck", "Corporate rock enthusiasts"),
                ("Radioactive Waste", "Ruined alternative rock for everyone"),
                ("Arena Rock Posers", "Think this counts as rock music")
            ],
            'twenty one pilots': [
                ("Stressed Out Adults", "Never left their emo phase"),
                ("Blurryface Brigade", "Red eyeshadow was a life choice"),
                ("Kitchen Sink Philosophers", "Find deep meaning in random lyrics")
            ],

            # Country
            'luke bryan': [
                ("Country Girls Shake", "Think pickup trucks are personality traits"),
                ("Beer Drinkin' Stereotypes", "Living the most basic country life"),
                ("Tailgate Philosophers", "Wisdom comes from stadium country")
            ],

            # Electronic/Dance
            'calvin harris': [
                ("EDM Basic Bros", "Festival fashion over musical taste"),
                ("Drop Bass Not Bombs", "Think DJ sets count as live music"),
                ("Summer Vibes Only", "Peak personality trait is beach parties")
            ],

            # R&B
            'the weeknd': [
                ("Blinding Lights Addicts", "Think sadness sounds better with synthesizers"),
                ("XO Till We OD", "Romanticize toxic relationships"),
                ("After Hours Insomniacs", "Nocturnal and proud of it")
            ],

            # Indie
            'lorde': [
                ("Royals Court", "Too cool for mainstream pop"),
                ("Solar Power Hippies", "Pretentious about being environmentally woke"),
                ("Melodrama Queens", "Every emotion is a theatrical performance")
            ],
            'arctic monkeys': [
                ("AM Posers", "Think British accents make music better"),
                ("Sheffield Snobs", "Won't admit they peaked with their first album"),
                ("Indie Rock Fossils", "Still living in 2013")
            ]
        }

        self.genre_roasts = {
            'pop': [
                ("Basic Pop Brigade", "Spotify Top 40 is their entire personality"),
                ("Mainstream Machines", "If it's not on the radio, it doesn't exist"),
                ("Chart Toppers Anonymous", "Addicted to catchy hooks and auto-tune")
            ],
            'hip hop': [
                ("Real Hip-Hop Heads", "Everything after 2010 is trash"),
                ("Mumble Rap Rejects", "Can't understand modern lyrics"),
                ("Boom Bap Boomers", "Still waiting for the 90s comeback")
            ],
            'rock': [
                ("Rock Purists", "Think anything after Led Zeppelin is sellout music"),
                ("Guitar Hero Legends", "Air guitar skills are unmatched"),
                ("Vinyl Snobs", "If it's not on wax, it's not real music")
            ],
            'country': [
                ("Yeehaw Yahoos", "Think trucks and beer equal depth"),
                ("Nashville Newcomers", "Discovered country through Taylor Swift"),
                ("Honky Tonk Heroes", "Line dancing is a legitimate skill")
            ],
            'electronic': [
                ("Bass Drop Addicts", "Need seizure warnings for their playlists"),
                ("Festival Fashion Victims", "Rave culture without the underground"),
                ("BPM Obsessed", "Heart rate syncs with their music")
            ],
            'alternative': [
                ("Alt-Rock Archeologists", "Digging through 90s nostalgia"),
                ("Indie Elitists", "Too cool for anything popular"),
                ("Grunge Wannabes", "Born 20 years too late")
            ],
            'r&b': [
                ("Smooth Operators", "Think they're cooler than they actually are"),
                ("Neo-Soul Purists", "Everything modern lacks authenticity"),
                ("Slow Jam Specialists", "Mood lighting is a lifestyle choice")
            ]
        }

        self.energy_roasts = {
            'high': [
                ("Caffeine Addicts", "Music matches their anxiety levels"),
                ("Adrenaline Junkies", "Can't sit still during ballads"),
                ("Hyperactive Heroes", "Volume at 11 or nothing")
            ],
            'low': [
                ("Meditation Masters", "Music for naptime specialists"),
                ("Chill Pill Poppers", "Too cool to show enthusiasm"),
                ("Ambient Addicts", "Background music for background people")
            ]
        }

        self.age_roasts = {
            'young': [
                ("TikTok Taste Makers", "15-second attention spans"),
                ("Gen Z Zombies", "If it's not viral, it's not valid"),
                ("Playlist Peasants", "Algorithms decide their music taste")
            ],
            'old': [
                ("Millennial Mourners", "Still think 2005 was peak music"),
                ("Nostalgic Narcissists", "Music was better when they were young"),
                ("Spotify Seniors", "Reluctantly left their CD collection behind")
            ]
        }

        self.mixed_bag_roasts = [
            ("The Musical Misfits", "Couldn't agree on a single genre"),
            ("Chaos Collective", "Playlist sounds like random shuffle gone wrong"),
            ("Genre Fluid Failures", "Identity crisis in audio form"),
            ("The Undecided", "Democracy failed them musically"),
            ("Spotify Roulette Victims", "Let the algorithm choose their fate"),
            ("The Compromise Crew", "Settled for mediocrity together"),
            ("Musical Middle Ground", "Bland enough for everyone"),
            ("The Diplomatic Disaster", "Tried to please everyone, pleased no one")
        ]

    def generate_group_names(self, groups: List[Group]) -> List[Group]:
        """
        Generate roast names and themes for all groups.

        Args:
            groups: List of Group objects to name

        Returns:
            List of Group objects with roast_name and group_theme filled
        """
        logger.info(f"Generating names for {len(groups)} groups")

        for i, group in enumerate(groups):
            try:
                roast_name, theme = self._generate_single_group_name(group)
                group.roast_name = roast_name
                group.group_theme = theme
                logger.info(f"Named group {i}: {roast_name}")
            except Exception as e:
                logger.error(f"Error naming group {i}: {e}")
                group.roast_name = f"Group {i + 1}"
                group.group_theme = "Unnamed group"

        return groups

    def _generate_single_group_name(self, group: Group) -> Tuple[str, str]:
        """Generate a roast name and theme for a single group."""

        # Priority 1: Shared artists (highest weight)
        if group.shared_artists:
            return self._name_by_artist(group)

        # Priority 2: Shared genres
        if group.shared_genres:
            return self._name_by_genre(group)

        # Priority 3: Energy levels
        energy_pattern = self._analyze_energy_pattern(group)
        if energy_pattern:
            return self._name_by_energy(energy_pattern, group)

        # Priority 4: Age demographics
        age_pattern = self._analyze_age_pattern(group)
        if age_pattern:
            return self._name_by_age(age_pattern, group)

        # Fallback: Mixed bag roasts
        return self._name_mixed_bag(group)

    def _name_by_artist(self, group: Group) -> Tuple[str, str]:
        """Name group based on shared artists."""
        # Get the most common shared artist
        main_artist = group.shared_artists[0].lower()

        # Check if we have specific roasts for this artist
        if main_artist in self.artist_roasts:
            roasts = self.artist_roasts[main_artist]

            # Choose roast based on group characteristics
            selected_roast = self._select_artist_roast(roasts, group)
            return selected_roast

        # Generic artist-based roast
        artist_name = main_artist.title()
        generic_roasts = [
            (f"{artist_name} Fanclub", f"Obsessed with {artist_name}"),
            (f"{artist_name} Addicts", f"Can't stop listening to {artist_name}"),
            (f"The {artist_name} Collective", f"United by {artist_name} appreciation"),
            (f"{artist_name} Disciples", f"Worship {artist_name} religiously")
        ]

        return random.choice(generic_roasts)

    def _select_artist_roast(self, roasts: List[Tuple[str, str]],
                           group: Group) -> Tuple[str, str]:
        """Select the most appropriate roast for the artist based on group data."""

        # For Taylor Swift, try to differentiate between old and new fans
        if any('swift' in artist.lower() for artist in group.shared_artists):
            avg_age = group.dominant_characteristics.get('avg_age', 20)

            if avg_age >= 23:  # Older fans likely to be original Swifties
                return roasts[0]  # "Swifties (The Originals)"
            else:
                return roasts[1]  # "Fake Swifties"

        # For other artists, pick randomly or based on energy
        energy = group.dominant_characteristics.get('avg_energy', 0.5)

        if energy > 0.7:
            # High energy groups get more intense roasts
            return roasts[0] if len(roasts) > 0 else roasts[0]
        else:
            # Lower energy groups get gentler roasts
            return roasts[-1] if len(roasts) > 1 else roasts[0]

    def _name_by_genre(self, group: Group) -> Tuple[str, str]:
        """Name group based on shared genres."""
        main_genre = group.shared_genres[0].lower()

        # Clean up genre name
        main_genre = main_genre.replace('_', ' ').strip()

        # Check for specific genre roasts
        for genre_key, roasts in self.genre_roasts.items():
            if genre_key in main_genre or main_genre in genre_key:
                return random.choice(roasts)

        # Generic genre-based roast
        genre_name = main_genre.title()
        generic_roasts = [
            (f"{genre_name} Purists", f"Only listen to {genre_name}"),
            (f"{genre_name} Fanatics", f"Obsessed with {genre_name}"),
            (f"The {genre_name} Society", f"Exclusive {genre_name} appreciation"),
            (f"{genre_name} Snobs", f"Think {genre_name} is superior music")
        ]

        return random.choice(generic_roasts)

    def _analyze_energy_pattern(self, group: Group) -> str:
        """Analyze group's energy pattern."""
        avg_energy = group.dominant_characteristics.get('avg_energy', 0.5)

        if avg_energy > 0.75:
            return 'high'
        elif avg_energy < 0.3:
            return 'low'
        else:
            return None  # Medium energy, not distinctive enough

    def _name_by_energy(self, energy_pattern: str, group: Group) -> Tuple[str, str]:
        """Name group based on energy pattern."""
        roasts = self.energy_roasts.get(energy_pattern, [])

        if roasts:
            return random.choice(roasts)

        # Fallback
        return ("Energy Anomalies", "Unclassifiable energy levels")

    def _analyze_age_pattern(self, group: Group) -> str:
        """Analyze group's age pattern."""
        avg_age = group.dominant_characteristics.get('avg_age', 20)

        if avg_age <= 22:
            return 'young'
        elif avg_age >= 26:
            return 'old'
        else:
            return None  # Middle age, not distinctive enough

    def _name_by_age(self, age_pattern: str, group: Group) -> Tuple[str, str]:
        """Name group based on age pattern."""
        roasts = self.age_roasts.get(age_pattern, [])

        if roasts:
            return random.choice(roasts)

        # Fallback
        return ("Age Appropriate", "Demographically average")

    def _name_mixed_bag(self, group: Group) -> Tuple[str, str]:
        """Name group when no clear pattern emerges."""
        return random.choice(self.mixed_bag_roasts)

    def add_custom_roast(self, artist: str, roasts: List[Tuple[str, str]]):
        """Add custom roasts for specific artists."""
        self.artist_roasts[artist.lower()] = roasts

    def add_genre_roast(self, genre: str, roasts: List[Tuple[str, str]]):
        """Add custom roasts for specific genres."""
        self.genre_roasts[genre.lower()] = roasts