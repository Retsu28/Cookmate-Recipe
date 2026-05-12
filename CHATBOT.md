# CookMate AI Chatbot

## Overview

The CookMate AI Chatbot is a floating assistant widget available across the web and mobile applications. It provides users with quick access to cooking tips, ingredient substitutions, and general kitchen assistance.

**Current Status:** Fully integrated with the live Gemini AI backend. Conversations are persisted in PostgreSQL, user pantry and dietary restrictions are injected as context, and rate limiting is enforced at the API layer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         WEB (React)                          │
│  ┌─────────────────┐      ┌──────────────────────────────┐  │
│  │  AIChatContext  │─────▶│      AIChatWidget.tsx        │  │
│  │   (State Mgmt)  │      │  - Floating FAB button       │  │
│  └─────────────────┘      │  - Chat panel UI             │  │
│                           │  - Message history             │  │
│                           │  - Text input                  │  │
│                           └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     MOBILE (React Native)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           AIAssistantWidget.js                        │  │
│  │  - Swipeable floating FAB                             │  │
│  │  - PanResponder for drag-to-hide                      │  │
│  │  - Chat panel with theme support                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                        │
│  POST /api/chat        → chatController → geminiService      │
│  GET  /api/chat/history → chatController → chatService       │
│  chatService.js  — pantry, restrictions, DB history          │
│  geminiService.js — Gemini multi-model chat + fallback       │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

| File | Purpose |
|------|---------|
| `src/context/AIChatContext.tsx` | React context for chat open/close state |
| `src/components/AIChatWidget.tsx` | Web floating chat widget UI |
| `src/services/chatService.ts` | Frontend API client for chat endpoints |
| `mobile/src/components/AIAssistantWidget.js` | Mobile floating chat widget UI |
| `api/src/routes/chat.js` | Chat routes with two-tier rate limiting |
| `api/src/controllers/chatController.js` | Request handling, context building, Gemini orchestration |
| `api/src/services/chatService.js` | DB: pantry, restrictions, history, saveMessage |
| `api/src/services/geminiService.js` | Gemini multi-model fallback, chat + image analysis |

---

## Web Implementation

### AIChatContext.tsx
Manages global chat visibility state:
- `isOpen`: boolean state
- `openChat()`, `closeChat()`, `toggleChat()`: state mutators

### AIChatWidget.tsx
Located at `src/components/AIChatWidget.tsx`.

**Features:**
- Fixed-position floating action button (bottom-right)
- Animated transitions (Framer Motion)
- Collapsible chat panel (500px height, max-w-96 width)
- Message history with user/assistant bubbles
- Typing indicator skeleton
- Orange gradient theming matching CookMate brand

**State Management:**
```typescript
const [messages, setMessages] = useState([
  { role: 'assistant', content: "Hi! I'm your CookMate AI assistant..." }
]);
const [input, setInput] = useState('');
const [isReplying, setIsReplying] = useState(false);
```

**Response Behavior:**
Sends the user message plus the last 10 history messages to Gemini. The system prompt is built per-request with the user's live pantry ingredients, dietary restrictions, and top matching recipes. Responses are saved to `chat_conversations` in PostgreSQL.

---

## Mobile Implementation

### AIAssistantWidget.js
Located at `mobile/src/components/AIAssistantWidget.js`.

**Features:**
- Floating action button with drag-to-hide (PanResponder)
- KeyboardAvoidingView for input handling
- Theme-aware styling via `useAppTheme()`
- Swipe gesture: drag left to hide, tap hidden edge to show
- Same mock response behavior as web

**Constants:**
```javascript
const TAB_BAR_CLEARANCE = 96;  // Clearance above bottom nav
const FAB_SIZE = 52;
const FAB_RIGHT = 20;
```

---

## Integration Points

### App.tsx
```typescript
<AIChatProvider>
  <PlannerReminderBridge />
  <Routes>...</Routes>
  <Toaster />
  <InstallPrompt />
</AIChatProvider>
```

### Layout.tsx
The chat widget is rendered globally within the layout:
```typescript
<AIChatWidget />  // Line 278
```

### Dashboard.tsx
Dashboard includes a promotional card with "Start Conversation" button:
```typescript
const { openChat } = useAIChat();
<Button onClick={openChat}>Start Conversation</Button>
```

---

## Backend AI Services

### geminiService.js
Located at `api/src/services/geminiService.js`.

**Purpose:** AI image analysis for the AI Camera feature (NOT chatbot).

**Functions:**
- `generateGeminiContent()` - Analyzes food images
- `selectRecipeWithGeminiRAG()` - Recipe RAG selection
- `geminiErrorPayload()` - Error handling

**Configuration:**
```javascript
const DEFAULT_GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];
```

**Chat functions:**
- `generateChatResponse()` — multi-model Gemini chat with history, system prompt, 45s timeout, 500 token output cap
- `geminiErrorPayload()` / `isGeminiQuotaError()` — error classification for quota, timeout, safety, and key errors

---

## Current Limitations

1. **In-memory rate limit counters** — reset on server restart; Redis would be needed for multi-instance persistence
2. **Single conversation per user** — `chat_conversations` has a unique constraint on `user_id`; multi-thread support is a future enhancement
3. **Mobile chatbot not yet integrated** — `AIAssistantWidget.js` still uses mock responses; web is fully live

---

## Future Enhancement Path

1. **Mobile AI integration** — connect `AIAssistantWidget.js` to `POST /api/chat`
2. **Redis rate-limit store** — persist counters across restarts and horizontal scale-outs
3. **Multi-conversation support** — allow users to have separate named chat threads
4. **Streaming responses** — use Gemini streaming API for real-time token output

---

## Styling

**Web Theme:**
- Primary: Orange gradient (`orange-gradient` class)
- User bubbles: `bg-orange-500 text-white`
- Assistant bubbles: `bg-orange-50 text-stone-900`
- Border radius: rounded-2xl, rounded-3xl for container

**Mobile Theme:**
- Dynamic colors from `useAppTheme()`
- Supports dark mode
- Shadows and elevation for depth

---

## Usage

**To open programmatically:**
```typescript
import { useAIChat } from '@/context/AIChatContext';

function MyComponent() {
  const { openChat } = useAIChat();
  return <Button onClick={openChat}>Ask AI</Button>;
}
```

**To check if chat is open:**
```typescript
const { isOpen } = useAIChat();
```

---

*Last updated: May 2026 — live Gemini backend, rate limiting, PostgreSQL persistence*
