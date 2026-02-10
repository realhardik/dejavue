# Dejavue Setup & Development Guide

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install
```

### 2. Run Development Server

For **web app only**:
```bash
npm run dev
```
Visit `http://localhost:3000`

For **Electron app** (includes web + desktop app):
```bash
npm run dev-electron
```

### 3. Build for Production

```bash
# Build Next.js
npm run build

# Start production server
npm start
```

## Environment Setup

### Create .env.local

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# AI SDK (uses Vercel AI Gateway by default)
# No additional setup needed - configure through Vercel console
```

## Project Navigation

After logging in (test with any email/password), you can navigate to:

- **Dashboard** (`/dashboard`) - Main overview with today's meetings
- **Meetings** (`/dashboard/meetings`) - Browse all recorded meetings
- **Live Meeting** (`/dashboard/live`) - Real-time transcription and chat (demo)
- **Chat** (`/dashboard/chat`) - Chat interface with meeting context
- **Meeting Details** (`/dashboard/meeting/1`) - Full summary and transcript
- **Settings** (`/dashboard/settings`) - User preferences

## Test Credentials

The authentication is currently mock-based. Use any email/password to test:
- Email: `test@example.com`
- Password: `password123`

## Key Features to Test

### 1. Authentication
- Landing page → Sign up
- Fill in details and create account
- Dashboard auto-loads on login
- Sidebar logout button

### 2. Dashboard
- View meeting stats and cards
- Click "View Details" on meeting cards
- Search and filter in meetings page

### 3. AI Chat
- Click "Chat with AI" on any meeting
- Type questions about the meeting
- Get streaming AI responses

### 4. Live Meeting View
- Go to `/dashboard/live`
- See live transcription with speakers
- Chat with AI about ongoing meeting
- View meeting detector status

### 5. Meeting Summary
- Click on a meeting to view details
- See auto-generated summary, decisions, and action items
- View full transcript
- Export or share summary

## Development Commands

```bash
# Start development server
npm run dev

# Start with Electron
npm run dev-electron

# Build production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Electron only
npm run electron
```

## File Structure Overview

```
app/
├── page.tsx                    # Landing page
├── layout.tsx                 # Root layout
├── auth/                      # Authentication pages
├── dashboard/                 # Dashboard pages
│   ├── page.tsx              # Main dashboard
│   ├── meetings/             # Meeting history
│   ├── chat/                 # Chat interface
│   ├── live/                 # Live meeting
│   ├── meeting/[id]/         # Meeting details
│   └── settings/             # User settings
└── api/                       # API routes
    ├── chat/                 # Chat endpoint
    └── generate-summary/     # Summary generation

components/
├── ui/                        # shadcn/ui components
├── sidebar.tsx               # Navigation sidebar
├── meeting-card.tsx          # Meeting card component
├── chat-interface.tsx        # AI chat interface
├── live-transcription.tsx    # Live transcript display
├── meeting-detector.tsx      # Meeting detection
└── meeting-summary.tsx       # Summary display
```

## Common Tasks

### Adding a New Page

1. Create file in `app/dashboard/new-page/page.tsx`
2. Import Sidebar component
3. Add to sidebar navigation in `components/sidebar.tsx`

### Styling

- Colors: Modify `app/globals.css` design tokens
- Components: Use shadcn/ui + Tailwind CSS
- Theme: Dark theme by default, fully customizable

### Adding API Endpoint

1. Create file in `app/api/route-name/route.ts`
2. Use `streamText` for streaming responses
3. Use `generateText` for one-off responses
4. Return `result.toUIMessageStreamResponse()` for chat

### Testing Chat

Use the `/dashboard/chat` page - it's fully functional with the AI SDK integration. Type questions about meetings and get streaming responses.

## Troubleshooting

### Port Already in Use

If port 3000 is in use:
```bash
# Change port
PORT=3001 npm run dev
```

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Electron Not Starting

Make sure Next.js is running on port 3000 before starting Electron:
```bash
npm run dev-electron
```

## Next Steps for Production

### 1. Add Real Authentication
- Integrate Supabase Auth or Auth.js
- Update login/signup flows
- Add session management

### 2. Add Database
- Use Supabase PostgreSQL or Neon
- Create tables for meetings, transcripts, user data
- Add RLS policies for security

### 3. Integrate Meeting Platforms
- Add Zoom API integration
- Add Google Meet API integration
- Implement meeting detection logic

### 4. Real Transcription Service
- Integrate Deepgram, Assembly AI, or similar
- Setup real-time transcription
- Store transcripts in database

### 5. Deployment
- Deploy to Vercel (web)
- Build and distribute Electron app
- Setup CI/CD pipeline

### 6. Analytics
- Add event tracking
- Monitor usage metrics
- Setup error tracking

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Electron Documentation](https://www.electronjs.org/docs)

## Support

For issues or questions during development, check:
1. Console for error messages
2. Network tab for API errors
3. This guide for common solutions

## Notes

- All data is currently stored in localStorage (test only)
- Mock data is used for demonstrations
- AI responses require valid OpenAI API key
- Desktop app requires Node.js 18+

Happy coding with Dejavue!
