import { menu, normalize } from "./menu.js";

export const moods = [
  {
    id: "lazy",
    label: "Lazy",
    prompt: "Lowest effort, tasty, easy",
    brain: "Low mental energy, lethargy, low blood sugar, and a preference for the path of least resistance.",
    meaning: "Needs low effort cost with nutritional value and taste as secondary drivers.",
    foodType: "Highly palatable, simple carbohydrate, high sugar, soft and bland food, edible with one hand or a single spoon.",
    highlight: "We will even save your walk to your refrigerator. Grab from below",
    keywords: ["lazy", "tired", "low energy", "lethargic", "exhausted", "easy", "low effort", "sleepy", "drained"],
    items: ["pizza", "truffle-burger", "fries", "alfredo-pasta", "mac-cheese", "tacos", "chicken-burrito", "milkshake", "sparkling-soda", "warm-latte"]
  },
  {
    id: "energetic",
    label: "Energetic",
    prompt: "Alert, active, ready",
    brain: "High norepinephrine, dopamine, motivation, and electrical activity.",
    meaning: "Medium effort is acceptable, and chewing helps maintain mental alertness.",
    foodType: "Assembly-friendly, fresh, high-energy food with non-sugary drinks.",
    highlight: "Food is fuel. Grab from below",
    keywords: ["energetic", "energy", "active", "alert", "motivated", "fresh", "awake", "workout", "strong"],
    items: ["mediterranean-bowl", "vietnamese-bowl", "mexican-bowl", "greek-salad", "iced-tea", "cold-pressed-juice", "kombucha"]
  },
  {
    id: "happy",
    label: "Happy",
    prompt: "Bright, social, premium",
    brain: "The brain is in an upward state and dopamine is already high.",
    meaning: "Willing to wait and pay more for freshness, quality, and anticipation.",
    foodType: "Bright flavor, freshness, stimulation, social connection, and good quality.",
    highlight: "Laughter is brightest in the place where food is. Grab from below",
    keywords: ["happy", "joy", "excited", "celebrate", "positive", "fun", "social", "premium", "fresh"],
    items: ["rainbow-sushi", "colorful-stir-fry", "rare-steak", "poke-bowl", "thai-curry"]
  },
  {
    id: "sad",
    label: "Sad",
    prompt: "Warm, soft comfort",
    brain: "Lower serotonin and increased cortisol can drive immediate sensory comfort seeking.",
    meaning: "Prefers mushy, creamy, warm food and avoids extreme sour or bitter flavors.",
    foodType: "Dessert-friendly, one-bowl, warm food that feels emotionally comforting.",
    highlight: "No man is lonely while eating spaghetti. Grab from below",
    keywords: ["sad", "down", "upset", "lonely", "comfort", "cry", "low", "heartbroken", "bad day"],
    items: ["classic-mac", "butter-chicken", "choco-lava", "hot-cocoa", "malt-beverage"]
  },
  {
    id: "stressed",
    label: "Stressed",
    prompt: "Crunchy, salty, calming",
    brain: "Increased cortisol and carb cravings can be a physiological attempt to feel calm.",
    meaning: "Crunchy food releases jaw tension and the goal is anxiety reduction.",
    foodType: "Salty and crunchy.",
    highlight: "Stressed is nothing but desserts spelled in the wrong way. Grab from below",
    keywords: ["stressed", "stress", "anxious", "anxiety", "pressure", "deadline", "tense", "overwhelmed", "worried"],
    items: ["fried-chicken", "loaded-nachos", "pizza"]
  },
  {
    id: "relaxed",
    label: "Relaxed",
    prompt: "Slow, varied, high-end",
    brain: "Digestion is better and flavor receptors are more sensitive.",
    meaning: "Ready to spend time on a better spread or higher-end food.",
    foodType: "Varied and nutritious.",
    highlight: "Good food adds to your relaxation. Grab from below",
    keywords: ["relaxed", "calm", "peaceful", "slow", "unwind", "weekend", "easy", "chill", "free time"],
    items: ["rainbow-sushi", "authentic-ramen", "mezze-spread", "cheesecake", "ginger-ale"]
  },
  {
    id: "neutral",
    label: "Neutral",
    prompt: "Trending picks",
    brain: "Emotion is unclear or not strongly expressed.",
    meaning: "Recommend what is popular and easy to accept.",
    foodType: "Trending, balanced, generally liked food.",
    highlight: "Our food will be very close to your mother's cooking. Grab from below",
    keywords: ["neutral", "normal", "anything", "whatever", "not sure", "confused", "recommend", "trending"],
    items: ["spicy-chicken", "truffle-burger", "rainbow-sushi", "still-water"]
  }
];

