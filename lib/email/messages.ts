import type { EmailMessage } from "./index";

/**
 * The verification email.
 *
 * Kept as data rather than inlined at the two call sites (signup and resend) so
 * both send an identical message, and so the wording can be reviewed in one
 * place. Plain text only: the site sends one kind of mail, and an HTML part
 * would add a second thing to keep in sync for no gain.
 *
 * The spam-folder line is deliberate. Mail is sent from a gmail.com address
 * through a third-party relay, which cannot align DMARC for that domain, so a
 * share of these will be filed as junk. Saying so in the message itself is
 * cheaper than the support conversation it avoids.
 */
export function verificationEmail(to: string, code: string): EmailMessage {
  return {
    to,
    subject: `${code} is your verification code`,
    text: [
      `Your verification code is ${code}`,
      "",
      "It expires in 10 minutes. If you did not create an account, you can ignore this message.",
    ].join("\n"),
  };
}
