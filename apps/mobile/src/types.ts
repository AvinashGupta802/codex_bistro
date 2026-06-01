export type MenuItem = {
  id: string;
  name: string;
  shortName: string;
  category:
    | "American"
    | "Italian"
    | "Mexican"
    | "Mediterranean"
    | "Vietnamese"
    | "Japanese"
    | "Asian"
    | "Indian"
    | "Thai"
    | "Comfort"
    | "Steakhouse"
    | "Dessert"
    | "Healthy"
    | "Drinks";
  price: number;
  accent: string;
  icon: string;
  image: string;
  tags: string[];
};

export type CartLine = {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: Record<string, string>;
};

export type CartAction =
  | { type: "add_item"; itemId: string; quantity: number; modifiers?: Record<string, string> }
  | { type: "remove_item"; itemId: string }
  | { type: "set_quantity"; itemId: string; quantity: number; modifiers?: Record<string, string> }
  | { type: "clear_cart" };

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export type MoodId =
  | "lazy"
  | "energetic"
  | "happy"
  | "sad"
  | "stressed"
  | "relaxed"
  | "balanced";

export type LegacyMoodId =
  | "comfort"
  | "energized"
  | "light"
  | "indulgent"
  | "focused"
  | "adventurous"
  | "chill";

export type MoodOption = {
  id: MoodId;
  label: string;
  prompt: string;
  icon: string;
};

export type MoodRecommendation = {
  itemId: string;
  name: string;
  price: number;
  icon?: string;
  accent?: string;
  image?: string;
  reason: string;
};

export type CravingResult = {
  label: string;
  confidence: number;
  reply: string;
  flavorProfile: string[];
  recommendations: MoodRecommendation[];
  actions: CartAction[];
};

export type MoodResult = {
  mood: MoodId;
  label: string;
  confidence: number;
  brain?: string;
  meaning?: string;
  foodType?: string;
  nutrientNeed?: string;
  nutritionFocus?: string[];
  highlight?: string;
  reply: string;
  recommendations: MoodRecommendation[];
  actions: CartAction[];
};
