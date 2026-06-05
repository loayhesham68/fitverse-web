"""
Firestore service — reads from the exact structure the mobile app writes.

Structure:
  users/{uid}                    → profile document
  health_daily/{date}            → top-level, filtered by uid field
  sessions/{sessionId}           → top-level, filtered by uid field
  chat_messages/{uid}/messages/{msgId}  → web chat history
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
    """Read profile from users/{uid} document."""
    db = get_db()
    doc = db.collection('users').document(uid).get()
    if not doc.exists:
        return {}
    data = doc.to_dict()
    data['firebase_uid'] = uid
    return data


# ─────────────────────────────────────────────
# HEALTH DAILY (steps, calories, heart rate, spo2)
# ─────────────────────────────────────────────

def get_health_daily_30days(uid: str) -> list:
    """
    Read last 30 days of health data from top-level health_daily collection.
    Documents are named by date e.g. '2026-06-04' and contain a uid field.
    """
    db = get_db()
    thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()

    docs = (
        db.collection('health_daily')
        .where('uid', '==', uid)
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
            'source': data.get('source', 'health_connect'),
        })
    return result


def get_today_health(uid: str) -> dict:
    """Read today's health data."""
    db = get_db()
    today = date.today().isoformat()
    doc = db.collection('health_daily').document(today).get()
    if not doc.exists:
        return {'date': today, 'steps': 0, 'calories': 0, 'heart_rate': 0, 'spo2': 0}
    data = doc.to_dict()
    # Verify it belongs to this user
    if data.get('uid') != uid:
        return {'date': today, 'steps': 0, 'calories': 0, 'heart_rate': 0, 'spo2': 0}
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
    """
    Read workout sessions from top-level sessions collection filtered by uid.
    """
    db = get_db()
    docs = (
        db.collection('sessions')
        .where('uid', '==', uid)
        .order_by('date', direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )

    result = []
    for doc in docs:
        data = doc.to_dict()
        # Normalize timestamp
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
    """Read chat messages from chat_messages/{uid}/messages/"""
    db = get_db()
    docs = (
        db.collection('chat_messages')
        .document(uid)
        .collection('messages')
        .order_by('timestamp', direction=firestore.Query.ASCENDING)
        .limit(limit)
        .stream()
    )
    result = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        ts = data.get('timestamp')
        if hasattr(ts, 'isoformat'):
            data['timestamp'] = ts.isoformat()
        elif hasattr(ts, '_seconds'):
            data['timestamp'] = datetime.fromtimestamp(ts._seconds, tz=timezone.utc).isoformat()
        result.append(data)
    return result


def save_chat_message(uid: str, role: str, content: str, source: str = 'web') -> dict:
    """Save a chat message to chat_messages/{uid}/messages/{msgId}"""
    db = get_db()
    msg_id = str(uuid.uuid4())
    now = datetime.now(tz=timezone.utc)
    data = {
        'role': role,
        'content': content,
        'source': source,
        'timestamp': now,
    }
    db.collection('chat_messages').document(uid).collection('messages').document(msg_id).set(data)
    return {'id': msg_id, **data, 'timestamp': now.isoformat()}


def clear_chat_history(uid: str):
    """Delete all chat messages for a user."""
    db = get_db()
    col_ref = db.collection('chat_messages').document(uid).collection('messages')
    for doc in col_ref.stream():
        doc.reference.delete()
