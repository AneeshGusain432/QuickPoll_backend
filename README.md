# QuickPoll — Backend

Express + TypeScript API powering QuickPoll: a poll platform with mandatory/optional
questions, anonymous or authenticated responses, poll expiry, creator analytics,
result publishing, and real-time updates via Socket.io.

## Tech stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Real-time**: Socket.io
- **Auth**: JWT (access + refresh tokens), httpOnly cookies

## Features

- Create polls with multiple single-select questions
- Mark questions as mandatory or optional (enforced server-side, not just in the UI)
- Anonymous or authenticated response modes, with dedupe enforced at the database
  level (partial unique indexes) so double-submits can't slip through a race condition
- Poll expiry — lazily computed on read, no cron job required
- Creator-only analytics dashboard: per-question option counts, skip rates,
  respondent list (authenticated polls only)
- Publish/unpublish flow — results only become public once the creator explicitly
  publishes, and only after the poll has closed
- Live updates over Socket.io when a new response is submitted or a poll is published

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm (or npm/yarn — adjust commands accordingly)

### Install

```bash
pnpm install
```

### Environment variables

Create a `.env` file in the project root:

```env
PORT=8000
DATABASE_URL=postgres://user:password@localhost:5432/quickpoll

JWT_ACCESS_TOKEN_SECRET=your-access-secret
JWT_REFRESH_TOKEN_SECRET=your-refresh-secret

CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Database setup

```bash
pnpm drizzle-kit generate   # generate migration files from schema.ts
pnpm drizzle-kit migrate    # apply migrations to your database
```

### Run

```bash
pnpm dev      # development, with hot reload
pnpm build    # compile TypeScript
pnpm start    # run the compiled build
```

Server starts on `http://localhost:8000` (or whatever `PORT` is set to). Socket.io
attaches to the same HTTP server, no separate port needed.

## API overview

All routes are prefixed `/api/v1`.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | — | Create an account |
| POST | `/auth/signin` | — | Log in |
| POST | `/auth/refresh/token` | — | Refresh an expired access token |
| POST | `/auth/logout` | ✅ | Log out, clears auth cookies |
| GET | `/auth/me` | ✅ | Get the current logged-in user |
| POST | `/poll/create` | ✅ | Create a poll with questions and options |
| GET | `/poll/list` | ✅ | List the current user's polls (paginated) |
| GET | `/poll/get/poll/:id` | ✅ | Get a poll's structure (creator only, no vote data) |
| GET | `/poll/get/poll/analytics/:id` | ✅ | Get a poll's full analytics (creator only) |
| GET | `/poll/get/public/poll/:id` | — | Public poll view — answer form or published results |
| POST | `/poll/submit/poll/response/:id` | optional | Submit a response (auth required only if the poll requires it) |
| PATCH | `/poll/publish/:id` | ✅ | Publish a poll's final results (only once expired) |
| DELETE | `/poll/delete/:id` | ✅ | Delete a poll (drafts only) |

## Socket.io events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `joinPoll` | client → server | `pollId` | Join a poll's update room |
| `leavePoll` | client → server | `pollId` | Leave a poll's update room |
| `poll:update` | server → client | `{ pollId, responseCount }` | New response submitted |
| `poll:published` | server → client | `{ pollId, status }` | Poll results published |

## Project structure

```
src/
  app/
    module/
      poll/         # poll controller, service, validation
      auth/         # auth controller, service, validation
  common/
    db/             # Drizzle schema + client
    socket/         # Socket.io setup
    utils/          # ApiError, ApiResponse, token helpers
  server.ts         # entry point — http server + socket init
```
