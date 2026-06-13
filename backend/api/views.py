from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.http import StreamingHttpResponse
from django.conf import settings
import requests

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


GITHUB_OWNER = 'loayhesham68'
GITHUB_REPO = 'fitverse-web'
GITHUB_RELEASE_TAG = 'v1.0.0'
GITHUB_ASSET_NAME = 'FitVerse-1.0.0.apk'


class DownloadApkView(APIView):
    """
    GET /api/download-apk/

    Streams the APK from a PRIVATE GitHub release through our backend
    using the GitHub API + a personal access token (GITHUB_TOKEN env var,
    needs 'repo' scope / read access to the private repo's releases).

    Flow:
      1. GET /repos/{owner}/{repo}/releases/tags/{tag}  -> find the asset id
      2. GET /repos/{owner}/{repo}/releases/assets/{id} with
         Accept: application/octet-stream -> 302 to a signed download URL
         (requests follows this automatically with allow_redirects=True)
      3. Stream the bytes to the browser with Content-Disposition: attachment

    The browser only ever talks to our domain — no GitHub URL or redirect
    is ever visible to the user.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        import logging
        logger = logging.getLogger(__name__)

        token = getattr(settings, 'GITHUB_TOKEN', None) or __import__('os').environ.get('GITHUB_TOKEN')
        if not token:
            return Response({'error': 'Server is not configured with a GITHUB_TOKEN.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        api_headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'FitVerseBackend/1.0',
        }

        try:
            # 1. Find the asset id for this release tag
            release_url = f'https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/tags/{GITHUB_RELEASE_TAG}'
            release_resp = requests.get(release_url, headers=api_headers, timeout=30)
            release_resp.raise_for_status()
            release_data = release_resp.json()

            asset = next(
                (a for a in release_data.get('assets', []) if a.get('name') == GITHUB_ASSET_NAME),
                None,
            )
            if not asset:
                logger.error(f"APK asset '{GITHUB_ASSET_NAME}' not found in release '{GITHUB_RELEASE_TAG}'")
                return Response({'error': 'APK asset not found in the release.'}, status=status.HTTP_404_NOT_FOUND)

            asset_id = asset['id']

            # 2. Download the actual binary via the asset endpoint
            asset_url = f'https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/assets/{asset_id}'
            download_headers = {**api_headers, 'Accept': 'application/octet-stream'}
            upstream = requests.get(asset_url, headers=download_headers, stream=True, timeout=120, allow_redirects=True)
            upstream.raise_for_status()
        except requests.RequestException as e:
            logger.error(f"APK proxy failed: {type(e).__name__}: {e}")
            return Response(
                {'error': 'Could not fetch APK from release server.', 'detail': str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        response = StreamingHttpResponse(
            upstream.iter_content(chunk_size=8192),
            content_type='application/vnd.android.package-archive',
        )
        response['Content-Disposition'] = f'attachment; filename="{GITHUB_ASSET_NAME}"'
        content_length = upstream.headers.get('Content-Length')
        if content_length:
            response['Content-Length'] = content_length
        return response
    