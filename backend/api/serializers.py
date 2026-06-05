from rest_framework import serializers
from .models import UserProfile, DailySteps, WorkoutSession


class UserProfileSerializer(serializers.ModelSerializer):
    bmi = serializers.ReadOnlyField()
    bmi_category = serializers.ReadOnlyField()

    class Meta:
        model = UserProfile
        fields = [
            'firebase_uid', 'display_name', 'email', 'photo_url',
            'age', 'weight_kg', 'height_cm', 'gender',
            'health_conditions', 'fitness_goal',
            'total_workouts', 'total_calories',
            'bmi', 'bmi_category', 'updated_at',
        ]
        read_only_fields = ['firebase_uid', 'email', 'updated_at']


class DailyStepsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySteps
        fields = ['date', 'steps', 'calories', 'updated_at']


class DailyStepsWriteSerializer(serializers.ModelSerializer):
    """Used by the mobile app to push daily steps data."""
    class Meta:
        model = DailySteps
        fields = ['date', 'steps', 'calories']


class WorkoutSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSession
        fields = [
            'session_id', 'workout_name', 'muscle_group', 'date',
            'duration_minutes', 'calories_burned', 'accuracy_score',
            'muscles_worked', 'intensity', 'ai_suggestion', 'created_at',
        ]
        read_only_fields = ['created_at']


class ChatMessageSerializer(serializers.Serializer):
    """For Firestore-backed chat messages — not a DB model."""
    id = serializers.CharField(read_only=True)
    role = serializers.ChoiceField(choices=['user', 'model'])
    content = serializers.CharField()
    timestamp = serializers.DateTimeField(read_only=True)
    source = serializers.ChoiceField(
        choices=['web', 'mobile'],
        default='web',
        read_only=True,
    )
