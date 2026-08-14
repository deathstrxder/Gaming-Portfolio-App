import type { EmailMessage } from "./index";

/**
 * The verification email.
 *
 * Kept as data rather than inlined at the two call sites (signup and resend) so
 * both send an identical message, and so the wording can be reviewed in one
 * place. Plain text only: the site sends one kind of mail, and an HTML part
 * would add a second thing to keep in sync for no gain.
 *
 * The spam-folder warning deliberately lives in the VERIFY SCREEN, not here.
 * Anyone reading this message has already received it, so advising them to
 * check their spam folder would be addressed to exactly the people who do not
 * need it — the ones who need it never see this text at all.
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
