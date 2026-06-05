import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fitverse.settings')

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import api.routing

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        URLRouter(api.routing.websocket_urlpatterns)
    ),
})
