# SpotSync Notify

Consumes Redis pub/sub reservation events and sends email via [Resend](https://resend.com) (free tier). Also delivers HMAC-signed webhook POSTs (retry stub). BFF can trigger emails over an internal HTTP route.

## Stack

- Express + TypeScript (ESM)
- ioredis (subscribe)
- Resend (email) — log-only when `RESEND_API_KEY` empty
- zod (env + event validation)
- helmet

## Event payload

```json
{
  "type": "reservation_confirmed",
  "zone_id": "zone-1",
  "spot_id": "A-12",
  "user_id": "usr_1",
  "reservation_id": "res_1",
  "license_plate": "ABC-123",
  "email": "driver@example.com"
}
```

`type` values: `reservation_confirmed` | `reservation_cancelled` | `password_reset` | `verify_email` | `org_invite`

Optional extras for auth/org emails: `reset_url`, `verify_url`, `invite_url`, `org_name`.

## Redis channels

| Channel / pattern | Purpose |
| --- | --- |
| `spotsync:zone:*` | Zone-scoped events (psubscribe) |
| `spotsync:notify` | Dedicated notify channel |

## HTTP

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/healthz` | — | Liveness |
| GET | `/readyz` | — | Ready when Redis subscribed |
| POST | `/internal/notify` | `Authorization: Bearer <INTERNAL_TOKEN>` or `X-Internal-Token` | BFF-triggered notify |

## Setup

```bash
cp .env.example .env
# set INTERNAL_TOKEN (required), REDIS_URL, optional RESEND_API_KEY / EMAIL_FROM
npm install
npm run dev
```

Production:

```bash
npm run build
npm start
```

Docker:

```bash
docker build -t spotsync-notify .
docker run --env-file .env -p 3100:3100 spotsync-notify
```

## Env

See `.env.example`. Without `RESEND_API_KEY`, emails print to stdout (log-only).

## Deploy (Render free)

`render.yaml` defines a free Node web service. Set secrets in the Render dashboard (`REDIS_URL`, `RESEND_API_KEY`, `INTERNAL_TOKEN`, …).
