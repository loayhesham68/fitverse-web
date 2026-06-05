"""
WebSocket consumer for real-time dashboard data.
The mobile app pushes new health data → Django sends it to connected web clients
via the user's personal channel group.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from firebase_admin import auth as firebase_auth
from api.authentication import get_firebase_app


class DashboardConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        # Authenticate via token in query string
        token = self.scope['query_string'].decode()
        token = dict(x.split('=') for x in token.split('&') if '=' in x).get('token', '')

        uid = await self.verify_token(token)
        if not uid:
            await self.close(code=4001)
            return

        self.uid = uid
        self.group_name = f'dashboard_{uid}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({'type': 'connected', 'uid': uid}))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Client can send ping
        data = json.loads(text_data)
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    # Handler for messages sent to this group from views
    async def dashboard_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'data': event['data'],
        }))

    @database_sync_to_async
    def verify_token(self, token):
        if not token:
            return None
        try:
            get_firebase_app()
            decoded = firebase_auth.verify_id_token(token)
            return decoded.get('uid')
        except Exception:
            return None
