import { Router, type Request, type Response, type NextFunction } from "express";
import type { EmailSender } from "../email/sender.js";
import { processNotifyEvent } from "../redis/subscriber.js";
import { notifyEventSchema } from "../types.js";
import type { WebhookDeliverer } from "../webhooks/deliver.js";

export interface InternalRoutesDeps {
  internalToken: string;
  email: EmailSender;
  webhooks: WebhookDeliverer;
}

function requireInternalToken(token: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header("authorization") ?? "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    const provided = bearer || req.header("x-internal-token") || "";

    if (!provided || provided !== token) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
        errors: { token: "invalid or missing INTERNAL_TOKEN" },
      });
      return;
    }
    next();
  };
}

export function createInternalRouter(deps: InternalRoutesDeps): Router {
  const router = Router();

  router.post(
    "/notify",
    requireInternalToken(deps.internalToken),
    async (req, res) => {
      const parsed = notifyEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      try {
        await processNotifyEvent(parsed.data, {
          email: deps.email,
          webhooks: deps.webhooks,
        });
        res.status(202).json({
          success: true,
          message: "Notification accepted",
          data: { type: parsed.data.type },
        });
      } catch (err) {
        console.error("[internal/notify]", err);
        res.status(500).json({
          success: false,
          message: "Failed to process notification",
          errors: {},
        });
      }
    },
  );

  return router;
}
