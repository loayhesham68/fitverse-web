import json
import os
import logging
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from rest_framework import authentication, exceptions
from django.contrib.auth.models import User
from django.conf import settings

logger = logging.getLogger(__name__)

_firebase_initialized = False

def get_firebase_app():
    global _firebase_initialized
    if not _firebase_initialized:
        creds_json = os.environ.get('FIREBASE_CREDENTIALS_JSON')
        if creds_json:
            try:
                # Strip any whitespace/newlines that Railway might add
                creds_json = creds_json.strip()
                # If pasted twice, take only the first valid JSON object
                # Find the end of the first JSON object
                decoder = json.JSONDecoder()
                cred_dict, _ = decoder.raw_decode(creds_json)
                cred = credentials.Certificate(cred_dict)
                logger.info(f'Firebase initialized from env var, project: {cred_dict.get("project_id")}')
            except Exception as e:
                raise Exception(f'Failed to parse FIREBASE_CREDENTIALS_JSON: {e}')
        elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            logger.info('Firebase initialized from file')
        else:
            raise Exception('No Firebase credentials found.')

        firebase_admin.initialize_app(cred, {
            'projectId': settings.FIREBASE_PROJECT_ID,
        })
        _firebase_initialized = True
    return firebase_admin.get_app()


class FirebaseAuthentication(authentication.BaseAuthentication):

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
            logger.error(f'Firebase token verification failed: {str(e)}')
            raise exceptions.AuthenticationFailed(f'Invalid Firebase token: {str(e)}')

        uid = decoded_token.get('uid')
        email = decoded_token.get('email', '')
        name = decoded_token.get('name', email.split('@')[0] if email else 'User')
        photo_url = decoded_token.get('picture', '')

        user, created = User.objects.get_or_create(
            username=uid,
            defaults={
                'email': email,
                'first_name': name,
            }
        )

        user.firebase_uid = uid
        user.firebase_name = name
        user.firebase_photo_url = photo_url
        user.firebase_email = email

        return (user, decoded_token)

    def authenticate_header(self, request):
        return 'Bearer'
    