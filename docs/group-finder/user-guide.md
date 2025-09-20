# Group Finder - User Guide

## Getting Started

The Group Finder feature automatically creates teams of 3-4 people based on their music preferences. This guide walks you through using the system as both a participant and session organizer.

## Access the Feature

1. **Open the Spotify Favorites Analysis Dashboard**
   - Navigate to the app URL (typically `http://localhost:8501`)
   - Wait for the app to load completely

2. **Go to the Group Finder Tab**
   - Click on the **"🎵 Group Finder"** tab (second tab)
   - You'll see the Group Finder interface

## User Roles

### Participants
- Submit music preferences through the form
- View their assigned group
- Request to join different groups

### Session Organizer
- Control group formation process
- Approve/deny group change requests
- Finalize groups when ready

## Step-by-Step Walkthrough

### Phase 1: Data Collection

**What You'll See:**
```
🎵 Group Finder

Need at least 6 people to form groups. Currently have 3 people.
Groups will be created automatically when more people join!
```

**What's Happening:**
- The system is waiting for enough participants (minimum 6)
- Real-time counter shows current participant count
- Groups cannot be formed until minimum threshold is reached

**Action Required:**
- Wait for more people to fill out the music preferences form
- Share the form link with additional participants

### Phase 2: Group Formation

**What You'll See:**
```
🎵 Group Finder

Form Music Groups                                [Finalize Groups]
[🎲 Create Groups]  [🔄 Regenerate Groups]

Click 'Create Groups' to form music-based groups!
```

**What's Happening:**
- Sufficient participants have joined (6 or more)
- Ready to create groups using the clustering algorithm
- Initial groups can be generated with one click

**Actions Available:**

1. **Create Groups** (Primary Action)
   - Click **"🎲 Create Groups"** button
   - System calculates music similarity between all participants
   - Creates optimal groups of 3-4 people each
   - Generates humorous group names based on music characteristics

2. **Regenerate Groups** (If Needed)
   - Available after initial groups are created
   - Click **"🔄 Regenerate Groups"** to try different combinations
   - Useful if initial groupings aren't satisfactory

### Phase 3: Group Review

**What You'll See:**
```
Your Music Groups

🎤 Swifties (The Originals)                          Compatibility: 87.3%
Real fans since Fearless era

Members:
**Sarah**                    **Mike**                    **Emma**
🎵 Love Story               🎵 You Belong With Me       🎵 Shake It Off
👤 Taylor Swift             👤 Taylor Swift             👤 Taylor Swift
📚 Psychology               📚 Computer Science         📚 English

🎤 Shared Artists: taylor swift
🎶 Shared Genres: pop, country

[Request to Join This Group ▼]
  Select your name: [Dropdown]
  [Request to Join]

---

🎤 Basic Pop Brigade                                  Compatibility: 73.1%
Spotify Top 40 is their entire personality

Members:
**Alex**                     **Jordan**                  **Casey**
🎵 Anti-Hero                🎵 Flowers                   🎵 As It Was
👤 Taylor Swift             👤 Miley Cyrus              👤 Harry Styles
📚 Business                 📚 Art                       📚 Music
```

**Understanding Group Cards:**

1. **Group Header**
   - **Group Name**: Humorous roast name (e.g., "Swifties (The Originals)")
   - **Theme**: Explanation of the roast (e.g., "Real fans since Fearless era")
   - **Compatibility Score**: How well the group members match (higher = better)

2. **Member Information**
   - **Name**: Participant's name
   - **🎵 Song**: Their favorite song
   - **👤 Artist**: Their favorite artist
   - **📚 Major**: Their academic major

3. **Group Characteristics**
   - **Shared Artists**: Artists that multiple group members like
   - **Shared Genres**: Musical genres common to the group

4. **Request Interface**
   - Expandable section to request joining this group
   - Dropdown to select your name
   - Button to submit request

### Phase 4: Group Change Requests (Optional)

**Making a Request:**

1. **Find Your Desired Group**
   - Browse through all group cards
   - Look for groups with shared musical interests
   - Check compatibility scores

