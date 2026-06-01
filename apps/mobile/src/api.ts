import { Platform } from "react-native";
import { CartAction, CartLine, CravingResult, MoodResult } from "./types";

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};

const defaultApiUrl = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;
const simplePostHeaders = {
  "Content-Type": "text/plain;charset=UTF-8"
};
const requestTimeoutMs = 12000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly detail?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function checkApiHealth() {
  const response = await fetchWithTimeout(`${apiUrl}/health`);
  if (!response.ok) {
    throw new ApiError(`Health request failed: ${response.status}`, response.status, await safeReadText(response));
  }

  return (await response.json()) as {
    ok: boolean;
    service: string;
    version?: string;
    uptimeSeconds?: number;
    openaiConfigured?: boolean;
  };
}

export async function sendAssistantMessage(message: string, cart: CartLine[]) {
  const response = await fetchWithTimeout(`${apiUrl}/ai/order`, {
    method: "POST",
    headers: simplePostHeaders,
    body: JSON.stringify({ message, cart })
  });

  if (!response.ok) {
    throw new ApiError(`Assistant request failed: ${response.status}`, response.status, await safeReadText(response));
  }

  return (await response.json()) as {
    reply: string;
    actions: CartAction[];
    cart?: CartLine[];
    total?: number;
  };
}

export async function sendMoodMessage(message: string) {
  const response = await fetchWithTimeout(`${apiUrl}/ai/mood`, {
    method: "POST",
    headers: simplePostHeaders,
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    throw new ApiError(`Mood request failed: ${response.status}`, response.status, await safeReadText(response));
  }

  return (await response.json()) as MoodResult;
}

export async function sendCravingMessage(message: string) {
  const response = await fetchWithTimeout(`${apiUrl}/ai/craving`, {
    method: "POST",
    headers: simplePostHeaders,
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    throw new ApiError(`Craving request failed: ${response.status}`, response.status, await safeReadText(response));
  }

  return (await response.json()) as CravingResult;
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("The bistro API took too long to respond.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return undefined;
  }
}
