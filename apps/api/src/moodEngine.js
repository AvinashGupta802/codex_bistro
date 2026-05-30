import { menu, normalize } from "./menu.js";

export const moods = [
  {
    id: "lazy",
    label: "Lazy",
    prompt: "Lowest effort, tasty, easy",
    brain: "Low mental energy, lethargy, low blood sugar, and a preference for the path of least resistance.",
    meaning: "Needs low effort cost with nutritional value and taste as secondary drivers.",
    foodType: "Low-effort meals with steady carbohydrates, protein, and hydration.",
    nutrientNeed: "Support gentle energy without asking the customer to do much work.",
    nutritionFocus: ["complex carbohydrates", "protein", "hydration"],
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
    foodType: "Fresh, high-energy food with quality carbohydrates, lean protein, and fluids.",
    nutrientNeed: "Refuel active muscles and keep energy steady.",
    nutritionFocus: ["quality carbohydrates", "lean protein", "electrolytes"],
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
    foodType: "Colorful meals with protein, healthy fats, and antioxidant-rich vegetables.",
    nutrientNeed: "Match the upbeat mood with colorful, celebratory food that still has substance.",
    nutritionFocus: ["protein", "healthy fats", "antioxidants"],
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
    foodType: "Warm comfort food with protein, calming carbohydrates, and minerals.",
    nutrientNeed: "Offer comfort while avoiding a purely sugar-led crash.",
    nutritionFocus: ["protein", "slow carbohydrates", "magnesium"],
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
    foodType: "Crunchy, satisfying food balanced with protein, magnesium-rich ingredients, and hydration.",
    nutrientNeed: "Satisfy stress cravings while adding nutrients that support steadier energy.",
    nutritionFocus: ["protein", "magnesium", "hydration"],
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
    foodType: "Varied meals with omega-3 friendly ingredients, vegetables, and balanced fats.",
    nutrientNeed: "Support a calm, unhurried meal with variety and texture.",
    nutritionFocus: ["omega-3 fats", "fiber", "micronutrients"],
    highlight: "Good food adds to your relaxation. Grab from below",
    keywords: ["relaxed", "calm", "peaceful", "slow", "unwind", "weekend", "easy", "chill", "free time"],
    items: ["rainbow-sushi", "authentic-ramen", "mezze-spread", "cheesecake", "ginger-ale"]
  },
  {
    id: "balanced",
    label: "Balanced",
    prompt: "Wholesome steady picks",
    brain: "Emotion is even, practical, or not strongly expressed.",
    meaning: "Recommend a steady, satisfying plate that covers energy, protein, color, and hydration.",
    foodType: "Balanced meals with fiber-rich carbohydrates, lean protein, vegetables, and water.",
    nutrientNeed: "Maintain steady energy and fullness without pushing the meal too heavy or too sweet.",
    nutritionFocus: ["fiber", "lean protein", "micronutrients"],
    highlight: "Our food will be very close to your mother's cooking. Grab from below",
    keywords: ["balanced", "neutral", "normal", "anything", "whatever", "not sure", "confused", "recommend", "wholesome", "steady"],
    items: ["greek-salad", "mediterranean-bowl", "spicy-chicken", "still-water"]
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
    const mood = moods.find((entry) => entry.id === llm.mood) ?? moods.find((entry) => entry.id === "balanced");
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
  const balanced = moods.find((mood) => mood.id === "balanced");
  return buildMoodResponse(best.score > 0 ? best.mood : balanced, best.score > 0 ? Math.min(0.94, 0.66 + best.score * 0.12) : 0.5);
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
    nutrientNeed: mood.nutrientNeed,
    nutritionFocus: mood.nutritionFocus,
    highlight: mood.highlight,
    reply: customReply
      ? `${customReply} ${mood.highlight}`
      : `${mood.label} mood makes sense. ${mood.nutrientNeed} ${mood.highlight} I would suggest ${recommendations.slice(0, 3).map((item) => item.name).join(", ")}.`,
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
  return `${itemName} fits because this mood benefits from ${mood.nutritionFocus.join(", ")}.`;
}

function logLlm(event, details) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: event.includes("failed") || event.includes("error") ? "warn" : "info",
    event,
    ...details
  }));
}
