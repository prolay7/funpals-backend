# Funpals Backend

> Node.js + TypeScript REST API and real-time WebSocket server powering the **Funpals** social connection mobile app.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Verification Flow](#verification-flow)
- [Architecture Notes](#architecture-notes)
- [Postman Collection](#postman-collection)

---

## Overview

Funpals is a real-time social connection platform. This backend handles:

- **REST API** — user profiles, meetings, groups, chat, categories, search, goals, skills, issues, activities, materials, posts, questions, events (calendar), favorites, share feed, notifications
- **WebSocket** (Socket.IO) — live presence, 1-on-1 chat, group messaging, meeting invites, verification
- **Video / Audio Calls** — Stream.IO SDK with Google Meet fallback
- **Push Notifications** — Firebase Cloud Messaging (FCM) with persistent notification inbox
- **Scheduled Jobs** — BullMQ workers for meeting reminders
- **Identity Verification** — ephemeral photo-sharing flow via Cloudinary + Socket.IO
- **Social Feed** — global share feed + group-scoped internal shares
- **Discovery** — activity catalogue, materials library, open posts and questions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Language | TypeScript 5.8 |
| Framework | Express 5 |
| Real-time | Socket.IO 4 |
| Database | PostgreSQL + PostGIS |
| ORM | Drizzle ORM 0.43 |
| Cache / Presence | Redis 7 (ioredis) |
| Job Queue | BullMQ 5 |
| Video Calls | Stream.IO Node SDK |
| Push Notifications | Firebase Admin SDK 13 |
| Media Storage | Cloudinary 2 |
| Auth | JWT (jsonwebtoken) |
| File Uploads | Multer |
| Geolocation | LocationIQ API |
| Google Auth/Meet | googleapis 148 |

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js ≥ 18 | LTS recommended |
| PostgreSQL ≥ 14 | With PostGIS extension enabled |
| Redis ≥ 7 | Running locally or via URI |
| npm ≥ 9 | Comes with Node.js |

Enable PostGIS on your database:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## Installation

```bash
# Clone and enter the directory
cd FunpalsDev

# Install all dependencies
npm install

# Copy the environment template and fill in your values
cp .env.example .env
```

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ── Server ──────────────────────────────────────────────
PORT=3000

# ── Database ────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/Funpals

# ── Redis ───────────────────────────────────────────────
REDIS_URI=redis://localhost:6379

# ── JWT ─────────────────────────────────────────────────
JWT_SECRET=your-256-bit-random-secret

# ── Google OAuth + Calendar ─────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ── Cloudinary ──────────────────────────────────────────
CLOUD_NAME=your-cloudinary-cloud-name
API_KEY=your-cloudinary-api-key
API_SECRET=your-cloudinary-api-secret

# ── Stream.IO (Video Calls) ─────────────────────────────
STREAM_API_KEY=your-stream-api-key
STREAM_API_SECRET=your-stream-api-secret
STREAM_VIDEO_CALL_AVAILAIBLE=true
USER_TOKEN_VALIDITY_IN_SECONDS=3600
MAXIMUM_CALL_DURATION=3600

# ── LocationIQ (Geolocation) ────────────────────────────
LOCATION_IQ_KEY=your-locationiq-key
REVERSE_LOCATION_URL=https://us1.locationiq.com/v1/reverse
AUTOCOMPLETE_LOCATION_URL=https://us1.locationiq.com/v1/autocomplete

# ── Scheduled Meetings ──────────────────────────────────
# Extra minutes added to meeting duration for Stream call buffer
SCHEDULED_MEETING_BUFFER_TIME=10
```

---

## Running the Server

### Development

```bash
# Main API + Socket.IO server (auto-restarts on file change)
npm run dev

# BullMQ worker process (run in a separate terminal)
npm run dev:worker
```

### Production

```bash
# Compile TypeScript
npm run build

# Start compiled server
npm start

# Start compiled worker
npm run start:worker
```

> Both the **main server** and the **worker** must be running for scheduled meeting reminders to fire.

---

## Database Setup

Drizzle ORM manages the schema. Run migrations against your PostgreSQL database:

```bash
# Push schema to database (development)
npx drizzle-kit push

# Or run migration files in order
npx drizzle-kit migrate
```

### Seed Categories

After the schema is set up, seed the category hierarchy (3 levels deep) via the script endpoint:

```
GET /api/v1/insertCategories
```

This reads from `src/data/categories.ts` and inserts all categories into the database.

### Database Tables

#### Core Tables

| Table | Purpose |
|---|---|
| `users` | User accounts with PostGIS location + rich profile fields (`bio`, `can_do`, `cannot_do`, `interests`, `available_for`, `expertise_level`, `zip_code`, `age_range`, `gender`) + `notification_frequency` preference (`immediate` \| `batched` \| `daily`, default `batched`) |
| `conversations` | 1-on-1 chat threads |
| `messages` | 1-on-1 chat messages |
| `groups` | Group chat rooms |
| `group_members` | Group membership |
| `group_meetings` | Scheduled group meetings |
| `group_messages` | Group chat messages |
| `meetings` | Active public live meetings |
| `private_meetings` | 1-on-1 private call records |
| `categories` | Self-referential 3-level hierarchy |
| `userLikedCategories` | User ↔ category interest mapping |
| `likedUsers` | User bookmarks (social matching) |
| `verifications` | Identity verification records |
| `reports` | User reports |
| `skills` | User skills |
| `issues` | Community issues/problems |
| `goals` | Personal daily goals |
| `media` | Category-linked media content |

#### New Tables (v2)

| Table | Purpose |
|---|---|
| `notifications` | Persistent notification inbox (type, title, body, isRead) |
| `activity_categories` | Activity catalogue categories with icon |
| `activities` | Admin-seeded activities (title, image, address, external URL) |
| `user_activities` | User ↔ activity join status tracking |
| `materials` | Admin-fed materials: books, parks, trails, libraries |
| `open_posts` | Community posts (title + content, cursor-paginated feed) |
| `open_questions` | Community questions feed |
| `events` | Calendar events with optional group scope |
| `event_rsvps` | RSVP per user per event (`going` / `maybe` / `declined`) |
| `favorite_callers` | User-scoped favorite user bookmarks for quick-dial |
| `favorite_groups` | User-scoped favorite group bookmarks |
| `shares` | Share items — `internal` (to a group), `global` (public feed), or `external` (fb/ig/tw/li intent log) |

---

## Project Structure

```
src/
├── index.ts              ← Express + Socket.IO server entry point
├── worker.ts             ← BullMQ worker entry point (run separately)
├── constants.ts          ← App-level constants
│
├── controlers/           ← Business logic
│   ├── auth.ts           ← Sign-in, JWT middleware
│   ├── user.ts           ← Profile, presence, liked users, rich profile fields
│   ├── chat.ts           ← Conversations, messages
│   ├── group.ts          ← Groups, group messaging, group calls
│   ├── meeting.ts        ← Meeting invites, live meetings, verification gate
│   ├── categories.ts     ← Category hierarchy, user preferences
│   ├── issue.ts          ← Community issues CRUD
│   ├── goal.ts           ← User goals CRUD
│   ├── media.ts          ← Category media
│   ├── report.ts         ← User reporting
│   ├── search.ts         ← Targeted search (meetings, users, categories)
│   ├── globalSearch.ts   ← Cross-entity global search
│   ├── location.ts       ← GPS update, nearby users, autocomplete
│   ├── skillController.ts← User skills CRUD
│   ├── stream.ts         ← Stream.IO webhook handler
│   ├── verification.ts   ← Photo sharing, verification reports
│   ├── notification.ts   ← Notification inbox + createNotification() helper
│   ├── activity.ts       ← Activity catalogue (list, random, join)
│   ├── material.ts       ← Materials library (list, random)
│   ├── post.ts           ← Open posts feed (cursor-paginated)
│   ├── question.ts       ← Open questions feed (cursor-paginated)
│   ├── event.ts          ← Calendar events + RSVP
│   ├── favorite.ts       ← Favorite callers and groups (toggle)
│   └── share.ts          ← Share to group / global feed
│
├── routes/               ← Express routers (one per domain)
├── schema/               ← Drizzle table definitions (one per table)
├── socket/               ← Socket.IO server, event names, room keys
├── redis/                ← ioredis client + Redis key helpers
├── stream/               ← Stream.IO SDK client, channel, utilities
├── jobs/                 ← BullMQ queue + worker + job handlers
├── firebase/             ← Firebase Admin SDK + notification service
├── lib/                  ← DB connection, Cloudinary, JWT helpers, Google client
├── data/                 ← Static category seed data
├── enums/                ← TypeScript enums (Stream call types, roles)
└── scripts/              ← One-off DB seeding scripts
```

---

## API Reference

All endpoints are prefixed with `/api/v1`. Protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### 🔐 Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/signInWithoutToken` | — | Sign in / register with `{name, email, profilephoto}` |
| POST | `/exchangeTokens/google` | — | Google OAuth sign-in via `serverAuthCode` |

Both endpoints return `{ token, user, userLikedCategories }`.

---

### 👤 Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/user-details` | ✅ | Full profile + liked categories (bootstrap) |
| GET | `/user-liked-categories` | ✅ | Current user's interest categories |
| POST | `/user/like` | ✅ | Bookmark another user |
| DELETE | `/user/like` | ✅ | Remove bookmark |
| GET | `/get-user-likedUsers` | ✅ | All bookmarked users |
| PUT | `/update-details` | ✅ | Update name, cuss-word filter, special category opt-in, bio, canDo, cannotDo, interests, availableFor, expertiseLevel (1–5), zipCode, gender, agerange, notificationFrequency (`immediate` \| `batched` \| `daily`) |
| PUT | `/update-profile-photo` | ✅ | Upload new profile photo (multipart) |
| POST | `/update-fcm-token` | ✅ | Register Firebase push token |
| GET | `/get-other-common-users` | ✅ | Paginated users with shared interests |
| GET | `/user-profile/:userId` | ✅ | Public profile with skills, issues, categories |
| GET | `/user-calendar` | ✅ | Upcoming meetings across user's groups |
| GET | `/users` | ✅ | Online users (cursor pagination via Redis SSCAN) |

---

### 💬 Chat

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/messages` | ✅ | Messages for a conversation (paginated) |
| GET | `/conversation` | ✅ | Get or create 1-on-1 conversation |
| GET | `/getUserConversations` | ✅ | All conversations for current user |

---

### 📹 Meetings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/meetings` | ✅ | Paginated active public meetings |
| GET | `/getongoingmeetlink` | ✅ | Get Stream.IO token or Google Meet link |
| POST | `/invite-for-a-meet` | ✅ | Send live meeting invite to an online user |
| POST | `/notifyuser` | ✅ | FCM notification to an offline user (rate-limited: 5/hr) |
| POST | `/meeting/private` | ✅ | Send private 1-on-1 call request |

---

### 🗂️ Categories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/get-top-level-categories` | ✅ | Root categories |
| GET | `/get-child-categories` | ✅ | Children of a parent category |
| POST | `/update-liked-categories` | ✅ | Batch add/remove liked categories |
| GET | `/get-other-usersOfcategory` | ✅ | Other users in a category |
| GET | `/category/:id/meeting` | ✅ | Live meetings filtered by category |

---

### 👥 Groups (`/api/v1/group/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/get-group/:groupId` | ✅ | Group details + members + messages |
| POST | `/create` | ✅ | Create a group (optional photo upload) |
| POST | `/add-user` | ✅ | Add a user to a group |
| POST | `/join-leave` | ✅ | Toggle self join / leave |
| PATCH | `/update/:groupId` | ✅ | Update group info + photo |
| GET | `/messages/:groupId` | ✅ | Paginated group message history |
| GET | `/user` | ✅ | Groups user is / isn't a member of |
| GET | `/live-meetings/:groupId` | ✅ | Active meetings for a group |
| POST | `/schedule-meeting` | ✅ | Schedule future meeting (queues reminder) |
| PATCH | `/join-call` | ✅ | Join ongoing group call |
| POST | `/start-instant-call` | ✅ | Start instant Stream.IO group call |

---

### 🐛 Issues (`/api/v1/issue/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | All public issues (paginated) |
| POST | `/` | ✅ | Create issue |
| PUT | `/:id` | ✅ | Update issue |
| DELETE | `/:id` | ✅ | Delete issue |
| PATCH | `/:id/visibility` | ✅ | Toggle public / private |
| PATCH | `/:id/status` | ✅ | Change status (0=OPEN, 1=IN_PROGRESS, 2=RESOLVED, 3=CLOSED) |
| GET | `/user/:id` | ✅ | Issues by a specific user |
| GET | `/my-issues` | ✅ | Current user's own issues |
| GET | `/category/:id` | ✅ | Issues by category |

---

### 🎯 Goals (`/api/v1/goal/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/today` | ✅ | Returns the user's most recent goal for the login screen — **shows once per calendar day** (Redis TTL until midnight). Response: `{ goal, alreadyShown: bool }`. If `alreadyShown` is true, `goal` is `null` — mobile should skip the prompt |
| POST | `/` | ✅ | Create goal |
| GET | `/user` | ✅ | All goals for current user |
| DELETE | `/:id` | ✅ | Delete goal |
| PATCH | `/:id` | ✅ | Toggle goal completion |

---

### 🛠️ Skills

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/add-user-skill` | ✅ | Add a skill |
| PUT | `/user-skill/:skillId` | ✅ | Update a skill |
| DELETE | `/user-skill/:skillId` | ✅ | Delete a skill |
| GET | `/user-skills` | ✅ | All skills of current user |

---

### 🔍 Search

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/global-search` | ✅ | Unified search — pass `searchQuery=` plus one boolean flag to pick the type (see below) |
| GET | `/search/meetings?searchQuery=` | ✅ | Search live meetings |
| GET | `/search/categories?searchQuery=` | ✅ | Search categories |
| GET | `/search/users?searchQuery=` | ✅ | Search users by name |

**`/global-search` type flags** — pass exactly one as `=true`:

| Flag | Searches |
|---|---|
| `isUserSearch=true` | Users by name (includes live Redis status) |
| `isGroupSearch=true` | Groups by name + description |
| `isCategorySearch=true` | Categories by name + details |
| `isIssuesSearch=true` | Public issues by title + description |
| `isSkillSearch=true` | Skills by title + description |
| `isMeetingSearch=true` | Active meetings by title + description |
| `isActivitySearch=true` | Active activities by title + description (includes `categoryName`) |
| `isMaterialSearch=true` | Active materials by title + description (includes `category`, `externalUrl`, `address`) |

All types support `page=` (default 1). Page size is controlled by the `GLOBAL_SEARCH_LIMIT` env var (default 10). Responses include `{ data, hasMore, nextPage }`.

---

### 📍 Location (`/api/v1/location/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/suggestions?query=` | ✅ | Location autocomplete (LocationIQ) |
| PATCH | `/update` | ✅ | Update GPS coordinates + display name |
| GET | `/nearby?radius=` | ✅ | Nearby users via PostGIS ST_DWithin |

---

### 🖼️ Media (`/api/v1/media/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | — | Add a media item |
| GET | `/category/:categoryId` | ✅ | Get media by category |

---

### ✅ Verification

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/shareimages` | ✅ | Upload 2 photos → share via Socket.IO → photos on Cloudinary |
| POST | `/verification` | ✅ | Submit verification result → deletes photos from Cloudinary |

---

### 🚩 Report

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/report-user` | ✅ | Report a user with a reason |

---

### 🔔 Notifications (`/api/v1/notifications/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | Paginated notification inbox (`?page=&limit=`), ordered newest first |
| PATCH | `/read-all` | ✅ | Mark all unread notifications as read |

> **Internal helper:** `createNotification(userId, type, title, body, data?)` — persists the record to the `notifications` table and dispatches an FCM push **only when the user's `notificationFrequency` is `immediate`**. For `batched` or `daily`, the record is saved silently (ready for a future digest job).

---

### 🎯 Activities (`/api/v1/activities/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | List all active activities (`?category=` optional filter) |
| GET | `/random` | ✅ | One random active activity — powers the mobile bubble widget |
| GET | `/:id` | ✅ | Activity detail by ID |
| POST | `/:id/join` | ✅ | Mark current user as `ongoing` for this activity (UPSERT) |

> Activities and their categories are admin-seeded. The `activity_categories` table stores names + icons.

---

### 📚 Materials (`/api/v1/materials/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | List all active materials (`?category=` optional: books, parks, trails, libraries) |
| GET | `/random` | ✅ | One random active material — powers the bubble widget |

> Materials are admin-fed read-only content. Sorted by `sort_order ASC`.

---

### 📝 Posts (`/api/v1/posts/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | Cursor-paginated feed (`?cursor=<lastId>`), 20 per page, newest first |
| POST | `/` | ✅ | Create a post (`title` max 120 chars, `content` max 2000 chars, `tags` optional) |

---

### ❓ Questions (`/api/v1/questions/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | Cursor-paginated feed (`?cursor=<lastId>`), 20 per page, newest first |
| POST | `/` | ✅ | Create a question (`question` max 500 chars, `tags` optional) |

---

### 📅 Events — Calendar (`/api/v1/events/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | Events where you're creator, RSVP'd, or group-wide. Includes `myRsvp` field. Ordered by `startsAt ASC` |
| POST | `/` | ✅ | Create an event (`title`, `startsAt`, `endsAt` required; `groupId`, `isGroup`, `location`, `description` optional) |
| GET | `/:id` | ✅ | Event detail + full RSVP list with attendee names and photos |
| POST | `/:id/rsvp` | ✅ | Set/update RSVP status: `going` \| `maybe` \| `declined` (UPSERT) |

---

### ⭐ Favorites (`/api/v1/favorites/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/callers` | ✅ | Toggle `{ targetUserId }` as favorite caller — returns `{ favorited: true/false }` |
| GET | `/callers` | ✅ | List favorite callers with name, photo, and live Redis online status |
| POST | `/groups` | ✅ | Toggle `{ groupId }` as favorite group — returns `{ favorited: true/false }` |
| GET | `/groups` | ✅ | List favorite groups with name, description, and image |

> Favorites are distinct from `likedUsers` (social matching). Favorites are quick-access bookmarks for people and groups you frequently contact.

---

### 🔗 Share (`/api/v1/share/`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/internal` | ✅ | Share content to a group (`{ groupId, content, category? }`). Also emits `groupMessageReceived` socket event |
| GET | `/global` | ✅ | Cursor-paginated global public feed (`?category=&cursor=<lastId>`) with author info |
| POST | `/global` | ✅ | Post content to global feed (`{ content, category? }`, max 2000 chars) |
| POST | `/external` | ✅ | Log an external share intent (`{ content, category?, platform? }`). `platform` must be one of `facebook`, `instagram`, `twitter`, `linkedin`. Backend records with `shareType = 'external'`; mobile opens the native share sheet independently |

---

### ⚙️ Utilities

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/stream/webhook` | Signature | Stream.IO call lifecycle webhooks |
| GET | `/api/v1/insertCategories` | — | Seed categories into the database |
| GET | `/health` | — | Server health check |

---

## WebSocket Events

Connect with Socket.IO and pass a JWT in the handshake header:

```js
const socket = io('http://localhost:3000', {
  extraHeaders: { token: '<jwt>' }
});
```

### Events: Client → Server

| Event | Payload | Description |
|---|---|---|
| `presence::update` | `{ status: 'online' \| 'offline' \| 'busy' }` | Update own status |
| `meetinviteresponcefromtarget` | `{ isAccepted: boolean }` | Accept or decline a meeting invite |
| `sendprivatemessage` | `{ receiver, conversationId, content }` | Send a 1-on-1 chat message |
| `joinGroupRoom` | `groupId: number` | Join a group chat Socket.IO room |
| `leaveGroupRoom` | `groupId: number` | Leave a group chat room |
| `broadCastGroupMessage` | `{ groupId, content, senderName, senderProfileImage }` | Send a group message |
| `availabilityUpdate` | `nextAvailability: number` | Update next availability timestamp |

### Events: Server → Client

| Event | Payload | Description |
|---|---|---|
| `incomingmewwtrequest` | `{ creatorUserId, userName, profilePhoto, meetTitle, meetDesc, meetCategory, isCussWordOn, isPrivate }` | Incoming meeting invitation |
| `meetaccepted` | `{ name, profilephoto }` | Target accepted your invite |
| `meetdeclined` | `{ name, profilephoto }` | Target declined your invite |
| `meetlinkortoken` | `{ case, callType, callEntryDetails \| meetLink }` | Meeting join info (case 4 = ready) |
| `privatemessagereceived` | `{ message }` | New 1-on-1 chat message |
| `groupMessageReceived` | `{ message }` | New group chat message |
| `instantMeeting` | `{ groupId, callId, ... }` | Instant group call started |
| `presence::update` | `{ userId, status }` | A user's presence changed (broadcast to all) |
| `imagereceived` | `{ images, ageRange, gender }` | Verification photos received from friend |
| `verification-report` | `{ verified: boolean }` | Your verification result |
| `servererror` | `{ message }` | Error notification |

---

## Verification Flow

Before two users can meet, they may need to verify each other's identity. The process uses ephemeral Cloudinary uploads — photos are **deleted immediately** after the verification report is submitted.

### Case Rules

| Case | Condition | What Happens |
|---|---|---|
| **1** | Both creator and target are unverified | Both must share a live photo + masked government ID with each other |
| **2** | Creator is unverified, target is verified | Creator must share photos with target for verification |
| **3** | Creator is verified, target is unverified | Target must share photos; creator reviews and verifies |
| **4** | Both are verified (or existing verification record found) | Meeting proceeds immediately — call link / token sent to both |

### UI Copy (for reference)

**Case 1 — Both unverified**
- *Main:* You and `{target name}` both are unverified
- *Sub:* Before proceeding to meet, you need to upload your live photo and a masked government ID. It will be shared with `{target name}`. We do not store your photo on our servers.

**Case 2 — You are unverified**
- *Main:* You are unverified
- *Sub:* Before proceeding to meet, upload your live photo and a masked government ID to share with `{target name}`. We do not store your photo on our servers.

**Case 3 — Friend is unverified**
- *Main:* `{target name}` is unverified
- *Sub:* Help `{target name}` get verified — they will share their photo and masked government ID with you. You just need to review and verify.

**Case 4 — Both verified**
- *Main:* Your meeting is ready to start
- *Sub:* Click the link below to begin

---

## Architecture Notes

### Presence
User online/offline/busy status is stored entirely in **Redis**, not the database. This gives sub-millisecond reads. The `online_users` Redis set enables efficient cursor-based pagination via `SSCAN`.

### Multi-Device Support
Each user can have multiple simultaneous socket connections (phone + tablet etc). Redis tracks all socket IDs per user in a set. A user only goes `offline` when their last socket disconnects (`SCARD = 0`).

### Meeting State Machine
Meeting invite state is stored in a **Redis hash** on the target user's key. When accepted, the state is consumed and deleted. This means invite state is non-persistent and lost if Redis restarts — by design, to avoid stale invites.

### Verification Photos are Ephemeral
Photos uploaded for verification are:
1. Uploaded to Cloudinary (temporary storage)
2. URLs sent to the other user via Socket.IO
3. **Deleted from Cloudinary** immediately after the verification report is submitted

They are never permanently stored on any server.

### BullMQ Worker is a Separate Process
The job worker (`src/worker.ts`) runs in its own Node.js process to avoid blocking the main API. Both processes share the same Redis connection. The worker fires meeting reminder notifications 15 minutes before scheduled group meetings and creates the Stream.IO call room.

### Stream.IO ↔ Google Meet Fallback
If `STREAM_VIDEO_CALL_AVAILAIBLE` is `false` in the environment, the server falls back to creating a **Google Calendar event** with a Meet link using the user's stored Google OAuth refresh token.

---

## Postman Collection

A full Postman collection covering all **95 requests across 25 folders** is included:

```
FunpalsDev.postman_collection.json
```

Import it into Postman, then run **Sign In (Simple)** first — the test script automatically saves the JWT to the `token` collection variable so all subsequent requests are authenticated.

### Collection Variables

| Variable | Default | Description |
|---|---|---|
| `base_url` | `http://localhost:3000` | Server base URL |
| `token` | _(auto-filled)_ | JWT — set automatically by Sign In requests |
| `userId` | `1` | Target user ID for user-specific requests |
| `groupId` | `1` | Group ID for group requests |
| `meetId` | `1` | Meeting ID |
| `issueId` | `1` | Issue ID |
| `goalId` | `1` | Goal ID |
| `skillId` | `1` | Skill ID |
| `categoryId` | `1` | Category ID |
| `activityId` | _(auto-filled)_ | Activity ID — set by Get Random Activity |
| `eventId` | _(auto-filled)_ | Event ID — set by Create Event |
| `postId` | _(auto-filled)_ | Post ID — set by Create Post |
| `questionId` | _(auto-filled)_ | Question ID — set by Create Question |

### Folders

| Folder | Requests |
|---|---|
| 🔐 Auth | 2 |
| 👤 Users | 12 |
| 💬 Chat | 3 |
| 📹 Meetings | 5 |
| 🗂️ Categories | 5 |
| 👥 Groups | 11 |
| 🐛 Issues | 9 |
| 🎯 Goals | 5 |
| 🛠️ Skills | 4 |
| 🔍 Search | 4 |
| 📍 Location | 3 |
| 🖼️ Media | 2 |
| ✅ Verification | 2 |
| 🚩 Report | 1 |
| 🎬 Stream Webhook | 1 |
| ⚙️ Scripts (Admin) | 1 |
| 🔔 Notifications | 2 |
| 🎯 Activities | 4 |
| 📚 Materials | 2 |
| 📝 Posts | 2 |
| ❓ Questions | 2 |
| 📅 Events (Calendar) | 4 |
| ⭐ Favorites | 4 |
| 🔗 Share | 4 |
| ❤️ Health | 1 |
