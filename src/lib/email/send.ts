import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Kailon <onboarding@resend.dev>";

/**
 * Transactional email sender. Falls back to console logging when
 * RESEND_API_KEY isn't configured yet, so invites/password-resets are still
 * usable (via the logged link) during local setup before email is wired up.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.info(`[email:dev-mode] to=${params.to} subject="${params.subject}"\n${params.html}`);
    return { delivered: false as const };
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error("Email send failed", error);
    return { delivered: false as const };
  }
  return { delivered: true as const };
}

export function inviteEmailHtml(params: { gymName: string; role: string; acceptUrl: string }) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>You've been invited to ${params.gymName} on Kailon</h2>
      <p>You've been added as a <strong>${params.role.toLowerCase()}</strong>.</p>
      <p><a href="${params.acceptUrl}" style="background:#e35a1f;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Accept invitation</a></p>
      <p>If the button doesn't work, copy this link: ${params.acceptUrl}</p>
    </div>
  `;
}

export function passwordResetEmailHtml(params: { resetUrl: string }) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your Kailon password</h2>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      <p><a href="${params.resetUrl}" style="background:#e35a1f;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reset password</a></p>
    </div>
  `;
}
