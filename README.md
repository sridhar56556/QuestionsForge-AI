# VedaAI - AI Assessment Creator

A full-stack application to intelligently generate Question Papers from subject guidelines and reference materials using AI (Claude API by default, fallback to Gemini in AI Studio).

## Architecture

```text
    [ Frontend (Vite+React) ] <---WebSocket---> [ Backend (Express) ] 
               |                                       |     |
            REST API                                  /      |
               |                                     /       v
       [ Next-Gen Claude API ]           [ BullMQ / Redis ] -> PDF Generator (Puppeteer)
                                                     |
                                                [ MongoDB ]
```

## Running Locally

1. Start background services using Docker Compose:
\`\`\`bash
docker-compose up -d
\`\`\`

2. Set your API Keys in \`.env\`:
\`\`\`env
ANTHROPIC_API_KEY="your_claude_key" # Will fallback to GEMINI_API_KEY if absent
MONGODB_URI="mongodb://localhost:27017/vedaai"
REDIS_URL="redis://localhost:6379"
\`\`\`

3. Install & Start Server
\`\`\`bash
npm install
npm run dev
\`\`\`

*(Note: The AI Studio environment automatically handles missing MongoDB/Redis by utilizing a graceful "Preview Mode" with in-memory fallbacks).*

## Folder Structure
- \`backend/\` - Express routes, Mongoose models, BullMQ workers.
- \`src/\` - React frontend (adapted to Vite SPA pattern instead of Next.js for unified local/cloud deployment).
- \`server.ts\` - Full-stack boot script.
