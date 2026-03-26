<p align="center">
	<img src="app/favicon.ico" alt="WHISPXR favicon" width="48" height="48" /> 
</p>

<h1 align="center">WHISPXR</h1>

WHISPXR is a private real-time messaging web app built with Next.js and Firebase.

It focuses on:
- real-time chat updates
- inactivity-aware chat session reset
- hybrid encryption workflow for session keys
- friend request to chat lifecycle

## Website Overview 🌐

### What Users Can Do ✨
- Register and log in
- Search users and send friend requests
- Accept requests and automatically create chat relationships
- Exchange real-time messages
- See user presence status (online/offline)
- Recover to the canonical active chat after expiry/reset flow

### Core Stack 🧱
- Next.js 16 (App Router) + React 19 + TypeScript
- Firebase Client SDK (Auth, Firestore, Realtime Database)
- Firebase Admin SDK (server actions)
- Tailwind CSS 4
- Framer Motion

<!-- ## Image Template (for README screenshots)

Use this template to add visuals after each feature is finalized.

```md
## Screenshots

### Landing Page
![Landing Page](docs/images/landing-page.png)

### Login
![Login](docs/images/login.png)

### Chat List
![Chat List](docs/images/chat-list.png)

### Chat Room
![Chat Room](docs/images/chat-room.png)

### Settings
![Settings](docs/images/settings.png)
```

Recommended image folder:

```text
docs/
	images/
		landing-page.png
		login.png
		chat-list.png
		chat-room.png
		settings.png
``` -->

## Project Structure (High Level) 🗂️

```text
app/
	actions/         # server actions (chat/session/friend logic)
	chat/            # chat pages and layout
	components/      # UI components
	login/ register/ # auth routes
lib/
	context/         # auth/chat/session providers
	crypto/          # encryption helpers (session key, RSA/AES)
	firebase/        # client/admin firebase setup
	db/              # IndexedDB helpers
```

## Setup Instructions ⚙️

### 1) Prerequisites 📋
- Node.js 20+
- npm 10+ (or compatible package manager)
- Firebase project with Firestore + Realtime Database enabled

### 2) Install Dependencies 📦

```bash
npm install
```

### 3) Configure Environment Variables 🔐

Create `.env.local` in the project root:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Optional mailer (forgot-password flow)
SMTP_EMAIL_USER=
SMTP_EMAIL_PASS=
```

Important:
- Keep `FIREBASE_ADMIN_PRIVATE_KEY` escaped with `\n` when stored in env files/secrets.
- Never commit `.env.local`.

### 4) Run Development Server ▶️

```bash
npm run dev
```

Open `http://localhost:3000`.

### 5) Production Build 🏗️

```bash
npm run build
npm run start
```

## Available Scripts 🧪

- `npm run dev` - start local development server
- `npm run build` - build production bundle
- `npm run start` - run production server
- `npm run lint` - run ESLint checks

## Useful Technical Notes 🧠

- Chat list data uses real-time listeners (`onSnapshot`) and presence listeners (`onValue`).
- `ChatContext` stores lightweight in-memory metadata cache to reduce repetitive lookups.
- Chat session initialization has canonical-id recovery behavior to handle stale route IDs.
- Server actions and Firebase Admin SDK handle privileged reads/writes.

## Documentation 📚

- Architecture flow: `docs/WHISP_ARCHITECTURE_FLOW.md`
- Infrastructure study guide: `docs/WHISP_INFRASTRUCTURE_STUDY_GUIDE.md`

## Blog / Write-up ✍️

- How we implemented end-to-end encrypted messaging web app from scratch:
	https://medium.com/@g3rald.dj/how-we-implemented-end-to-end-encrypted-messaging-web-app-from-scratch-ac85bcb0d348?postPublishedType=repub

## Troubleshooting 🛠️

### Firebase auth works but data does not load ❗
- Verify all `NEXT_PUBLIC_FIREBASE_*` values.
- Ensure Firestore rules and indexes are configured.

### Admin actions fail on server ❗
- Verify `FIREBASE_ADMIN_*` variables.
- Ensure private key formatting is correct (`\n` handling).

### Presence status not updating ❗
- Verify Realtime Database is enabled and `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is set.

## Feedback 🙌

Feedback is always welcome and helps improve the app quality.

- Open an issue for bugs, UX problems, or feature requests
- Include clear reproduction steps and expected behavior
- If relevant, add screenshots, logs, or screen recordings

When reporting performance issues, include:
- where the issue happened (page/route)
- browser and device info
- approximate time window and what actions triggered the issue

## Contributions 🤝

Contributions are welcome.

### How to Contribute 🚀
1. Fork the repository
2. Create a branch for your change
3. Make focused commits with clear messages
4. Run lint and local checks
5. Open a pull request with a concise description

### Pull Request Checklist ✅
- Keep PR scope small and focused
- Describe what changed and why
- Link related issue(s), if any
- Include screenshots for UI changes
- Mention any new env vars, migrations, or breaking changes
- Ensure `npm run lint` passes before requesting review

## Deployment 🚢

The app can be deployed on Vercel.

Checklist before deploy:
- Add all environment variables in Vercel project settings
- Confirm Firestore + Realtime Database rules for production
- Run `npm run build` locally to validate

