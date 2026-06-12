"""
Firestore service — reads from the actual mobile app structure:

  users/{uid}                        → profile document
  users/{uid}/sessions/{sessionId}   → workout sessions
  users/{uid}/health_daily/{date}    → daily health data
  users/{uid}/chat_messages/{id}     → AI coach chat history (shared mobile + web)
"""
from firebase_admin import firestore
from datetime import datetime, timezone, date, timedelta
import uuid


def get_db():
    return firestore.client()


# ─────────────────────────────────────────────
# USER PROFILE
# ─────────────────────────────────────────────

def get_user_profile(uid: str) -> dict:
    db = get_db()
    doc = db.collection('users').document(uid).get()
    if not doc.exists:
        return {}
    data = doc.to_dict()
    data['firebase_uid'] = uid
    return data


# ─────────────────────────────────────────────
# HEALTH DAILY
# ─────────────────────────────────────────────

def get_health_daily_30days(uid: str) -> list:
    db = get_db()
    thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()

    docs = (
        db.collection('users').document(uid)
        .collection('health_daily')
        .where('date', '>=', thirty_days_ago)
        .order_by('date', direction=firestore.Query.ASCENDING)
        .stream()
    )

    result = []
    for doc in docs:
        data = doc.to_dict()
        result.append({
            'date': data.get('date', doc.id),
            'steps': data.get('steps', 0),
            'calories': data.get('caloriesBurned', 0),
            'heart_rate': data.get('heartRate', 0),
            'spo2': data.get('spo2', 0),
        })
    return result


def get_today_health(uid: str) -> dict:
    db = get_db()
    today = date.today().isoformat()
    doc = db.collection('users').document(uid).collection('health_daily').document(today).get()
    if not doc.exists:
        return {'date': today, 'steps': 0, 'calories': 0, 'heart_rate': 0, 'spo2': 0}
    data = doc.to_dict()
    return {
        'date': today,
        'steps': data.get('steps', 0),
        'calories': data.get('caloriesBurned', 0),
        'heart_rate': data.get('heartRate', 0),
        'spo2': data.get('spo2', 0),
    }


# ─────────────────────────────────────────────
# SESSIONS
# ─────────────────────────────────────────────

def get_user_sessions(uid: str, limit: int = 10) -> list:
    db = get_db()
    docs = (
        db.collection('users').document(uid)
        .collection('sessions')
        .order_by('date', direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )

    result = []
    for doc in docs:
        data = doc.to_dict()
        ts = data.get('date')
        if hasattr(ts, 'isoformat'):
            date_str = ts.isoformat()
        elif hasattr(ts, '_seconds'):
            date_str = datetime.fromtimestamp(ts._seconds, tz=timezone.utc).isoformat()
        else:
            date_str = str(ts)

        result.append({
            'session_id': data.get('id', doc.id),
            'workout_name': data.get('workoutName', ''),
            'muscle_group': data.get('muscleGroup', ''),
            'date': date_str,
            'duration_minutes': data.get('durationMinutes', 0),
            'calories_burned': data.get('caloriesBurned', 0),
            'accuracy_score': data.get('accuracyScore', 0),
            'muscles_worked': data.get('musclesWorked', []),
            'intensity': data.get('intensity', 'Moderate'),
            'ai_suggestion': data.get('aiSuggestion', ''),
        })
    return result


# ─────────────────────────────────────────────
# CHAT HISTORY
# ─────────────────────────────────────────────

def get_chat_history(uid: str, limit: int = 100) -> list:
    """
    Reads from users/{uid}/chat_messages — the same Firestore subcollection
    the mobile app writes to directly. Mobile schema uses 'isUser' (bool)
    and ISO-string timestamps; we translate to the 'role' shape the Gemini
    pipeline and web UI expect.
    """
    db = get_db()
    docs = (
        db.collection('users')
        .document(uid)
        .collection('chat_messages')
        .order_by('timestamp', direction=firestore.Query.ASCENDING)
        .limit(limit)
        .stream()
    )
    result = []
    for doc in docs:
        data = doc.to_dict()
        is_user = data.get('isUser')
        role = 'user' if is_user else 'model'
        ts = data.get('timestamp')
        if hasattr(ts, 'isoformat'):
            ts = ts.isoformat()
        elif hasattr(ts, '_seconds'):
            ts = datetime.fromtimestamp(ts._seconds, tz=timezone.utc).isoformat()
        # else: already an ISO string from mobile — leave as-is

        result.append({
            'id': doc.id,
            'role': role,
            'content': data.get('content', ''),
            'source': data.get('source', 'mobile'),
            'timestamp': ts,
        })
    return result


def save_chat_message(uid: str, role: str, content: str, source: str = 'web') -> dict:
    """
    Writes to users/{uid}/chat_messages using the mobile schema (isUser bool,
    ISO timestamp string) so the mobile app's local/Firestore merge picks up
    web-originated messages on its next load/refresh.
    """
    db = get_db()
    msg_id = str(uuid.uuid4())
    now = datetime.now(tz=timezone.utc)
    data = {
        'id': msg_id,
        'content': content,
        'isUser': role == 'user',
        'timestamp': now.isoformat(),
        'source': source,
    }
    db.collection('users').document(uid).collection('chat_messages').document(msg_id).set(data)
    return {'id': msg_id, 'role': role, 'content': content, 'source': source, 'timestamp': data['timestamp']}


def clear_chat_history(uid: str):
    db = get_db()
    col_ref = db.collection('users').document(uid).collection('chat_messages')
    for doc in col_ref.stream():
        doc.reference.delete()