export async function classifyMood(input) {
  const llm = await classifyMoodWithLlm(input).catch((error) => {
    logLlm("llm_classification_error", {
      message: error.message,
      cause: error.cause?.message ?? null
    });
    return null;
  });

  if (llm?.mood) {
    const mood = moods.find((entry) => entry.id === llm.mood) ?? moods.find((entry) => entry.id === "neutral");
    return {
      ...buildMoodResponse(mood, llm.confidence ?? 0.82, llm.customerReply),
      classifier: {
        source: "llm",
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
      }
    };
  }

  return {
    ...classifyMoodLocally(input),
    classifier: {
      source: "local",
      model: null
    }
  };
}

export function classifyMoodLocally(input) {
  const text = normalize(input);
  const direct = moods.find((mood) => normalize(mood.label) === text || mood.id === text);
  if (direct) return buildMoodResponse(direct, 0.98);

  const scored = moods
    .map((mood) => ({
      mood,
      score: mood.keywords.reduce((sum, keyword) => sum + (text.includes(normalize(keyword)) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const neutral = moods.find((mood) => mood.id === "neutral");
  return buildMoodResponse(best.score > 0 ? best.mood : neutral, best.score > 0 ? Math.min(0.94, 0.66 + best.score * 0.12) : 0.5);
}

export function buildMoodResponse(mood, confidence, customReply) {
  const recommendations = mood.items.map((itemId) => {
    const item = menu.find((entry) => entry.id === itemId);
    return {
      itemId,
      name: item.name,
      price: item.price,
      icon: item.icon,
      accent: item.accent,
      image: item.image,
      reason: recommendationReason(mood.id, item.name)
    };
  });

  return {
    mood: mood.id,
    label: mood.label,
    confidence,
    brain: mood.brain,
    meaning: mood.meaning,
    foodType: mood.foodType,
    highlight: mood.highlight,
    reply: customReply
      ? `${customReply} ${mood.highlight}`
      : `${mood.label} mood makes sense. ${mood.meaning} ${mood.highlight} I would suggest ${recommendations.slice(0, 3).map((item) => item.name).join(", ")}.`,
    recommendations,
    actions: recommendations.slice(0, 3).map((item) => ({ type: "add_item", itemId: item.itemId, quantity: 1 }))
  };
}

async function classifyMoodWithLlm(input) {
  if (!process.env.OPENAI_API_KEY) {
    logLlm("llm_classification_skipped", { reason: "OPENAI_API_KEY is not set" });
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const labels = moods.map((mood) => `${mood.id}: ${mood.label} - ${mood.meaning}`).join("\n");
  logLlm("llm_classification_start", { model, inputPreview: String(input || "").slice(0, 160) });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: `Classify the customer's natural language mood into exactly one of these restaurant mood categories.\n${labels}\nReturn JSON only.`
        },
        {
          role: "user",
          content: String(input || "")
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "mood_classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              mood: { type: "string", enum: moods.map((mood) => mood.id) },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              customerReply: { type: "string" }
            },
            required: ["mood", "confidence", "customerReply"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logLlm("llm_classification_failed", {
      model,
      status: response.status,
      statusText: response.statusText,
      detail: detail.slice(0, 800)
    });
    return null;
  }

  const data = await response.json();
  const text = data.output_text ?? data.output?.flatMap((part) => part.content ?? []).find((part) => part.type === "output_text")?.text;
  if (!text) {
    logLlm("llm_classification_failed", { model, reason: "No output_text in response" });
    return null;
  }

  const parsed = JSON.parse(text);
  logLlm("llm_classification_success", { model, mood: parsed.mood, confidence: parsed.confidence });
  return parsed;
}

function recommendationReason(moodId, itemName) {
  const mood = moods.find((entry) => entry.id === moodId);
  return `${itemName} fits because this mood leans toward ${mood.foodType.toLowerCase()}`;
}

function logLlm(event, details) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: event.includes("failed") || event.includes("error") ? "warn" : "info",
    event,
    ...details
  }));
}
