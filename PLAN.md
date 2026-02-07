# Shipibo Icaro Learning Platform — Implementation Plan

## Tech Stack
- **Frontend (Web):** Existing static site on Cloudflare Pages (vanilla JS)
- **Backend API:** Cloudflare Workers + Hono framework
- **Database:** Cloudflare D1 (SQLite at edge) + Drizzle ORM
- **Object Storage:** Cloudflare R2 (audio files)
- **AI:** Workers AI or Anthropic API via Workers
- **Auth Sessions:** Cloudflare KV
- **iOS:** Native SwiftUI + SwiftData, offline-first

## Data Model

### Users
- id, google_id, email, name, avatar_url
- role (user | admin)
- created_at, updated_at

### IcaroProgress
- user_id → Users
- icaro_id (references static icaro data)
- current_stanza_idx (their place in the song)
- current_phrase_idx (optional granularity within stanza)
- status (active | completed)
- last_accessed_at

### StudyBookmarks
- user_id → Users
- type (stanza | phrase | word)
- icaro_id (for stanza/phrase types)
- stanza_idx (for stanza type)
- phrase_idx (for phrase type)
- entry_id (for word type)
- comfort (new | learning | familiar | mastered)
- last_reviewed_at

### Feedback
- user_id → Users
- target_type (entry | icaro | phrase), target_id
- category (incorrect | missing | suggestion)
- message
- status (pending | reviewed | resolved | dismissed)
- admin_notes

### AudioRecordings
- id
- icaro_id (required — always tied to an icaro)
- uploaded_by → Users
- singer_name (the person actually singing, may differ from uploader)
- singer_bio (optional — e.g., "Maestro from Pucallpa")
- r2_key (path in R2 bucket)
- duration_seconds
- status (pending | approved | rejected)
- sort_order (1-5, set by admin on approval)
- created_at
- **Constraint:** Max 5 approved recordings per icaro

### IcaroContributions
- user_id → Users
- title, content (the icaro text)
- status (draft | submitted | approved | rejected)
- admin_notes
- created_at, updated_at

### ChatMessages
- user_id → Users
- session_id, role (user | assistant)
- content
- created_at

## API Endpoints

### Auth
- POST /api/auth/google — Exchange Google token for session
- GET /api/auth/me — Get current user
- POST /api/auth/logout — Clear session

### Icaro Progress
- GET /api/progress — Get all user progress
- PUT /api/progress/:icaro_id — Update progress (stanza position)
- DELETE /api/progress/:icaro_id — Reset progress

### Study Bookmarks
- GET /api/bookmarks — Get all bookmarks
- POST /api/bookmarks — Create bookmark
- PUT /api/bookmarks/:id — Update comfort level
- DELETE /api/bookmarks/:id — Remove bookmark

### Feedback
- POST /api/feedback — Submit feedback
- GET /api/feedback — List feedback (admin)
- PUT /api/feedback/:id — Update feedback status (admin)

### Audio
- POST /api/audio — Upload audio file
- GET /api/audio?icaro_id=X — List recordings for an icaro
- GET /api/audio/:id/url — Get signed URL for playback
- DELETE /api/audio/:id — Delete recording
- PUT /api/audio/:id — Update status/sort_order (admin)

### Contributions
- POST /api/contributions — Create/save icaro contribution
- GET /api/contributions — List user's contributions
- PUT /api/contributions/:id — Update contribution
- DELETE /api/contributions/:id — Delete contribution

### Chat
- POST /api/chat — Send message, get AI response
- GET /api/chat/sessions — List chat sessions
- GET /api/chat/sessions/:id — Get chat history

## Phases

### Backend + Web

**Phase 1: Foundation**
- Cloudflare Worker project with Hono
- D1 database setup with Drizzle ORM
- Schema + migrations for all tables
- Google OAuth flow
- Session management with KV
- Auth middleware

**Phase 2: Icaro Progress**
- Bookmark icaros, track stanza position
- Resume learning from where you left off
- Progress API endpoints
- Web UI: bookmark button on icaros, resume from dashboard

**Phase 3: Study Bookmarks**
- Save phrases, words, stanzas from any view
- Bookmark API endpoints
- Web UI: bookmark buttons on entries, phrases, stanzas

**Phase 4: Review Mode**
- Dedicated study view with card-flip interface
- Shipibo on front, breakdown/definition on back
- Comfort tracking (new → learning → familiar → mastered)
- Filter by type, by icaro, by comfort level
- Prioritize unreviewed and new items

**Phase 5: Feedback**
- Report incorrect entries/phrases
- Category selection + free text
- Admin review queue
- Web UI: "Report issue" button on entries and phrases

**Phase 6: Audio**
- R2 bucket setup
- Upload endpoint with file validation (mp3/m4a/wav)
- Singer name + bio fields
- Signed URL playback
- Admin moderation (approve/reject/reorder)
- Max 5 approved per icaro
- Web UI: audio player section on icaro detail view

**Phase 7: Contributions**
- Icaro text editor
- Draft/save/submit workflow
- Admin review + approve/reject
- Web UI: contribution editor page

**Phase 8: AI Chat**
- Workers AI or Anthropic API integration
- Dictionary + icaro data as context (RAG pattern)
- Chat history persistence
- Web UI: chat panel

**Phase 9: Web Polish**
- PWA updates for new features
- Service worker updates
- Responsive design for new views
- Spaced repetition algorithm for card review (SM-2 or similar) — schedule cards based on comfort level and time since last review, replacing simple sequential deck

**Phase 10: Icaro Publishing Pipeline**
- Migrate existing icaros from static JSON into D1 `icaros` table
- API endpoints: GET /api/icaros (public list), GET /api/icaros/:id (detail)
- Site fetches icaros from API instead of static JSON
- Admin "Publish" action on approved contributions → creates icaro record in D1
- Published icaros appear in the main icaros list alongside original extracted icaros
- Admin can edit/unpublish community icaros

### iOS (Native, Offline-First)

**Phase 11: iOS Project Setup + Local Data**
- Xcode project, SwiftUI
- Bundle dictionary + icaro JSON locally
- SwiftData models mirroring D1 schema
- Tab navigation (Dictionary, Icaros, Review, Profile)

**Phase 12: iOS Dictionary + Icaro Views**
- Native search (fast, local, no network needed)
- Entry detail view
- Icaro view with stanza/phrase breakdown
- Morphological color coding in native UI
- Audio playback with cached recordings

**Phase 13: iOS Auth + Sync Engine**
- Google Sign-In SDK for iOS
- Local-first write queue
- Background sync when connectivity detected
- Conflict resolution (last-write-wins, timestamp-based)

**Phase 14: iOS User Features**
- Icaro progress tracking with stanza position
- Study bookmarks (phrases, words, stanzas)
- Review mode with native card-flip animations
- Comfort tracking

**Phase 15: iOS Audio**
- Record icaros in-app (AVAudioRecorder)
- Local playback cache
- Upload queue — sync recordings when back online

**Phase 16: iOS AI Chat**
- Chat interface (online-only, graceful offline message)
- Cache previous conversations locally for reference

**Phase 17: App Store Submission**
- TestFlight beta
- App Store assets (screenshots, description, privacy policy)
- Review + launch
