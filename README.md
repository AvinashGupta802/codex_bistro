# The Intelligent Bistro

A polished Expo mobile ordering experience backed by a Node.js API that converts natural language into structured cart actions.

## What is included

- `apps/mobile`: Expo React Native app with menu browsing, cart management, and a conversational ordering assistant.
- `apps/api`: Dependency-light Node.js API with a deterministic intent parser and cart action schema.
- `apps/api/test`: Plain Node tests for common order, remove, and quantity-change requests.

## Quick Start

```bash
# API
node apps/api/src/server.js

# Mobile, after installing dependencies
cd apps/mobile
npm install
npx expo start
```

The mobile app defaults to `http://localhost:4000`. Set `EXPO_PUBLIC_API_URL` if your device needs a LAN URL, for example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.15:4000 npx expo start
```

On Android emulator builds, the app defaults to `http://10.0.2.2:4000` because Android cannot reach your computer through `localhost`. For Expo Go on a physical phone, set `EXPO_PUBLIC_API_URL` to your laptop's LAN IP.

## API

```http
GET /health
GET /menu
GET /moods
POST /ai/order
POST /ai/mood
```

Every API request now writes structured JSON logs to the server console, including:

- `api_request`: request id, method, URL, and user agent
- `request_body`: sanitized JSON request body for POST routes
- `api_response`: status code, duration, and sanitized response body
- `api_error`: error message and stack when a route fails

Sensitive fields such as API keys, passwords, secrets, authorization headers, and tokens are redacted automatically.

Example request:

```json
{
  "message": "Add two spicy chicken sandwiches and a large water"
}
```

Example response:

```json
{
  "reply": "I added 2 Spicy Chicken Sandwiches and 1 Still Water.",
  "actions": [
    {
      "type": "add_item",
      "itemId": "spicy-chicken",
      "quantity": 2
    },
    {
      "type": "add_item",
      "itemId": "still-water",
      "quantity": 1,
      "modifiers": {
        "size": "large"
      }
    }
  ]
}
```

## Notes For Submission

For the Loom walkthrough, show:

1. Browsing and adding from the menu.
2. Conversational commands like `add two spicy chicken sandwiches and a large water`.
3. Cart updates from both UI and assistant input.
4. Code structure in `apps/mobile` and `apps/api`.

The API parser is designed to work without paid AI services for demo reliability. It can be swapped behind `/ai/order` for an LLM call that returns the same action schema.

## Mood-Guided Ordering

The assistant now starts by asking the customer to describe their mood naturally, then classifies the answer into the seven categories from `Food2.xlsx`:

- Lazy
- Energetic
- Happy
- Sad
- Stressed
- Relaxed
- Neutral

`POST /ai/mood` returns the classified mood, confidence, the mood reasoning, recommended menu items with reasons, and ready-to-apply cart actions. The backend uses the spreadsheet-derived classifier by default. If `OPENAI_API_KEY` is set, it calls the OpenAI Responses API first and falls back to the local classifier if the LLM is unavailable.

To enable LLM classification:

```bash
cd apps/api
copy .env.example .env
# add OPENAI_API_KEY in .env
node src/server.js
```

The mobile app shows a natural-language mood prompt, quick mood examples, visual dish badges, recommendation cards, and an `Add meal` button while still supporting direct commands like `add two spicy chicken sandwiches`.
