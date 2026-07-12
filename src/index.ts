import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config.js";
import { createEmailSender } from "./email/sender.js";
import { createSubscriber } from "./redis/subscriber.js";
import {
  createWebhookDeliverer,
  parseWebhookUrls,
} from "./webhooks/deliver.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const email = createEmailSender(env);
  const webhooks = createWebhookDeliverer(
    env.WEBHOOK_SECRET,
    parseWebhookUrls(env.WEBHOOK_URLS),
  );
  const subscriber = createSubscriber({
    redisUrl: env.REDIS_URL,
    email,
    webhooks,
  });

  const app = createApp({
    internalToken: env.INTERNAL_TOKEN,
    email,
    webhooks,
    subscriber,
  });

  try {
    await subscriber.start();
  } catch (err) {
    console.error("[boot] Redis subscribe failed — /readyz will stay down", err);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[notify] listening on :${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[notify] ${signal} — shutting down`);
    server.close();
    try {
      await subscriber.stop();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[notify] fatal", err);
  process.exit(1);
});
