# Health Chatbot API & Medicine Search API

This is an AI-powered Health Assistant API. It can answer health-related questions and search for medicine uses.

## Endpoints:
1. `/medicine/uses` - Get the uses of a specified medicine (name & strength).
2. `/chatbot/message` - Chat with a health assistant to get health-related advice.

## How to Use:
- Send a POST request to `/medicine/uses` with:
  ```json
  {
    "name": "Paracetamol",
    "strength": "500mg"
  }
