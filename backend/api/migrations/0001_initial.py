from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('firebase_uid', models.CharField(db_index=True, max_length=128, unique=True)),
                ('display_name', models.CharField(blank=True, max_length=255)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('photo_url', models.URLField(blank=True)),
                ('age', models.IntegerField(blank=True, null=True)),
                ('weight_kg', models.FloatField(blank=True, null=True)),
                ('height_cm', models.FloatField(blank=True, null=True)),
                ('gender', models.CharField(blank=True, default='Prefer not to say', max_length=50)),
                ('health_conditions', models.JSONField(blank=True, default=list)),
                ('fitness_goal', models.CharField(blank=True, max_length=100)),
                ('total_workouts', models.IntegerField(default=0)),
                ('total_calories', models.FloatField(default=0.0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to='auth.user')),
            ],
            options={'db_table': 'user_profiles'},
        ),
        migrations.CreateModel(
            name='DailySteps',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True)),
                ('steps', models.IntegerField(default=0)),
                ('calories', models.FloatField(default=0.0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='daily_steps', to='api.userprofile')),
            ],
            options={'db_table': 'daily_steps', 'ordering': ['-date']},
        ),
        migrations.AlterUniqueTogether(
            name='dailysteps',
            unique_together={('profile', 'date')},
        ),
        migrations.CreateModel(
            name='WorkoutSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.CharField(max_length=64, unique=True)),
                ('workout_name', models.CharField(max_length=255)),
                ('muscle_group', models.CharField(blank=True, max_length=100)),
                ('date', models.DateTimeField()),
                ('duration_minutes', models.IntegerField(default=0)),
                ('calories_burned', models.FloatField(default=0.0)),
                ('accuracy_score', models.FloatField(default=0.0)),
                ('muscles_worked', models.JSONField(default=list)),
                ('intensity', models.CharField(default='Moderate', max_length=20)),
                ('ai_suggestion', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sessions', to='api.userprofile')),
            ],
            options={'db_table': 'workout_sessions', 'ordering': ['-date']},
        ),
    ]
