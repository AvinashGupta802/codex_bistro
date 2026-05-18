import { findMenuItem, menu, normalize } from "./menu.js";

const numberWords = new Map([
  ["a", 1],
  ["an", 1],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10]
]);

const sizeWords = ["small", "medium", "large"];

export function parseOrderIntent(message) {
  const text = normalize(message);
  if (!text) {
    return response("Tell me what you would like and I will update the cart.", []);
  }

  if (/\b(clear|empty|reset)\b/.test(text) && /\b(cart|order|everything)\b/.test(text)) {
    return response("I cleared the cart.", [{ type: "clear_cart" }]);
  }

  const intent = detectIntent(text);
  const fragments = splitFoodFragments(text);
  const actions = [];

  for (const fragment of fragments) {
    const item = findMenuItem(fragment);
    if (!item) continue;

    const quantity = extractQuantity(fragment);
    const modifiers = extractModifiers(fragment);

    if (intent === "remove") {
      actions.push({ type: "remove_item", itemId: item.id });
    } else if (intent === "set") {
      actions.push({ type: "set_quantity", itemId: item.id, quantity, modifiers });
    } else {
      actions.push({ type: "add_item", itemId: item.id, quantity, modifiers });
    }
  }

  if (actions.length === 0) {
    return response("I could not match that to the menu yet. Try asking for a spicy chicken sandwich, fries, salad, soup, water, or espresso tonic.", []);
  }

  return response(buildReply(actions), actions);
}

function detectIntent(text) {
  if (/\b(remove|delete|drop|take off|cancel)\b/.test(text)) return "remove";
  if (/\b(make|set|change|update)\b/.test(text) && /\b(to|quantity|qty)\b/.test(text)) return "set";
  return "add";
}

function splitFoodFragments(text) {
  return text
    .replace(/\b(please|can you|could you|i want|i would like|i'd like|add|order|get|give me|put|in my cart|to my cart|from my cart)\b/g, " ")
    .split(/\b(?:and|plus|with|,|&)\b/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractQuantity(fragment) {
  const numeric = fragment.match(/\b(\d+)\b/);
  if (numeric) return Number(numeric[1]);

  const words = fragment.split(/\s+/);
  for (const word of words) {
    if (numberWords.has(word)) return numberWords.get(word);
  }

  return 1;
}

function extractModifiers(fragment) {
  const modifiers = {};
  const size = sizeWords.find((word) => fragment.includes(word));
  if (size) modifiers.size = size;
  if (/\bextra spicy|spicier\b/.test(fragment)) modifiers.heat = "extra spicy";
  if (/\bno pickles\b/.test(fragment)) modifiers.pickles = "none";
  return modifiers;
}

function buildReply(actions) {
  const phrases = actions.map((action) => {
    const item = menu.find((entry) => entry.id === action.itemId);
    const quantity = action.quantity ?? 1;
    if (action.type === "remove_item") return item.name;
    return `${quantity} x ${item.name}`;
  });

  const verb = actions[0].type === "remove_item" ? "removed" : actions[0].type === "set_quantity" ? "updated" : "added";
  return `I ${verb} ${joinHuman(phrases)}.`;
}

function joinHuman(parts) {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

function response(reply, actions) {
  return {
    reply,
    actions,
    schemaVersion: "2026-05-15"
  };
}
