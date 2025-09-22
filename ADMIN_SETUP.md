# 🎵 Northeastern Data Club - Administrator Setup Guide

This guide provides complete setup instructions for administrators deploying the Northeastern Data Club demo application.

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Basic command line knowledge
- Email addresses of demo participants (for user account creation)

## 🚀 Quick Setup (5 minutes)

### 1. Clone and Install Dependencies
```bash
cd ~/Desktop/spotifyDataClubDemo/web
npm install
```

### 2. Initialize Database
```bash
npx prisma generate
npx prisma db push
```

### 3. Set Environment Variables
Create `.env.local` file in the `web/` directory:
```bash
# Required for authentication
NEXTAUTH_SECRET="demo-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Optional: For production deployment
# DATABASE_URL="file:./dev.db"
```

### 4. Start the Application
```bash
npm run dev
```

The app will be available at: `http://localhost:3000`

## 👥 User Management

### Auto-Creating User Accounts from Google Forms

When you process Google Forms responses, the system automatically:

1. **Extracts email addresses** from form responses
2. **Creates user accounts** for each unique email
3. **Sets temporary passwords** (users can later claim accounts)
4. **Links form data** to user accounts by email

#### Example CSV Format for Google Forms:
```csv
timestamp,name,email,major,year,genres,favorite_artists,energy,valence,danceability,acousticness,tempo
2024-01-15T10:30:00Z,John Smith,john.smith@university.edu,Computer Science,Junior,"Pop, Electronic","The Weeknd, Drake",0.75,0.65,0.80,0.20,128
```

### Manual User Account Creation

Users can also create accounts manually:
1. Go to `/auth/signup`
2. Fill in their details (name, email, major, year)
3. Set a password
4. If their email matches Google Forms data, it will be automatically linked

## 📊 Google Forms Setup

### Creating the Google Form

1. **Create a Google Form** with these essential fields:
   - Email (required for user mapping)
   - Name
   - Major/Department
   - Year/Grade Level
   - Favorite Songs (text field)
   - Favorite Artists (text field)
   - Music Genres (checkboxes or text)

2. **Optional Music Preference Fields** (for advanced grouping):
   - Energy Level (1-10 scale)
   - Mood Preference (1-10 scale)
   - Danceability (1-10 scale)
   - Acoustic vs Electronic (1-10 scale)
   - Tempo Preference (BPM or Low/Medium/High)

### Google Sheets Integration

#### Option A: CSV Export (Recommended for Demo)
1. Open Google Forms responses in Google Sheets
2. File → Download → Comma-separated values (.csv)
3. Upload the CSV file in the app at `/forms-processor`

#### Option B: Direct Sheets URL
1. Copy the Google Sheets URL from your form responses
2. Paste it in the "Google Sheets URL" field in the app
3. Note: This uses mock data in demo mode

## 🔧 Application Features

### 1. Form Processing (`/forms-processor`)
- **Upload CSV files** from Google Forms
- **Process Google Sheets URLs** (with mock data)
- **Configure group sizes** (2-8 members)
- **Auto-create user accounts** from email addresses
- **Advanced compatibility algorithms** for optimal grouping

### 2. Group Formation Algorithm
- **Musical compatibility** analysis using cosine similarity
- **Genre overlap** calculation
- **Artist preference** matching
- **Diversity scoring** for balanced groups
- **Cohesion metrics** for group harmony

### 3. Export Features
- **CSV download** with complete group information
- **Member details** with music profiles
- **Compatibility scores** and recommendations
- **Activity suggestions** based on group preferences

## 🎯 Demo Workflow

### For Live Presentations:

1. **Pre-Demo Setup** (5 minutes):
   ```bash
   cd ~/Desktop/spotifyDataClubDemo/web
   npm run dev
   ```

2. **Collect Audience Data**:
   - Share Google Form link with audience
   - Wait 2-3 minutes for responses
   - Export responses as CSV

3. **Live Demo**:
   - Navigate to `/forms-processor`
   - Upload the CSV file
   - Configure group size (typically 4-5 people)
   - Click "Create Groups"
   - Download and show the results CSV

4. **Show Results**:
   - Display group formation results
   - Highlight compatibility scores
   - Explain the algorithm insights
   - Demonstrate the recommendation system

## 🔍 Troubleshooting

### Common Issues:

**Database Not Found**:
```bash
npx prisma db push
```

**Authentication Errors**:
Check that `NEXTAUTH_SECRET` is set in `.env.local`

**CSV Upload Fails**:
Ensure CSV has required columns: `timestamp`, `email`, `name`

**No Groups Generated**:
- Check that CSV has at least 4 rows of data
- Verify email addresses are valid
- Try a smaller group size

### Reset Database:
```bash
rm prisma/dev.db
npx prisma db push
```

## 📱 User Interface Guide

### Navigation:
- **Home** (`/`) - Main dashboard with overview
- **Forms Processor** (`/forms-processor`) - Main admin tool
- **Login** (`/auth/login`) - User authentication
- **Sign Up** (`/auth/signup`) - New user registration

### Key Features:
- **Real-time Processing** - Watch groups form in real-time
- **Interactive Results** - Click through group details
- **Download Options** - Multiple export formats
- **Responsive Design** - Works on mobile and desktop

## ⚙️ Advanced Configuration

### Environment Variables:
```bash
# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Database (optional - defaults to SQLite)
DATABASE_URL="file:./dev.db"

# App Settings
GROUP_SIZE_DEFAULT=4
MAX_GROUPS=20
```

### Customization Options:

**Group Size Limits**: Edit `src/app/api/google/process-forms/route.ts`
**Compatibility Algorithm**: Modify weights in the similarity calculation
**Export Format**: Customize CSV headers and data structure

## 🎵 Sample Data

The app includes sample data for testing:
- **Download**: `/sample-music-form-template.csv`
- **8 sample responses** with realistic music preferences
- **Mixed majors and years** for diverse grouping
- **Various music genres** to test compatibility algorithms

## 📞 Support

For technical issues:
1. Check the console logs in browser dev tools
2. Review the Next.js terminal output
3. Verify all dependencies are installed
4. Ensure database is properly initialized

The application is designed for demo purposes and prioritizes functionality over security. Perfect for classroom demonstrations and Data Science Club presentations!