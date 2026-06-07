# AI Dashboard Frontend

A modern, glassmorphism-styled Next.js 14 frontend for the AI Dashboard backend.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** – utility-first styling
- **Framer Motion** – smooth page transitions & animations
- **Recharts** – beautiful charts for analytics
- **React Dropzone** – drag-and-drop file uploads
- **React Hot Toast** – toast notifications
- **Lucide React** – icon library
- **Socket.IO Client** – real-time updates
- **Axios** – HTTP client

## Design System

- **Glassmorphism** – frosted glass cards, blurred backgrounds
- **Mesh gradient** background with radial color orbs
- **Space Grotesk** font for crisp, modern typography
- **Framer Motion** staggered entry animations on every page
- Consistent `glass`, `btn-primary`, `input-glass`, `card-glass` utility classes

## Pages

| Route | Description |
|---|---|
| `/auth/login` | Login form |
| `/auth/register` | Registration |
| `/auth/forgot-password` | Password reset request |
| `/auth/reset-password?token=...` | Password reset form |
| `/auth/verify-email?token=...` | Email verification |
| `/dashboard` | Overview with stats, recent files, job queue |
| `/files` | Upload, list, delete, process files |
| `/analytics` | File analytics – overview, trends charts, error breakdown |
| `/jobs` | AI Job creation (analysis/insights/patterns/question) and monitoring |
| `/notifications` | View, mark-read, delete notifications |
| `/profile` | Edit profile, change password |
| `/admin` | Admin-only: user management, system metrics, global alerts |

## Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

The `.env.local` file is pre-configured for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```

Update these if your backend runs on a different port.

### 3. Start the backend

Make sure the Express backend is running on port **5001** (as configured in `src/app.js`).

### 4. Run the frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build for Production

```bash
npm run build
npm start
```

## Notes

- The frontend only calls API endpoints that exist in the backend
- JWT tokens are stored in `localStorage` and sent via `Authorization: Bearer` header
- Admin routes (`/admin`) are protected — redirect to `/dashboard` if role ≠ `admin`
- Auth pages redirect to `/dashboard` if already logged in
- File upload supports: CSV, JSON, PDF, TXT, PNG, JPG (max 20 MB)
- Socket.IO connection is available for real-time events (uses the same backend port)
