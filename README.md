# FitVerse Web App

Full-stack web companion for the FitVerse Flutter mobile app.
**Stack:** Django REST Framework + Django Channels (WebSocket) + React + Vite + Tailwind CSS
**Database:** PostgreSQL (history) + Firebase Firestore (real-time chat & steps sync)
**Auth:** Firebase Google Sign-In → verified by Django backend

---

## Project Structure

```
fitverse-web/
├── backend/                  Django REST API + WebSocket server
│   ├── fitverse/             Django project (settings, urls, asgi, wsgi)
│   ├── api/                  Main app
│   │   ├── models.py         UserProfile, DailySteps, WorkoutSession
│   │   ├── views.py          All REST endpoints
│   │   ├── authentication.py Firebase token verification
│   │   ├── firestore_service.py  Chat history & steps sync via Firestore
│   │   ├── gemini_service.py     AI Coach via Gemini API
│   │   ├── consumers.py      WebSocket consumer (real-time dashboard)
│   │   ├── routing.py        WebSocket URL routing
│   │   └── urls.py           REST URL routing
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                 React + Vite + Tailwind
    ├── src/
    │   ├── pages/
    │   │   ├── LoginPage.jsx       Google Sign-In
    │   │   ├── DashboardPage.jsx   Metrics + 30-day steps calendar
    │   │   └── CoachPage.jsx       AI Coach with Firestore chat history
    │   ├── components/
    │   │   ├── Sidebar.jsx         Navigation + logout
    │   │   ├── Header.jsx          Top bar with user info
    │   │   ├── MetricCard.jsx      Heart rate / SpO2 / steps / calories
    │   │   ├── StepsCalendar.jsx   30-day heatmap calendar
    │   │   └── ProtectedRoute.jsx  Auth guard
    │   ├── context/
    │   │   └── AuthContext.jsx     Firebase auth + Django profile state
    │   ├── hooks/
    │   │   └── useRealtimeDashboard.js  WebSocket hook
    │   └── services/
    │       ├── firebase.js         Firebase init + Google Sign-In
    │       └── api.js              Axios client with auto token injection
    ├── .env.example
    └── package.json
```

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (for Django Channels WebSocket)
- Firebase project: `fitverse-6513c`

---

## Backend Setup

### 1. Create virtual environment

```bash
cd fitverse-web/backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

Key values to fill in:
- `DJANGO_SECRET_KEY` — generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- `DB_*` — your PostgreSQL credentials
- `GEMINI_API_KEY` — from https://ai.google.dev (same key as the mobile app)
- `FIREBASE_CREDENTIALS_PATH` — path to your Firebase service account JSON

### 3. Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Save the downloaded JSON as `backend/firebase-credentials.json`

> ⚠️ Never commit `firebase-credentials.json` to version control.

### 4. Create PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE fitverse_db;"
```

### 5. Run migrations

```bash
python manage.py migrate
```

### 6. Start Redis (required for WebSocket)

```bash
# macOS/Linux
redis-server

# Windows (WSL or Docker)
docker run -p 6379:6379 redis:7
```

### 7. Start the backend

```bash
# Development (HTTP only, no WebSocket)
python manage.py runserver

# Production / WebSocket support — use Daphne (ASGI)
daphne -b 0.0.0.0 -p 8000 fitverse.asgi:application
```

---

## Frontend Setup

### 1. Install dependencies

```bash
cd fitverse-web/frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your Firebase Web App config values
```

**Get Firebase web config:**
1. Firebase Console → Project Settings → Your apps
2. Add a Web App (if not already added)
3. Copy the config object values into `.env`

### 3. Start dev server

```bash
npm run dev
# Opens at http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/verify/` | Verify Firebase token, get/create profile |
| GET/PATCH | `/api/profile/` | Get or update user profile |
| GET | `/api/dashboard/` | Dashboard summary (profile + today's data) |
| GET/POST | `/api/steps/` | 30-day steps data |
| GET/POST | `/api/sessions/` | Workout sessions |
| GET/DELETE | `/api/chat/history/` | Firestore chat messages |
| POST | `/api/chat/send/` | Send message to Gemini AI Coach |

**WebSocket:** `ws://localhost:8000/ws/dashboard/?token=<firebase-id-token>`

---

## Mobile App Integration

The mobile app needs to **push data to the web backend** so the web dashboard stays current.

### Push steps data (add to `HealthProvider._fetchHealthData()`)

```dart
// After fetching steps from Health Connect, push to web API:
final idToken = await FirebaseAuth.instance.currentUser?.getIdToken();
await http.post(
  Uri.parse('https://your-backend.com/api/steps/'),
  headers: {
    'Authorization': 'Bearer $idToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
    'steps': metrics.steps,
    'calories': metrics.calories,
  }),
);
```

### Push workout sessions (add to `UserProvider.addSession()`)

```dart
final idToken = await FirebaseAuth.instance.currentUser?.getIdToken();
await http.post(
  Uri.parse('https://your-backend.com/api/sessions/'),
  headers: {
    'Authorization': 'Bearer $idToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'session_id': session.id,
    'workout_name': session.workoutName,
    'muscle_group': session.muscleGroup,
    'date': session.date.toIso8601String(),
    'duration_minutes': session.durationMinutes,
    'calories_burned': session.caloriesBurned,
    'accuracy_score': session.accuracyScore,
    'muscles_worked': session.musclesWorked,
    'intensity': session.intensity,
    'ai_suggestion': session.aiSuggestion,
  }),
);
```

### Chat history — already synced via Firestore

AI Coach chat is stored in Firestore under `users/{uid}/chat_messages/`.
The web reads and writes to the same collection, so history is automatically shared.

---

## Firestore Security Rules

Add these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Color Reference (matches mobile app)

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0F1C1E` | Page background |
| Card | `#1A2E31` | Card backgrounds |
| Card2 | `#1E3538` | Secondary cards, borders |
| Teal (primary) | `#00897B` | CTAs, active nav, accents |
| Accent | `#26C6DA` | Secondary accent, highlights |
| Muted | `#4A6B70` | Disabled / muted text |
| Text | `#E8F4F5` | Primary text |
| Subtle | `#8AACB0` | Secondary text |

Font: **Bebas Neue** (display/headings) + **DM Sans** (body) + **JetBrains Mono** (numbers)
