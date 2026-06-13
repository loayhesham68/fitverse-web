from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/verify/', views.AuthVerifyView.as_view(), name='auth-verify'),

    # Profile
    path('profile/', views.UserProfileView.as_view(), name='profile'),

    # Dashboard summary
    path('dashboard/', views.DashboardSummaryView.as_view(), name='dashboard'),

    # Steps calendar
    path('steps/', views.DailyStepsView.as_view(), name='steps'),

    # Workout sessions
    path('sessions/', views.WorkoutSessionListView.as_view(), name='sessions'),

    # AI Coach chat
    path('chat/history/', views.ChatHistoryView.as_view(), name='chat-history'),
    path('chat/send/', views.ChatSendView.as_view(), name='chat-send'),
    path('chat/send-mobile/', views.MobileChatSyncView.as_view(), name='chat-send-mobile'),

    # APK download proxy (private GitHub release via GitHub API token)
    path('download-apk/', views.DownloadApkView.as_view(), name='download-apk'),
]
