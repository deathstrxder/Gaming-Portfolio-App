export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

type Env = Record<string, string | undefined>;

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Writes the message to SERVER stdout.
 *
 * This is the development affordance that replaces the original defect, where
 * the verification code travelled back in the signup route's HTTP response and
 * was rendered in the browser. Anything reachable by the client is a leak; the
 * server's own log is not, which is exactly why the fallback takes this shape
 * rather than, say, returning the code to the caller in development.
 */
const consoleMailer: Mailer = {
  async send({ to, subject, text }) {
    console.log(`[email:console] to=${to} subject=${subject}\n${text}`);
  },
};

function brevoMailer(env: Env): Mailer {
  return {
    async send({ to, subject, text }) {
      const response = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
          "api-key": required(env, "BREVO_API_KEY"),
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: required(env, "BREVO_SENDER_EMAIL"),
            name: required(env, "BREVO_SENDER_NAME"),
          },
          to: [{ email: to }],
          subject,
          textContent: text,
        }),
      });

      // Must reject rather than resolve quietly: the signup route turns a
      // rejection into a 503 and keeps the account so the user can resend, and
      // that recovery never happens if a 401 looks like success here.
      if (!response.ok) {
        throw new Error(`Brevo responded ${response.status}`);
      }
    },
  };
}

/**
 * Resolved per call rather than at module load, matching lib/auth/google.ts:18,
 * so a missing variable surfaces at request time inside the route that needs it
 * instead of crashing app startup.
 *
 * In production a missing key is an error, never a silent no-op. A no-op mailer
 * on the deployed site would leave every new user permanently unable to verify,
 * with nothing in the logs explaining why — strictly worse than a loud failure
 * at the point of misconfiguration.
 */
export function getMailer(env: Env = process.env): Mailer {
  const key = env.BREVO_API_KEY?.trim();
  if (key) return brevoMailer(env);

  if (env.NODE_ENV === "production") {
    return {
      async send() {
        throw new Error(
          "BREVO_API_KEY is not set. Refusing to silently drop mail in production.",
        );
      },
    };
  }

  return consoleMailer;
}
