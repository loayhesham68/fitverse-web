import google.generativeai as genai
from django.conf import settings
from .firestore_service import get_chat_history, save_chat_message

GEMINI_MODEL = 'gemini-1.5-flash'


def _build_system_prompt(profile: dict) -> str:
    """Build system prompt using Firestore profile field names."""
    conditions = profile.get('healthConditions', [])
    conditions_str = ', '.join(conditions) if conditions else 'None'

    weight = profile.get('weightKg')
    height = profile.get('heightCm')
    bmi = None
    bmi_category = 'Unknown'
    if weight and height and height > 0:
        h = height / 100
        bmi = round(weight / (h * h), 1)
        if bmi < 18.5: bmi_category = 'Underweight'
        elif bmi < 25: bmi_category = 'Normal'
        elif bmi < 30: bmi_category = 'Overweight'
        else: bmi_category = 'Obese'

    return f"""You are Coach Jax, the FitVerse AI fitness and nutrition coach. You are warm, motivating, concise, and specific.

USER PROFILE:
- Name: {profile.get('name', 'Athlete')}
- Age: {profile.get('age', 'Unknown')}
- Weight: {weight or 'Unknown'} kg
- Height: {height or 'Unknown'} cm
- BMI: {bmi or 'Unknown'} ({bmi_category})
- Gender: {profile.get('gender', 'Unknown')}
- Fitness Goal: {profile.get('fitnessGoal', 'General fitness')}
- Health Conditions: {conditions_str}
- Total Workouts: {profile.get('totalWorkouts', 0)}

RULES:
- Be warm and concise. Under 300 words per response.
- Consider health conditions in all advice.
- Be specific — reference the user's actual data.
- Stay within fitness, nutrition, and recovery topics.
"""


def send_message_to_gemini(uid: str, user_message: str, profile: dict) -> str:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return "Gemini API key is not configured."

    genai.configure(api_key=api_key)

    history_docs = get_chat_history(uid, limit=50)
    gemini_history = []
    for msg in history_docs:
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        if content:
            gemini_history.append({'role': role, 'parts': [content]})

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=_build_system_prompt(profile),
    )
    chat = model.start_chat(history=gemini_history)
    response = chat.send_message(user_message)
    response_text = response.text

    save_chat_message(uid, role='user', content=user_message, source='web')
    save_chat_message(uid, role='model', content=response_text, source='web')

    return response_text
