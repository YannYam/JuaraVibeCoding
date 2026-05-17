# 📋 Technical Specification — ClassVault

> **Post-Class File Storage & Session Archive**

---

## 1. Executive Summary

**ClassVault** is a full-stack web application that serves as a centralized hub for storing and accessing class materials after each session. The course spans **7 sessions**, each led by a different guest speaker on a specific date. 

The system supports **two user roles**:
- **Moderator** — Can upload, manage, and delete files for each session. Full administrative control over session content.
- **User** — Can browse sessions, view speaker details, and download files. Read-only access.

Both roles require **login** to access the application. The app features a premium, white and Blue-themed interface with Modern design.

---

## 2. Requirements

### 2.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | **Login page** — email/username + password authentication for both roles | High |
| FR-02 | **Role-based access** — Moderator vs User with different permissions | High |
| FR-03 | Display a **hero landing section** with course title, description, and stats bar (total sessions, total files, total speakers) | High |
| FR-04 | Show a **session grid** of all 7 sessions with: session number, topic, speaker name, speaker photo, and date | High |
| FR-05 | **Click session card** → navigate to session detail view | High |
| FR-06 | Session detail shows: topic description, speaker bio, date, and **list of downloadable files** | High |
| FR-07 | Each file entry shows: filename, file type icon, file size, and a **download button** | High |
| FR-08 | **Moderator: Upload files** — drag-and-drop or file picker to add files to any session | High |
| FR-09 | **Moderator: Delete files** — remove files from sessions | High |
| FR-10 | **Search/filter bar** to find sessions by speaker name or topic keyword | Medium |
| FR-11 | **Logout** functionality | High |
| FR-12 | **User registration** — new users can register as "User" role (Moderator accounts are pre-seeded) | Medium |

### 2.2 Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-01 | **Responsive Design** — mobile, tablet, desktop | High |
| NFR-02 | **Dark Mode** — premium dark theme with glassmorphism accents | High |
| NFR-03 | **Performance** — page load under 2 seconds, smooth animations | High |
| NFR-04 | **Security** — password hashing (bcrypt), JWT auth tokens, protected API routes | High |
| NFR-05 | **File size limit** — max 50MB per file upload | Medium |
| NFR-06 | **Modern Typography** — Google Fonts (Inter) | High |

---

## 3. Architecture & Tech Stack

### 3.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | HTML5 + Vanilla CSS3 + Vanilla JS (ES6+) | Lightweight, no framework overhead |
| **Backend** | Node.js + Express.js | Fast, minimal API server for auth & file management |
| **Database** | SQLite (via `better-sqlite3`) | Zero-config, file-based DB — perfect for local/small-scale use |
| **Auth** | JWT (jsonwebtoken) + bcrypt | Stateless authentication with secure password hashing |
| **File Upload** | Multer (Express middleware) | Battle-tested file upload handling |
| **Fonts** | Google Fonts (Inter) | Modern, clean typography |
| **Icons** | Lucide Icons (CDN) | Lightweight SVG icon set |

### 3.2 Application Architecture

```
┌──────────────── Frontend (Static) ─────────────────┐
│  index.html → Login / Register                     │
│  dashboard.html → Main App (post-login)            │
│    ├── Hero Section + Stats                        │
│    ├── Session Grid (cards)                        │
│    ├── Session Detail (modal/page)                 │
│    │    ├── Speaker Info                           │
│    │    ├── File List + Download                   │
│    │    └── [Moderator] Upload / Delete Files      │
│    └── Search / Filter                             │
├────────────────────────────────────────────────────┤
│  js/app.js — SPA logic, fetch API calls            │
│  js/auth.js — Login, register, JWT management      │
│  css/style.css — All styling                       │
└────────────────────────────────────────────────────┘
                      │ REST API (fetch)
                      ▼
┌──────────────── Backend (Express) ─────────────────┐
│  server.js — Express app entry point               │
│  routes/                                           │
│    ├── auth.js    — POST /api/auth/login            │
│    │                POST /api/auth/register          │
│    ├── sessions.js — GET /api/sessions              │
│    │                 GET /api/sessions/:id           │
│    └── files.js   — POST /api/sessions/:id/files    │
│                     DELETE /api/files/:id            │
│                     GET /api/files/:id/download      │
│  middleware/                                        │
│    ├── auth.js     — JWT verification middleware    │
│    └── role.js     — Role-based access guard        │
│  database/                                          │
│    └── db.js       — SQLite init + seed data        │
│  uploads/          — Stored uploaded files           │
└────────────────────────────────────────────────────┘
```

### 3.3 File & Folder Structure

```
app_build/
├── server.js                    # Express entry point
├── package.json                 # Dependencies & scripts
├── database/
│   └── db.js                    # SQLite setup, schema, seed data
├── middleware/
│   ├── auth.js                  # JWT verification
│   └── role.js                  # Role check (moderator/user)
├── routes/
│   ├── auth.js                  # Login & register endpoints
│   ├── sessions.js              # Session CRUD endpoints
│   └── files.js                 # File upload/download/delete
├── uploads/                     # Uploaded files (created at runtime)
├── public/                      # Static frontend files
│   ├── index.html               # Login / Register page
│   ├── dashboard.html           # Main app (post-login)
│   ├── css/
│   │   └── style.css            # All styles
│   └── js/
│       ├── auth.js              # Frontend auth logic
│       └── app.js               # Dashboard logic
└── data/
    └── seed.json                # Initial session/speaker seed data
```

