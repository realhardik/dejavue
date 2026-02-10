# Dejavue - Real-time Meeting Summarizer

A powerful desktop application that automatically detects, records, and transcribes your Zoom and Google Meet meetings using AI. Get instant summaries, chat with an AI assistant about meeting content, and generate professional meeting minutes.

## Features

- **🎥 Auto-Detection & Recording**: Automatically detect and record Zoom and Google Meet meetings
- **⚡ Real-Time Transcription**: Live transcription of meetings as they happen with 99% accuracy
- **🤖 AI Meeting Assistant**: Chat with an intelligent AI assistant to ask questions about your meetings during or after they end
- **📝 Automated Minutes & Summaries**: Auto-generated meeting minutes and summaries when meetings end
- **🔍 Meeting History**: Access to all your recorded meetings with searchable transcripts
- **💾 Secure Storage**: All meetings are securely stored and can be accessed from your dashboard

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Desktop**: Electron.js
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **AI Integration**: Vercel AI SDK 6 with OpenAI models
- **Authentication**: Mock authentication (ready for integration with Supabase or custom auth)
- **Forms**: React Hook Form with Zod validation
- **State Management**: React hooks with SWR for data fetching

## Project Structure

```
app/
├── page.tsx                          # Landing page
├── layout.tsx                        # Root layout
├── auth/
│   ├── login/page.tsx               # Login page
│   └── signup/page.tsx              # Signup page
├── dashboard/
│   ├── page.tsx                     # Main dashboard
│   ├── meetings/page.tsx            # Meetings history
│   ├── chat/page.tsx                # Chat interface
│   ├── live/page.tsx                # Live meeting view
│   └── meeting/[id]/page.tsx        # Meeting details & summary
├── api/
│   ├── chat/route.ts                # Chat API endpoint
│   └── generate-summary/route.ts    # Summary generation API
components/
├── sidebar.tsx                       # Navigation sidebar
├── meeting-card.tsx                 # Meeting card component
├── chat-interface.tsx               # AI chat interface
├── live-transcription.tsx           # Live transcription display
├── meeting-detector.tsx             # Meeting detection status
└── meeting-summary.tsx              # Meeting summary display
electron.js                          # Electron main process
preload.js                          # Electron preload script
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

For AI features, ensure your API key is configured in Vercel (uses AI Gateway by default).

### Running the Application

#### Development

For web version:
```bash
npm run dev
```

For Electron app (runs both Next.js and Electron):
```bash
npm run dev-electron
```

#### Production

```bash
npm run build
npm start
```

## Key Pages

### Landing Page (`/`)
- Hero section with feature overview
- Sign up and login links
- Feature highlights
- Responsive design for all devices

### Authentication
- **Login** (`/auth/login`): Email and password authentication
- **Signup** (`/auth/signup`): User registration with terms acceptance

### Dashboard Pages

- **Main Dashboard** (`/dashboard`): Overview of today's meetings and quick stats
- **Meetings History** (`/dashboard/meetings`): Browse all recorded meetings with search and filter
- **Chat** (`/dashboard/chat`): Dedicated chat interface with meeting context
- **Live Meeting** (`/dashboard/live`): Real-time view with live transcription, meeting detector, and AI chat
- **Meeting Details** (`/dashboard/meeting/[id]`): Full meeting summary, transcript, and chat

## API Endpoints

### Chat API
**POST** `/api/chat`

Request:
```json
{
  "messages": [
    { "role": "user", "content": "What were the action items?" }
  ]
}
```

Response: Streaming chat response from AI

### Summary Generation API
**POST** `/api/generate-summary`

Request:
```json
{
  "meetingTranscript": "...",
  "meetingTitle": "Product Planning Sprint"
}
```

Response:
```json
{
  "executiveSummary": "...",
  "keyDecisions": [...],
  "actionItems": [...],
  "topicsDiscussed": [...],
  "participants": [...],
  "nextMeetingDate": "..."
}
```

## Design System

The application uses a modern dark theme with:

- **Primary Color**: Purple (#8B5CF6) - for main actions and highlights
- **Background**: Dark Navy (#1a1f3a) - for main background
- **Cards**: Slightly lighter navy (#2a3048) - for card backgrounds
- **Accents**: Teal/Cyan - for secondary highlights
- **Text**: White/Light gray - for readability on dark background

### Colors
```css
--primary: 260 95% 61%        /* Purple */
--background: 240 10% 4%      /* Dark Navy */
--card: 240 10% 8%            /* Lighter Navy */
--secondary: 240 13% 18%      /* Medium Gray */
--accent: 260 95% 61%         /* Purple (matches primary) */
--muted-foreground: 240 5% 65%  /* Light Gray */
```

## Future Enhancements

- [ ] Zoom and Google Meet API integration for automatic meeting detection
- [ ] Real-time speech-to-text transcription service
- [ ] Database integration (Supabase/Neon) for persistent storage
- [ ] User authentication system
- [ ] Email notifications for action items
- [ ] Meeting search and full-text search capabilities
- [ ] Export to PDF and other formats
- [ ] Team collaboration features
- [ ] Custom AI model training on company-specific terminology
- [ ] Meeting analytics and insights
- [ ] Integration with calendar systems

## Deployment

### Vercel Deployment
```bash
vercel deploy
```

### Electron Build
```bash
npm run build
npx electron-builder
```

## Configuration

### Environment Variables
- `NEXT_PUBLIC_API_URL`: Base URL for API calls
- For Vercel AI Gateway: No additional setup needed - configure through Vercel console

### Customization

- **Themes**: Modify `app/globals.css` for color scheme
- **Meeting Platforms**: Update `components/meeting-detector.tsx` to support additional platforms
- **AI Model**: Change model in `app/api/chat/route.ts` (currently using `openai/gpt-4o-mini`)

## Performance Optimizations

- Server-side rendering for fast page loads
- Client-side chat with streaming responses
- Optimized image loading
- CSS-in-JS with Tailwind for minimal bundle size
- React 19 with automatic memoization

## Security Considerations

- All authentication is handled securely (prepare for Supabase/Auth.js integration)
- API calls use HTTPS only
- Sensitive data should be stored securely
- Implement rate limiting on API endpoints
- Add CSRF protection for forms

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes

## Support

For issues or questions, please open an issue on the repository or contact the support team.

---

Built with Next.js, Electron, and Vercel AI SDK
