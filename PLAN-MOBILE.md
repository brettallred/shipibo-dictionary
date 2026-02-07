# Shipibo Icaro Learning Platform — iOS Plan

## Tech Stack
- **Framework:** Native SwiftUI
- **Local Storage:** SwiftData (mirrors D1 schema)
- **Sync:** Background sync with Cloudflare Workers API
- **Auth:** Google Sign-In SDK for iOS
- **Audio:** AVAudioRecorder / AVAudioPlayer
- **Architecture:** Offline-first, local-first write queue

## Phases

**Phase 1: iOS Project Setup + Local Data**
- Xcode project, SwiftUI
- Bundle dictionary + icaro JSON locally
- SwiftData models mirroring D1 schema
- Tab navigation (Dictionary, Icaros, Review, Profile)

**Phase 2: iOS Dictionary + Icaro Views**
- Native search (fast, local, no network needed)
- Entry detail view
- Icaro view with stanza/phrase breakdown
- Morphological color coding in native UI
- Audio playback with cached recordings

**Phase 3: iOS Auth + Sync Engine**
- Google Sign-In SDK for iOS
- Local-first write queue
- Background sync when connectivity detected
- Conflict resolution (last-write-wins, timestamp-based)

**Phase 4: iOS User Features**
- Icaro progress tracking with stanza position
- Study bookmarks (phrases, words, stanzas)
- Review mode with native card-flip animations
- Comfort tracking with spaced repetition

**Phase 5: iOS Audio**
- Record icaros in-app (AVAudioRecorder)
- Local playback cache
- Upload queue — sync recordings when back online

**Phase 6: iOS AI Chat**
- Chat interface (online-only, graceful offline message)
- Cache previous conversations locally for reference

**Phase 7: App Store Submission**
- TestFlight beta
- App Store assets (screenshots, description, privacy policy)
- Review + launch
