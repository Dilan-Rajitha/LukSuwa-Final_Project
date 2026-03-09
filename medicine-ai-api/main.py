import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

from models import MedicineQuery, MedicineResponse
from chatbot import router as chatbot_router  

load_dotenv()
OPENROUTER_KEY = os.getenv("OPENROUTER_KEY")
OPENROUTER_URL = os.getenv("OPENROUTER_URL")

app = FastAPI(title="AI Health API")
app.include_router(chatbot_router)


def call_openrouter_for_medicine(name: str, strength: str | None = None) -> str:
    """medicine name + strength - missing -> call openrouter -> return uses/indications"""
    if not OPENROUTER_KEY or not OPENROUTER_URL:
        raise RuntimeError(".env - OPENROUTER_KEY/OPENROUTER_URL missing")


    if strength:
        user_prompt = (
            f"Medicine: {name} {strength}\n"
            "Explain the main uses/indications of this medicine. "
            "If there are common cautions, mention briefly. Be concise."
        )
    else:
        user_prompt = (
            f"Medicine: {name}\n"
            "Explain the main uses/indications of this medicine. "
            "If there are common cautions, mention briefly. Be concise."
        )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "medicine-uses-api",
    }

    body = {
        # "model": "meta-llama/llama-3.3-70b-instruct:free",
        "model": "meta-llama/llama-3.3-70b-instruct",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a medical drug info assistant. "
                    "User gives a medicine name (and sometimes strength). "
                    "Return what it is used for / its indications. "
                    "Say that this is not a doctor’s advice."
                ),
            },
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    resp = requests.post(OPENROUTER_URL, headers=headers, json=body)
    if resp.status_code != 200:

        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    return data["choices"][0]["message"]["content"]


@app.post("/medicine/uses", response_model=MedicineResponse)
def get_medicine_uses(query: MedicineQuery):
    """
    POST /medicine/uses
    {
      "name": "Amoxicillin",
      "strength": "500mg"
    }
    """
    try:
        answer = call_openrouter_for_medicine(query.name, query.strength)
        return MedicineResponse(uses=answer)
    except Exception as e:

        raise HTTPException(status_code=500, detail=str(e))