2. **Submit Request**
   - Expand **"Request to Join This Group"** section
   - Select your name from dropdown
   - Click **"Request to Join"** button

3. **System Validation**
   - Automatic checks ensure group size constraints
   - Prevents your current group from becoming too small
   - Ensures target group isn't already full

**What You'll See:**
```
✅ Request submitted to join Swifties (The Originals)!
```

**Managing Requests (Session Organizer):**

```
📋 Pending Group Change Requests

**Dave** wants to join **Swifties (The Originals)**
[✅ Approve]  [❌ Deny]

**Lisa** wants to join **Basic Pop Brigade**
[✅ Approve]  [❌ Deny]
```

**Organizer Actions:**
- **Approve**: Moves the person to requested group
- **Deny**: Removes request without making changes
- Decisions are processed immediately

### Phase 5: Finalization

**What You'll See:**
```
🔒 Finalize Groups

Groups have been finalized! ✅
```

**What Happens:**
- Click **"🔒 Finalize Groups"** when satisfied with assignments
- Celebration animation (balloons) appears
- Groups become read-only - no more changes allowed
- Ready to start group activities

## Example Scenarios

### Scenario 1: Taylor Swift Fans Group

**Participants:**
- Sarah (Psychology) - "Love Story" by Taylor Swift
- Mike (Computer Science) - "You Belong With Me" by Taylor Swift
- Emma (English) - "Shake It Off" by Taylor Swift

**Result:**
- **Group Name**: "Swifties (The Originals)"
- **Theme**: "Real fans since Fearless era"
- **Compatibility**: 87.3%
- **Shared Artists**: taylor swift
- **Shared Genres**: pop, country

### Scenario 2: Mixed Pop Group

**Participants:**
- Alex (Business) - "Anti-Hero" by Taylor Swift
- Jordan (Art) - "Flowers" by Miley Cyrus
- Casey (Music) - "As It Was" by Harry Styles

**Result:**
- **Group Name**: "Basic Pop Brigade"
- **Theme**: "Spotify Top 40 is their entire personality"
- **Compatibility**: 73.1%
- **Shared Artists**: (none)
- **Shared Genres**: pop

### Scenario 3: Hip-Hop Enthusiasts

**Participants:**
- Marcus (Engineering) - "God's Plan" by Drake
- Zoe (Sociology) - "HUMBLE." by Kendrick Lamar
- Tyler (Film) - "Sicko Mode" by Travis Scott

**Result:**
- **Group Name**: "Real Hip-Hop Heads"
- **Theme**: "Everything after 2010 is trash"
- **Compatibility**: 78.9%
- **Shared Artists**: (none - different artists but same genre)
- **Shared Genres**: hip hop, rap

## Understanding Group Names

### Artist-Based Names

**Taylor Swift Groups:**
- **"Swifties (The Originals)"** → Older fans, likely been listening since early albums
- **"Fake Swifties"** → Newer fans who joined after folklore/evermore popularity
- **"The 13 Club"** → Deep fans who know Easter eggs and hidden meanings

**Drake Groups:**
- **"Started From the Bottom"** → Fans of his journey narrative
- **"6ix God Disciples"** → Toronto pride and loyalty
- **"Certified Lover Boys"** → Appreciate his emotional/romantic side

**Hip-Hop Groups:**
- **"Lyrical Geniuses"** → Focus on wordplay and meaning (Kendrick Lamar fans)
- **"Mumble Rap Rejects"** → Prefer older, clearer rap styles
- **"Real Hip-Hop Heads"** → Gatekeeping tendencies about "authentic" rap

### Genre-Based Names

**Pop Groups:**
- **"Basic Pop Brigade"** → Mainstream taste, radio hits
- **"Mainstream Machines"** → Only know popular songs
- **"Chart Toppers Anonymous"** → Addicted to Billboard hits

**Rock Groups:**
- **"Rock Purists"** → Think modern rock isn't "real" rock
- **"Guitar Hero Legends"** → Video game generation rock fans
- **"Vinyl Snobs"** → Prefer analog/vintage sound

