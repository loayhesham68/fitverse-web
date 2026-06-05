import logging
import google.generativeai as genai
from django.conf import settings
from .firestore_service import get_chat_history, save_chat_message

logger = logging.getLogger(__name__)
GEMINI_MODEL = 'gemini-2.5-flash'


def _build_system_prompt(profile: dict) -> str:
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

    return f"""You are FitVerse Coach, the FitVerse AI fitness and nutrition coach. You are warm, motivating, concise, and specific.

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
        raise Exception("GEMINI_API_KEY is not configured.")

    logger.info(f'Sending message to Gemini for uid: {uid}')

    try:
        genai.configure(api_key=api_key)
    except Exception as e:
        logger.error(f'Gemini configure failed: {e}')
        raise

    try:
        history_docs = get_chat_history(uid, limit=50)
        logger.info(f'Loaded {len(history_docs)} chat history messages')
    except Exception as e:
        logger.error(f'Failed to load chat history: {e}')
        history_docs = []

    gemini_history = []
    for msg in history_docs:
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        if content:
            gemini_history.append({'role': role, 'parts': [content]})

    try:
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=_build_system_prompt(profile),
        )
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(user_message)
        response_text = response.text
        logger.info('Gemini response received successfully')
    except Exception as e:
        logger.error(f'Gemini API call failed: {e}')
        raise

    try:
        save_chat_message(uid, role='user', content=user_message, source='web')
        save_chat_message(uid, role='model', content=response_text, source='web')
    except Exception as e:
        logger.error(f'Failed to save chat messages: {e}')

    return response_text
