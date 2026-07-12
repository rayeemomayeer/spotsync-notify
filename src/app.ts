import express from "express";
import helmet from "helmet";
import type { Subscriber } from "./redis/subscriber.js";
import { createInternalRouter, type InternalRoutesDeps } from "./routes/internal.js";

export interface AppDeps extends InternalRoutesDeps {
  subscriber: Subscriber;
}

export function createApp(deps: AppDeps) {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: "64kb" }));

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/readyz", (_req, res) => {
    if (!deps.subscriber.ready) {
      res.status(503).json({ status: "not_ready", redis: false });
      return;
    }
    res.status(200).json({ status: "ready", redis: true });
  });

  app.use("/internal", createInternalRouter(deps));

  return app;
}
