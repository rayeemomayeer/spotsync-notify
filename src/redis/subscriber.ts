import { Redis } from "ioredis";
import type { EmailSender } from "../email/sender.js";
import type { NotifyEvent } from "../types.js";
import { notifyEventSchema } from "../types.js";
import type { WebhookDeliverer } from "../webhooks/deliver.js";

/** Pattern for zone-scoped SpotSync events */
export const ZONE_CHANNEL_PATTERN = "spotsync:zone:*";
/** Dedicated notify channel (BFF / API can publish here directly) */
export const NOTIFY_CHANNEL = "spotsync:notify";

export interface SubscriberDeps {
  redisUrl: string;
  email: EmailSender;
  webhooks: WebhookDeliverer;
}

export function createSubscriber(deps: SubscriberDeps) {
  const sub = new Redis(deps.redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  let ready = false;

  async function handleMessage(channel: string, raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn("[redis] invalid JSON", { channel });
      return;
    }

    const result = notifyEventSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("[redis] event schema mismatch", {
        channel,
        errors: result.error.flatten(),
      });
      return;
    }

    await processNotifyEvent(result.data, deps);
  }

  return {
    get ready() {
      return ready;
    },
    async start(): Promise<void> {
      await sub.connect();

      sub.on(
        "pmessage",
        (_pattern: string, channel: string, message: string) => {
          void handleMessage(channel, message);
        },
      );
      sub.on("message", (channel: string, message: string) => {
        void handleMessage(channel, message);
      });

      await sub.psubscribe(ZONE_CHANNEL_PATTERN);
      await sub.subscribe(NOTIFY_CHANNEL);
      ready = true;
      console.log("[redis] subscribed", {
        pattern: ZONE_CHANNEL_PATTERN,
        channel: NOTIFY_CHANNEL,
      });
    },
    async stop(): Promise<void> {
      ready = false;
      await sub.quit();
    },
  };
}

export type Subscriber = ReturnType<typeof createSubscriber>;

export async function processNotifyEvent(
  event: NotifyEvent,
  deps: Pick<SubscriberDeps, "email" | "webhooks">,
): Promise<void> {
  console.log("[notify] event", { type: event.type, zone_id: event.zone_id });

  if (event.email) {
    await deps.email.send({
      to: event.email,
      template: event.type,
      vars: {
        zone_id: event.zone_id,
        spot_id: event.spot_id,
        reservation_id: event.reservation_id,
        license_plate: event.license_plate,
        reset_url: event.reset_url,
        verify_url: event.verify_url,
        invite_url: event.invite_url,
        org_name: event.org_name,
        amount_cents: event.amount_cents,
      },
    });
  } else {
    console.log("[notify] no email on event — skip send", { type: event.type });
  }

  await deps.webhooks.deliver(event);
}
