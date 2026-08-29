import "server-only";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const FROM = process.env.EMAIL_FROM ?? "Kailon <kailongym@gmail.com>";

/** Parse the "Name <email>" form Brevo expects as a structured sender. */
function parseFrom(from: string): { name?: string; email: string } {
  const match = from.match(/^(.*)<(.+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  }
  return { email: from.trim() };
}

/**
 * Transactional email sender via Brevo (free tier, no domain needed — the
 * sender address just has to be verified once in the Brevo dashboard).
 * Falls back to console logging when BREVO_API_KEY isn't configured yet, so
 * invites/password-resets are still usable (via the logged link) locally.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.info(`[email:dev-mode] to=${params.to} subject="${params.subject}"\n${params.html}`);
    return { delivered: false as const };
  }

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseFrom(FROM),
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
      }),
    });

    if (!response.ok) {
      console.error("Email send failed", response.status, await response.text());
      return { delivered: false as const };
    }
    return { delivered: true as const };
  } catch (error) {
    console.error("Email send failed", error);
    return { delivered: false as const };
  }
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
