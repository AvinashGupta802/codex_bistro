import { Platform } from "react-native";
import { CartAction, CartLine, MoodResult } from "./types";

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};

const defaultApiUrl = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;

export async function sendAssistantMessage(message: string, cart: CartLine[]) {
  const response = await fetch(`${apiUrl}/ai/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, cart })
  });

  if (!response.ok) {
    throw new Error(`Assistant request failed: ${response.status}`);
  }

  return (await response.json()) as {
    reply: string;
    actions: CartAction[];
    cart?: CartLine[];
    total?: number;
  };
}

export async function sendMoodMessage(message: string) {
  const response = await fetch(`${apiUrl}/ai/mood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    throw new Error(`Mood request failed: ${response.status}`);
  }

  return (await response.json()) as MoodResult;
}
