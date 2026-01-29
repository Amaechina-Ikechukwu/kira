# 🎓 Kira - AI Learning Platform

An AI-powered learning companion that creates personalized lessons from quiz results. Kira teaches concepts first, then quizzes to reinforce understanding.

## Features

- 🤖 **AI-Generated Lessons** - Uses Gemini to create personalized teaching content
- 📧 **Email Integration** - Sends lesson invites via email
- 📊 **Google Sheets Integration** - Reads quiz data from Google Forms responses
- 🎮 **Interactive UI** - Animated mascot, progress tracking, and quizzes

## Tech Stack

- **Backend**: Bun + Express + TypeScript
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **AI**: Google Gemini API
- **Database**: PostgreSQL + Drizzle ORM (optional, has mock mode)

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run development server
bun run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_CLIENT_EMAIL` | Service account email for Sheets API |
| `GOOGLE_PRIVATE_KEY` | Service account private key |
| `GOOGLE_SHEET_ID` | Google Sheet ID with quiz responses |
| `EMAIL_USER` | Email address for sending invites |
| `EMAIL_PASSWORD` | App-specific password for email |
| `BASE_URL` | Public URL for lesson links |
| `MOCK_MODE` | Set to `true` to skip database |

## How It Works

1. **Quiz Webhook** → Receives quiz submission data
2. **Sheets Fetch** → Gets student answers from Google Sheets
3. **AI Generation** → Gemini creates teaching content + quiz questions
4. **Email Sent** → Student receives lesson link
5. **Learn & Quiz** → Student learns concepts, then takes quiz

## API Endpoints

- `POST /api/lesson/invite` - Send lesson invite email
- `POST /api/lesson/start` - Start a lesson session
- `GET /api/lesson/:sessionId` - Get lesson data
- `POST /api/lesson/:sessionId/progress` - Update progress

## License

MIT
