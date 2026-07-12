import { createHmac } from "node:crypto";
import type { NotifyEvent } from "../types.js";

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [200, 800, 2000];

export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export interface WebhookDeliverer {
  deliver(event: NotifyEvent): Promise<void>;
}

/**
 * HMAC-SHA256 signed POST to configured webhook URLs.
 * Retry stub: fixed backoff, no dead-letter queue yet.
 */
export function createWebhookDeliverer(
  secret: string,
  urls: string[],
): WebhookDeliverer {
  return {
    async deliver(event: NotifyEvent): Promise<void> {
      if (urls.length === 0) return;

      const body = JSON.stringify(event);
      const signature = signPayload(secret, body);

      await Promise.all(
        urls.map((url) => postWithRetry(url, body, signature)),
      );
    },
  };
}

async function postWithRetry(
  url: string,
  body: string,
  signature: string,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-spotsync-signature": signature,
          "x-spotsync-signature-alg": "hmac-sha256",
        },
        body,
      });

      if (res.ok) return;

      lastError = new Error(`HTTP ${res.status} from ${url}`);
      console.warn("[webhook] non-OK", { url, status: res.status, attempt });
    } catch (err) {
      lastError = err;
      console.warn("[webhook] request failed", { url, attempt, err });
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BACKOFF_MS[attempt] ?? 2000);
    }
  }

  console.error("[webhook] exhausted retries (stub — no DLQ)", {
    url,
    error: lastError,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseWebhookUrls(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
