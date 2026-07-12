import { z } from "zod";

/** Redis / internal notify event payload */
export const notifyEventSchema = z.object({
  type: z.enum([
    "reservation_confirmed",
    "reservation_cancelled",
    "password_reset",
    "verify_email",
    "org_invite",
  ]),
  zone_id: z.string().min(1),
  spot_id: z.string().optional(),
  user_id: z.string().optional(),
  reservation_id: z.string().optional(),
  license_plate: z.string().optional(),
  email: z.string().email().optional(),
  /** Extra fields for non-reservation emails */
  reset_url: z.string().url().optional(),
  verify_url: z.string().url().optional(),
  invite_url: z.string().url().optional(),
  org_name: z.string().optional(),
});

export type NotifyEvent = z.infer<typeof notifyEventSchema>;
