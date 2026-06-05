import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from rest_framework import authentication, exceptions
from django.contrib.auth.models import User
from django.conf import settings
import os

# Initialize Firebase Admin SDK once
_firebase_initialized = False

def get_firebase_app():
    global _firebase_initialized
    if not _firebase_initialized:
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            # Fall back to application default credentials (for Firebase Functions)
            cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': settings.FIREBASE_PROJECT_ID,
        })
        _firebase_initialized = True
    return firebase_admin.get_app()


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Authenticate via Firebase ID token passed as Bearer token.
    Creates or retrieves a Django User mapped to the Firebase UID.
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        id_token = auth_header.split('Bearer ')[1].strip()
        if not id_token:
            return None

        try:
            get_firebase_app()
            decoded_token = firebase_auth.verify_id_token(id_token)
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Invalid Firebase token: {str(e)}')

        uid = decoded_token.get('uid')
        email = decoded_token.get('email', '')
        name = decoded_token.get('name', email.split('@')[0] if email else 'User')
        photo_url = decoded_token.get('picture', '')

        # Get or create a Django user mapped to this Firebase UID
        user, created = User.objects.get_or_create(
            username=uid,
            defaults={
                'email': email,
                'first_name': name,
            }
        )

        # Store Firebase extras on the user object for views to access
        user.firebase_uid = uid
        user.firebase_name = name
        user.firebase_photo_url = photo_url
        user.firebase_email = email

        return (user, decoded_token)

    def authenticate_header(self, request):
        return 'Bearer'
