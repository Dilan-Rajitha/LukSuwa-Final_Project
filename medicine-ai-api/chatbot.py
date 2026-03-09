import os
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field  

load_dotenv()
OPENROUTER_KEY = os.getenv("OPENROUTER_KEY")
OPENROUTER_URL = os.getenv("OPENROUTER_URL")

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class ChatMessage(BaseModel):
    message: str = Field(
        ...,
        example="I have a mild fever and sore throat. What can I do at home?"
    )


class ChatReply(BaseModel):
    reply: str = Field(
        ...,
        example=(
            "You can rest, drink plenty of warm fluids, and use salt-water gargles to soothe your throat. "
            "You may take paracetamol if you can safely use it. If symptoms get worse or last more than 2–3 days, please see a doctor."
        )
    )


def call_health_chatbot(user_message: str) -> str:
    if not OPENROUTER_KEY or not OPENROUTER_URL:
        raise RuntimeError("OpenRouter config missing")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "health-chatbot",
    }

    body = {
        # "model": "meta-llama/llama-3.3-70b-instruct:free",
        "model": "meta-llama/llama-3.3-70b-instruct",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a friendly health assistant for a mobile app. "
                    "You ONLY answer health, wellness, medicine-usage, symptoms, prevention, diet, exercise, "
                    "mental health basics. You do NOT diagnose or prescribe medicine. "
                    "If user asks about other topics, say you only handle health questions. "
                    "Keep answers clear and short, 3–5 sentences, and end with: "
                    "'If this gets worse, please see a doctor.'"
                ),
            },
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.4,
    }

    resp = requests.post(OPENROUTER_URL, headers=headers, json=body)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    return data["choices"][0]["message"]["content"]


@router.post(
    "/message",
    response_model=ChatReply,
    summary="Chat with the health assistant",
    description="Send a health-related question and get a short, friendly answer."
)
def chat_with_bot(msg: ChatMessage):
    """
    POST /chatbot/message
    {
      "message": "I have a mild fever and sore throat. What can I do at home?"
    }
    """
    try:
        answer = call_health_chatbot(msg.message)
        return ChatReply(reply=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
