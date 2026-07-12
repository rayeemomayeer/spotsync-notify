import { Resend } from "resend";
import type { Env } from "../config.js";
import { renderTemplate, type TemplateName, type TemplateVars } from "./templates.js";

export interface SendEmailInput {
  to: string;
  template: TemplateName;
  vars?: TemplateVars;
}

export function createEmailSender(env: Env) {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const logOnly = apiKey.length === 0;
  const resend = logOnly ? null : new Resend(apiKey);

  if (logOnly) {
    console.warn("[email] RESEND_API_KEY missing — log-only mode");
  }

  return {
    logOnly,
    async send({ to, template, vars = {} }: SendEmailInput): Promise<void> {
      const { subject, html } = renderTemplate(template, vars);

      if (logOnly || !resend) {
        console.log("[email:log]", { to, subject, template, vars });
        return;
      }

      const { error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      });

      if (error) {
        throw new Error(`Resend failed: ${error.message}`);
      }
    },
  };
}

export type EmailSender = ReturnType<typeof createEmailSender>;
