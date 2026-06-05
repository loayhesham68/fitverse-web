from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """Extended profile synced from the mobile app UserModel."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    firebase_uid = models.CharField(max_length=128, unique=True, db_index=True)
    display_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    photo_url = models.URLField(blank=True)
    age = models.IntegerField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    gender = models.CharField(max_length=50, blank=True, default='Prefer not to say')
    health_conditions = models.JSONField(default=list, blank=True)
    fitness_goal = models.CharField(max_length=100, blank=True)
    total_workouts = models.IntegerField(default=0)
    total_calories = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f'{self.display_name} ({self.firebase_uid})'

    @property
    def bmi(self):
        if self.weight_kg and self.height_cm and self.height_cm > 0:
            h = self.height_cm / 100
            return round(self.weight_kg / (h * h), 1)
        return None

    @property
    def bmi_category(self):
        bmi = self.bmi
        if bmi is None:
            return 'Unknown'
        if bmi < 18.5:
            return 'Underweight'
        if bmi < 25:
            return 'Normal'
        if bmi < 30:
            return 'Overweight'
        return 'Obese'


class DailySteps(models.Model):
    """
    Stores daily step counts per user for the last 30-day calendar view.
    Written by the mobile app via the API whenever Health Connect data is synced.
    """
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='daily_steps')
    date = models.DateField(db_index=True)
    steps = models.IntegerField(default=0)
    calories = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_steps'
        unique_together = ('profile', 'date')
        ordering = ['-date']

    def __str__(self):
        return f'{self.profile.display_name} — {self.date}: {self.steps} steps'


class WorkoutSession(models.Model):
    """Mirrors SessionModel from the mobile app, stored in PostgreSQL."""
    profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='sessions')
    session_id = models.CharField(max_length=64, unique=True)  # mobile-generated ID
    workout_name = models.CharField(max_length=255)
    muscle_group = models.CharField(max_length=100, blank=True)
    date = models.DateTimeField()
    duration_minutes = models.IntegerField(default=0)
    calories_burned = models.FloatField(default=0.0)
    accuracy_score = models.FloatField(default=0.0)
    muscles_worked = models.JSONField(default=list)
    intensity = models.CharField(max_length=20, default='Moderate')
    ai_suggestion = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workout_sessions'
        ordering = ['-date']

    def __str__(self):
        return f'{self.profile.display_name} — {self.workout_name} on {self.date.date()}'
