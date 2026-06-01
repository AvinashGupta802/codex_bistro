import { menu, normalize } from "./menu.js";

const cravingRules = [
  {
    id: "crunchy-juicy",
    label: "Crunchy outside, juicy inside",
    signals: ["crunchy", "crispy", "crisp", "juicy", "tender", "outside", "inside"],
    items: ["fried-chicken", "spicy-chicken", "loaded-nachos"],
    reason: "crisp texture with a warm, juicy center"
  },
  {
    id: "tangy-drink",
    label: "Tangy drink",
    signals: ["tangy", "zesty", "sour", "citrus", "lime", "lemon", "refreshing"],
    items: ["ginger-ale", "kombucha", "espresso-tonic", "cold-pressed-juice"],
    reason: "bright acidity and a refreshing finish"
  },
  {
    id: "creamy-comfort",
    label: "Creamy comfort",
    signals: ["creamy", "cheesy", "soft", "rich", "comfort", "warm"],
    items: ["alfredo-pasta", "mac-cheese", "classic-mac", "butter-chicken"],
    reason: "creamy texture and a comforting finish"
  },
  {
    id: "fresh-light",
    label: "Fresh and light",
    signals: ["fresh", "light", "healthy", "clean", "green", "salad"],
    items: ["greek-salad", "mediterranean-bowl", "poke-bowl", "cold-pressed-juice"],
    reason: "fresh vegetables, color, and lighter energy"
  },
  {
    id: "spicy-bold",
    label: "Spicy and bold",
    signals: ["spicy", "hot", "bold", "masala", "pepper", "fiery"],
    items: ["spicy-chicken", "thai-curry", "butter-chicken", "tacos"],
    reason: "bold heat and layered flavor"
  },
  {
    id: "sweet-dessert",
    label: "Sweet finish",
    signals: ["sweet", "dessert", "chocolate", "cake", "shake", "cold sweet"],
    items: ["choco-lava", "cheesecake", "milkshake", "hot-cocoa"],
    reason: "sweetness and a dessert-style finish"
  }
];

export function matchCraving(input) {
  const text = normalize(input);
  const scoredRules = cravingRules
    .map((rule) => ({
      ...rule,
      score: rule.signals.reduce((sum, signal) => sum + (text.includes(normalize(signal)) ? 1 : 0), 0)
    }))
    .filter((rule) => rule.score > 0)
    .sort((a, b) => b.score - a.score);

  const selectedRules = scoredRules.slice(0, text.includes("drink") || text.includes("beverage") ? 2 : 1);
  if (selectedRules.length === 0) {
    return {
      label: "Chef's best guess",
      confidence: 0.45,
      reply: "I could not read a clear texture or flavor cue yet. Try words like crunchy, juicy, tangy, creamy, spicy, fresh, or sweet.",
      flavorProfile: [],
      recommendations: [],
      actions: []
    };
  }

  const itemIds = unique(
    selectedRules.flatMap((rule) => rule.items).filter((itemId) => {
      if (!text.includes("drink") && menu.find((item) => item.id === itemId)?.category === "Drinks") return false;
      return true;
    })
  ).slice(0, 4);

  const recommendations = itemIds.map((itemId) => {
    const item = menu.find((entry) => entry.id === itemId);
    const rule = selectedRules.find((candidate) => candidate.items.includes(itemId)) ?? selectedRules[0];
    return {
      itemId,
      name: item.name,
      price: item.price,
      icon: item.icon,
      accent: item.accent,
      image: item.image,
      reason: `${item.name} matches your request for ${rule.reason}.`
    };
  });

  const topFood = recommendations.find((item) => menu.find((entry) => entry.id === item.itemId)?.category !== "Drinks");
  const topDrink = recommendations.find((item) => menu.find((entry) => entry.id === item.itemId)?.category === "Drinks");
  const actionItems = unique([topFood?.itemId, topDrink?.itemId].filter(Boolean));
  const matchedNames = actionItems.length > 0
    ? actionItems.map((itemId) => menu.find((entry) => entry.id === itemId)?.name).filter(Boolean)
    : recommendations.slice(0, 3).map((item) => item.name);

  return {
    label: selectedRules.map((rule) => rule.label).join(" + "),
    confidence: Math.min(0.94, 0.62 + selectedRules.reduce((sum, rule) => sum + rule.score, 0) * 0.08),
    reply: `I matched your craving to ${matchedNames.join(" with ")}.`,
    flavorProfile: selectedRules.map((rule) => rule.label),
    recommendations,
    actions: actionItems.map((itemId) => ({ type: "add_item", itemId, quantity: 1 }))
  };
}

function unique(values) {
  return [...new Set(values)];
}
