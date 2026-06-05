from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .firestore_service import (
    get_user_profile,
    get_health_daily_30days,
    get_today_health,
    get_user_sessions,
    get_chat_history,
    save_chat_message,
    clear_chat_history,
)
from .gemini_service import send_message_to_gemini


def get_uid(user):
    return getattr(user, 'firebase_uid', user.username)


class HealthCheckView(APIView):
    """GET /health/ — Railway health check, no auth required."""
    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response({'status': 'ok'})


class AuthVerifyView(APIView):
    """POST /api/auth/verify/ — verify token and return profile from Firestore."""

    def post(self, request):
        uid = get_uid(request.user)
        profile = get_user_profile(uid)
        return Response({
            'user': profile,
            'message': 'authenticated',
        })


class UserProfileView(APIView):
    """GET /api/profile/ — read profile from Firestore users/{uid}"""

    def get(self, request):
        uid = get_uid(request.user)
        profile = get_user_profile(uid)
        return Response(profile)


class DashboardSummaryView(APIView):
    """GET /api/dashboard/ — profile + today's health + last session"""

    def get(self, request):
        uid = get_uid(request.user)
        profile = get_user_profile(uid)
        today = get_today_health(uid)
        sessions = get_user_sessions(uid, limit=1)
        last_session = sessions[0] if sessions else None

        # Compute BMI if available
        weight = profile.get('weightKg')
        height = profile.get('heightCm')
        bmi = None
        bmi_category = None
        if weight and height and height > 0:
            h = height / 100
            bmi = round(weight / (h * h), 1)
            if bmi < 18.5:
                bmi_category = 'Underweight'
            elif bmi < 25:
                bmi_category = 'Normal'
            elif bmi < 30:
                bmi_category = 'Overweight'
            else:
                bmi_category = 'Obese'

        return Response({
            'profile': {
                'display_name': profile.get('name', ''),
                'email': profile.get('email', ''),
                'photo_url': profile.get('photoUrl', ''),
                'age': profile.get('age'),
                'weight_kg': profile.get('weightKg'),
                'height_cm': profile.get('heightCm'),
                'gender': profile.get('gender', ''),
                'fitness_goal': profile.get('fitnessGoal', ''),
                'health_conditions': profile.get('healthConditions', []),
                'total_workouts': profile.get('totalWorkouts', 0),
                'total_calories': profile.get('totalCalories', 0),
                'bmi': bmi,
                'bmi_category': bmi_category,
            },
            'today': today,
            'last_session': last_session,
        })


class DailyStepsView(APIView):
    """GET /api/steps/ — last 30 days from Firestore health_daily"""

    def get(self, request):
        uid = get_uid(request.user)
        data = get_health_daily_30days(uid)
        return Response(data)


class WorkoutSessionListView(APIView):
    """GET /api/sessions/ — sessions from Firestore"""

    def get(self, request):
        uid = get_uid(request.user)
        sessions = get_user_sessions(uid, limit=10)
        return Response(sessions)


class ChatHistoryView(APIView):
    """GET/DELETE /api/chat/history/"""

    def get(self, request):
        uid = get_uid(request.user)
        messages = get_chat_history(uid, limit=100)
        return Response({'messages': messages})

    def delete(self, request):
        uid = get_uid(request.user)
        clear_chat_history(uid)
        return Response({'message': 'Chat history cleared.'})


class ChatSendView(APIView):
    """POST /api/chat/send/ — send message to Gemini with Firestore history"""

    def post(self, request):
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)

        uid = get_uid(request.user)
        profile = get_user_profile(uid)

        try:
            response_text = send_message_to_gemini(uid, user_message, profile)
        except Exception as e:
            return Response(
                {'error': f'AI service error: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'response': response_text})


class MobileChatSyncView(APIView):
    """
    POST /api/chat/send-mobile/
    Called by mobile to mirror chat messages into Firestore.
    Does NOT call Gemini — just saves the message.
    """

    def post(self, request):
        role = request.data.get('role', '').strip()
        content = request.data.get('content', '').strip()
        if role not in ('user', 'model') or not content:
            return Response(
                {'error': 'role must be "user" or "model" and content is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        uid = get_uid(request.user)
        msg = save_chat_message(uid, role=role, content=content, source='mobile')
        return Response({'ok': True, 'id': msg['id']})