**Country Groups:**
- **"Yeehaw Yahoos"** → Stereotypical country lifestyle
- **"Nashville Newcomers"** → Discovered country through crossover hits
- **"Honky Tonk Heroes"** → Traditional country bar culture

### Energy/Pattern Names

**High Energy:**
- **"Caffeine Addicts"** → Music matches their hyperactive lifestyle
- **"Adrenaline Junkies"** → Need intense, pumping music
- **"Bass Drop Addicts"** → Love electronic/dance music

**Low Energy:**
- **"Meditation Masters"** → Prefer calm, ambient music
- **"Chill Pill Poppers"** → Too cool for energetic music
- **"Ambient Addicts"** → Background music preferences

**Age-Based:**
- **"TikTok Taste Makers"** → Gen Z with viral music preferences
- **"Millennial Mourners"** → Nostalgic for 2000s/2010s music
- **"Spotify Seniors"** → Older users adapting to streaming

## Troubleshooting

### Common Issues

**1. "Need at least 6 people" Message**
- **Cause**: Not enough participants have filled out the form
- **Solution**: Wait for more people to join or share the form link
- **Tip**: The count updates in real-time as people submit responses

**2. Groups Seem Unbalanced**
- **Cause**: Limited similarity between participants
- **Solution**: Use "🔄 Regenerate Groups" to try different combinations
- **Note**: Sometimes there aren't enough similar preferences to create perfect matches

**3. Can't Join Desired Group**
- **Cause**: Group size constraints prevent the move
- **Messages**:
  - "Your current group would become too small if you leave"
  - "This group is already full"
- **Solution**: Try different groups or ask organizer for manual adjustment

**4. Request System Not Working**
- **Cause**: Groups may already be finalized
- **Check**: Look for "Groups have been finalized! ✅" message
- **Solution**: Requests are only possible before finalization

### Performance Issues

**Slow Group Formation (10+ seconds)**
- **Normal for**: 50+ participants
- **Optimization**: System automatically handles large groups
- **Alternative**: Use smaller batch sizes if needed

**Groups Disappear on Page Refresh**
- **Expected Behavior**: Groups are session-based only
- **Solution**: Don't refresh the page during active session
- **Workaround**: Screenshot group assignments for reference

## Best Practices

### For Session Organizers

1. **Wait for Full Participation**
   - Don't rush group formation
   - Ensure all expected participants have submitted forms
   - 10-20 people is optimal for interesting group dynamics

2. **Review Before Finalizing**
   - Check group sizes (should be 3-4 people each)
   - Review compatibility scores (70%+ is good)
   - Allow time for change requests

3. **Manage Requests Fairly**
   - Approve requests that improve overall group balance
   - Consider participant preferences but maintain group integrity
   - Communicate decisions if asked

### For Participants

1. **Be Honest with Preferences**
   - Accurate music preferences lead to better matches
   - Don't try to game the system for specific groupings
   - Include genres and artists you actually enjoy

2. **Be Patient with Results**
   - Algorithm optimizes for overall group compatibility
   - Your perfect match might not be in your initial group
   - Use request system if genuinely unsatisfied

3. **Embrace the Humor**
   - Group names are meant to be playful and fun
   - Don't take roasts personally - they're based on musical stereotypes
   - Use names as conversation starters

## Export and Next Steps

### After Finalization

**Group Information Available:**
- Complete member lists with contact information
- Compatibility scores for each group
- Shared musical characteristics
- Humorous group identities for activities

**Suggested Follow-up Activities:**
- Ice-breaker discussions about music preferences
- Collaborative playlist creation
- Project work using group assignments
- Music-themed team challenges

### Manual Adjustments

If needed after finalization, organizers can:
- Manually record group changes
- Create hybrid groups for special cases
- Use group information as starting point for custom assignments

---

*For technical details, see [Technical Guide](technical-guide.md)*
*For setup instructions, see [Setup Guide](setup-guide.md)*