---

## 4. Database Schema (SQLite)

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,          -- bcrypt hashed
    role TEXT NOT NULL DEFAULT 'user', -- 'moderator' | 'user'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,              -- ISO date string
    speaker_name TEXT NOT NULL,
    speaker_role TEXT,
    speaker_bio TEXT,
    speaker_avatar TEXT              -- URL/path to avatar
);
```

### Files Table
```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,       -- UUID-based filename on disk
    file_type TEXT,                  -- extension (pdf, docx, etc.)
    file_size INTEGER,              -- bytes
    uploaded_by INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
```

### Seed Data
- **1 Moderator account** pre-seeded: `admin` / `admin123`
- **7 Sessions** pre-seeded with speaker data

---

## 5. API Endpoints

### Auth
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/login` | ❌ | — | Login → returns JWT token |
| GET | `/api/auth/me` | ✅ | Any | Get current user info |

### Sessions
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/sessions` | ✅ | Any | List all sessions with file counts |
| GET | `/api/sessions/:id` | ✅ | Any | Get session detail + files |

### Files
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/sessions/:id/files` | ✅ | Moderator | Upload file(s) to a session |
| GET | `/api/files/:id/download` | ✅ | Any | Download a file |
| DELETE | `/api/files/:id` | ✅ | Moderator | Delete a file |

---

## 6. State Management

### Backend
- **Stateless** — JWT tokens carry user identity. No server-side sessions.
- **Database** — SQLite stores all persistent data (users, sessions, files).
- **File Storage** — `uploads/` directory holds physical files, DB tracks metadata.

### Frontend
- **Auth State** — JWT stored in `localStorage`. On page load, validate via `/api/auth/me`.
- **App State** — JavaScript module-level object:
  ```js
  const state = {
    user: null,          // { id, username, role }
    sessions: [],        // fetched from API
    activeSession: null, // currently viewed session
    searchQuery: ''      // filter input
  };
  ```
- **Render Cycle** — State change → re-render affected DOM sections.
- **Role-based UI** — Upload/delete buttons only visible when `state.user.role === 'moderator'`.

---

## 7. UI / UX Design Direction

### Color Palette
- **Background**: `hsl(0, 0%, 100%)` — deep navy-black
- **Surface**: `hsl(0, 0%, 98%)` — card backgrounds
- **Glass**: `rgba(255, 255, 255, 0.05)` with `backdrop-filter: blur(20px)`
- **Primary Accent**: `hsl(260, 85%, 65%)` — vivid purple
- **Secondary Accent**: `hsl(170, 80%, 50%)` — teal/cyan
- **Gradient**: primary → secondary for CTAs
- **Text**: `hsl(0, 0%, 95%)` / `hsl(225, 15%, 55%)`
- **Danger**: `hsl(0, 75%, 55%)` — delete actions
- **Success**: `hsl(145, 70%, 45%)` — upload success

### Key Pages
1. **Login** — Centered glassmorphism card, gradient accent border, smooth transitions between login
2. **Dashboard** — Hero section, stats bar, session grid with animated cards
3. **Session Detail** — Full speaker info, file list with type badges, moderator controls (upload dropzone, delete buttons)

### Visual Elements
- Glassmorphism cards with gradient borders on hover
- Smooth fade-in / slide-up animations
- Animated stat counters on hero
- Drag-and-drop upload zone (moderator)
- File type color-coded badges (PDF=red, DOCX=blue, ZIP=amber, PPT, etc.)
- Role indicator badge in the navbar
- Toast notifications for upload/delete success/error

---

## 8. Session Data (7 Sessions)

| # | Topic | Speaker | Date |
|---|-------|---------|------|
| 1 | Introduction to Cloud Computing | Dr. Sarah Chen | Mar 5, 2026 |
| 2 | Machine Learning in Production | Prof. James Rivera | Mar 12, 2026 |
| 3 | Cybersecurity Fundamentals | Aisyah Putri, CISSP | Mar 19, 2026 |
| 4 | Mobile App Development with Flutter | Budi Santoso | Mar 26, 2026 |
| 5 | DevOps & CI/CD Pipelines | Rizky Pratama | Apr 2, 2026 |
| 6 | Data Engineering at Scale | Dr. Mega Wulandari | Apr 9, 2026 |
| 7 | AI Ethics & Responsible Innovation | Prof. David Hartono | Apr 16, 2026 |

### Pre-seeded Accounts
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Moderator |

---

> **⏸️ APPROVAL GATE**: This revised specification now includes role-based authentication (Moderator + User), a Node.js/Express backend, SQLite database, and file upload capabilities. Please review and type **"Approved"** to proceed, or provide further feedback.
