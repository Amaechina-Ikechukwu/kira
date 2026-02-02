# 🎓 Kira - AI Learning Platform

An AI-powered learning platform and management system that creates personalized lessons from quiz results and documents. Kira teaches concepts first, then reinforces understanding through gamified quizzes and performance tracking.

## Features

- 🤖 **AI-Generated Lessons** - Uses Gemini to create personalized teaching content
- 🔐 **Google Authentication** - Secure user sign-in via Google OAuth
- 🏫 **School & Classroom Management** - Support for institutional structures, departments, and class schedules
- 📊 **Performance Analytics** - Detailed tracking of accuracy, XP rewards, and time spent on lessons
- 📄 **Document Support** - Extracts knowledge from PDF files to supplement lessons
- 📧 **Email Integration** - Sends lesson invites and review sessions via email
- 🎮 **Gamified UI** - Animated mascot, interactive "Boss Battles," and XP-based progression
- 🌐 **Topic Exploration** - Instant AI lessons for any topic via public landing page demo

## Tech Stack

- **Backend**: Bun + Express + TypeScript + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion + Lucide Icons
- **AI**: Google Gemini API
- **Storage**: PostgreSQL (Cloud SQL) + Cloudinary (Media)
- **Testing**: Vitest

## Quick Start

bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Push database schema
bun x drizzle-kit push

# Run development server
bun run dev

# Run tests
bun run test

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | Google OAuth redirect callback URL |
| `GOOGLE_SHEETS_ID` | Google Sheet ID with quiz responses |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | Path to service account JSON |
| `POSTGRES_HOST` | PostgreSQL host address |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DATABASE` | PostgreSQL database name |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EMAIL_USER` | Email address for sending invites |
| `EMAIL_PASS` | App-specific password for email |
| `EMAIL_HOST` | SMTP host (e.g., smtp.gmail.com) |
| `EMAIL_PORT` | SMTP port (e.g., 587) |
| `BASE_URL` | Public URL for lesson links |

## How It Works

1. **Quiz Webhook/Form** → Receives student submission data or manual input
2. **Context Retrieval** → Fetches student answers and optional PDF documentation
3. **AI Generation** → Gemini creates pedagogical content, interactive cards, and quiz questions
4. **Email/Dashboard** → Student receives access via email or finds the lesson in their classroom dashboard
5. **Learn & Battle** → Student completes lessons, earns XP, and faces "Boss Battles" to track progress

## API Endpoints

- `POST /api/lesson/explore` - Explore a topic (Public)
- `POST /api/lesson/invite` - Send lesson invite email (Auth required)
- `POST /api/lesson/start` - Start a lesson session (Auth required)
- `GET /api/lesson/:sessionId` - Get lesson data (Auth required)
- `POST /api/lesson/:sessionId/progress` - Update progress and performance stats (Auth required)
- `GET /api/auth/google/callback` - Google OAuth authentication callback

## License

MIT