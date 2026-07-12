export type TemplateName =
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "password_reset"
  | "verify_email"
  | "org_invite";

export interface TemplateVars {
  zone_id?: string;
  spot_id?: string;
  reservation_id?: string;
  license_plate?: string;
  reset_url?: string;
  verify_url?: string;
  invite_url?: string;
  org_name?: string;
}

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
  ${body}
  <p style="margin-top:32px;font-size:12px;color:#666">SpotSync</p>
</body>
</html>`;
}

export function renderTemplate(
  name: TemplateName,
  vars: TemplateVars,
): { subject: string; html: string } {
  switch (name) {
    case "reservation_confirmed":
      return {
        subject: "Reservation confirmed",
        html: shell(
          "Reservation confirmed",
          `<p>Your spot is locked in.</p>
          <ul>
            <li>Zone: ${vars.zone_id ?? "—"}</li>
            <li>Spot: ${vars.spot_id ?? "—"}</li>
            <li>Reservation: ${vars.reservation_id ?? "—"}</li>
            <li>Plate: ${vars.license_plate ?? "—"}</li>
          </ul>`,
        ),
      };
    case "reservation_cancelled":
      return {
        subject: "Reservation cancelled",
        html: shell(
          "Reservation cancelled",
          `<p>Your reservation was cancelled.</p>
          <ul>
            <li>Zone: ${vars.zone_id ?? "—"}</li>
            <li>Spot: ${vars.spot_id ?? "—"}</li>
            <li>Reservation: ${vars.reservation_id ?? "—"}</li>
          </ul>`,
        ),
      };
    case "password_reset":
      return {
        subject: "Reset your SpotSync password",
        html: shell(
          "Password reset",
          `<p>Use the link below to reset your password. It expires soon.</p>
          <p><a href="${vars.reset_url ?? "#"}">Reset password</a></p>`,
        ),
      };
    case "verify_email":
      return {
        subject: "Verify your SpotSync email",
        html: shell(
          "Verify email",
          `<p>Confirm your email address:</p>
          <p><a href="${vars.verify_url ?? "#"}">Verify email</a></p>`,
        ),
      };
    case "org_invite":
      return {
        subject: `Join ${vars.org_name ?? "an organization"} on SpotSync`,
        html: shell(
          "Organization invite",
          `<p>You were invited to <strong>${vars.org_name ?? "an organization"}</strong>.</p>
          <p><a href="${vars.invite_url ?? "#"}">Accept invite</a></p>`,
        ),
      };
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown template: ${_exhaustive}`);
    }
  }
}
