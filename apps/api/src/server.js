import "./env.js";
import http from "node:http";
import { parseOrderIntent } from "./intentParser.js";
import { applyActions, cartTotal } from "./cart.js";
import { menu } from "./menu.js";
import { classifyMood, moods } from "./moodEngine.js";

const port = Number(process.env.PORT || 4000);
let requestSequence = 0;

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  const requestId = `req-${Date.now().toString(36)}-${++requestSequence}`;
  const originalEnd = res.end.bind(res);
  let responseBody = "";

  res.end = (chunk, encoding, callback) => {
    if (chunk) responseBody += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    return originalEnd(chunk, encoding, callback);
  };

  setCors(res);
  logRequest(requestId, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    logResponse(requestId, req, res, startedAt, responseBody);
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, { ok: true, service: "intelligent-bistro-api" });
      logResponse(requestId, req, res, startedAt, responseBody);
      return;
    }

    if (req.method === "GET" && req.url === "/menu") {
      sendJson(res, 200, { menu });
      logResponse(requestId, req, res, startedAt, responseBody);
      return;
    }

    if (req.method === "GET" && req.url === "/moods") {
      sendJson(res, 200, { moods: moods.map(({ id, label, prompt }) => ({ id, label, prompt })) });
      logResponse(requestId, req, res, startedAt, responseBody);
      return;
    }

    if (req.method === "POST" && req.url === "/ai/order") {
      const body = await readJson(req);
      logBody(requestId, "request_body", body);
      const result = parseOrderIntent(body.message);
      const cart = Array.isArray(body.cart) ? applyActions(body.cart, result.actions, menu) : undefined;
      sendJson(res, 200, {
        ...result,
        cart,
        total: cart ? Number(cartTotal(cart).toFixed(2)) : undefined
      });
      logResponse(requestId, req, res, startedAt, responseBody);
      return;
    }

    if (req.method === "POST" && req.url === "/ai/mood") {
      const body = await readJson(req);
      logBody(requestId, "request_body", body);
      const result = await classifyMood(body.message ?? body.mood ?? "");
      sendJson(res, 200, {
        ...result,
        schemaVersion: "2026-05-16"
      });
      logResponse(requestId, req, res, startedAt, responseBody);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
    logResponse(requestId, req, res, startedAt, responseBody);
  } catch (error) {
    sendJson(res, 500, { error: "Unexpected server error", detail: error.message });
    logError(requestId, error);
    logResponse(requestId, req, res, startedAt, responseBody);
  }
});

server.listen(port, () => {
  console.log(`Intelligent Bistro API listening on http://localhost:${port}`);
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "api_startup",
    port,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini"
  }));
});

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

function logRequest(requestId, req) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    event: "api_request",
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"] ?? null
  }));
}

function logBody(requestId, event, body) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "debug",
    event,
    requestId,
    body: sanitizeForLog(body)
  }));
}

function logResponse(requestId, req, res, startedAt, responseBody) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
    event: "api_response",
    requestId,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    durationMs: Date.now() - startedAt,
    body: parseResponseForLog(responseBody)
  }));
}

function logError(requestId, error) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "error",
    event: "api_error",
    requestId,
    message: error.message,
    stack: error.stack
  }));
}

function parseResponseForLog(responseBody) {
  if (!responseBody) return null;
  try {
    return sanitizeForLog(JSON.parse(responseBody));
  } catch {
    return truncate(responseBody);
  }
}

function sanitizeForLog(value) {
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (!value || typeof value !== "object") return typeof value === "string" ? truncate(value) : value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (/authorization|token|secret|password|api.?key/i.test(key)) return [key, "[redacted]"];
      return [key, sanitizeForLog(entry)];
    })
  );
}

function truncate(value) {
  return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}
