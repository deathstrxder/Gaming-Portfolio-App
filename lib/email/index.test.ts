import { describe, it, expect, vi, afterEach } from "vitest";
import { getMailer } from "./index";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const BREVO_ENV = {
  BREVO_API_KEY: "xkeysib-test",
  BREVO_SENDER_EMAIL: "sender@example.com",
  BREVO_SENDER_NAME: "Sender Name",
};

describe("getMailer", () => {
  it("uses the console mailer outside production when no API key is set", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const mailer = getMailer({ NODE_ENV: "test" });

    await mailer.send({ to: "a@b.test", subject: "Code", text: "123456" });

    expect(log).toHaveBeenCalled();
  });

  /**
   * A no-op mailer in production would leave every new user permanently
   * unverifiable, with nothing in the logs to say why. Failing loudly at the
   * point of misconfiguration is strictly better than a signup flow that
   * appears to work and never delivers.
   */
  it("refuses to fall back to the console mailer in production", async () => {
    const mailer = getMailer({ NODE_ENV: "production" });
    await expect(mailer.send({ to: "a@b.test", subject: "s", text: "t" })).rejects.toThrow(
      /BREVO_API_KEY/,
    );
  });

  it("posts to the Brevo API with the key and configured sender", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const mailer = getMailer({ ...BREVO_ENV, NODE_ENV: "production" });
    await mailer.send({ to: "user@example.com", subject: "Your code", text: "123456" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect(init.headers["api-key"]).toBe("xkeysib-test");

    const body = JSON.parse(init.body);
    expect(body.sender).toEqual({ email: "sender@example.com", name: "Sender Name" });
    expect(body.to).toEqual([{ email: "user@example.com" }]);
    expect(body.subject).toBe("Your code");
    expect(body.textContent).toBe("123456");
  });

  /**
   * The signup route turns a rejection here into a 503 and keeps the account so
   * the user can resend. That recovery only happens if a failed send actually
   * rejects rather than resolving quietly on a 4xx.
   */
  it("rejects when Brevo returns a non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"message":"unauthorised"}', { status: 401 })),
    );

    const mailer = getMailer({ ...BREVO_ENV, NODE_ENV: "production" });
    await expect(mailer.send({ to: "a@b.test", subject: "s", text: "t" })).rejects.toThrow();
  });

  it("rejects when the sender address is not configured", async () => {
    const mailer = getMailer({ BREVO_API_KEY: "xkeysib-test", NODE_ENV: "production" });
    await expect(mailer.send({ to: "a@b.test", subject: "s", text: "t" })).rejects.toThrow(
      /BREVO_SENDER_EMAIL/,
    );
  });

  /**
   * The code must never reach the browser again — that was the original defect.
   * The console mailer is the development affordance, and it writes to server
   * stdout precisely because nothing client-side can read it.
   */
  it("console mailer writes the body to stdout, not to any returned value", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const mailer = getMailer({ NODE_ENV: "development" });

    const returned = await mailer.send({ to: "a@b.test", subject: "s", text: "654321" });

    expect(returned).toBeUndefined();
    expect(log.mock.calls.flat().join(" ")).toContain("654321");
  });
});
