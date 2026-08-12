"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";

/**
 * Material's visibility / visibility_off glyphs, so the closed state reads as
 * "hidden" rather than as a second, differently-drawn eye.
 */
const EYE =
  "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";

const EYE_OFF =
  "M12 7a5 5 0 0 1 5 5c0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16a3 3 0 0 0-3-3l-.17.01z";

/**
 * A password field with a show/hide toggle.
 *
 * Every prop passes through to the input, so callers keep their own styling and,
 * importantly, their own `autoComplete` — browsers key password-manager
 * behaviour off it, and swapping the field to `type="text"` while revealed must
 * not change that.
 *
 * The toggle is `type="button"`: inside a form, a button without it defaults to
 * `submit`, so revealing the password would submit the form.
 */
export function PasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Room for the toggle so a long password never runs under the icon.
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        data-testid="password-toggle"
        // Deliberately left in the tab order. It costs one extra tab stop, but a
        // keyboard-only user has the most need to check what they actually typed,
        // and skipping the control to save that stop takes the feature away from
        // exactly the people it helps most.
        className="absolute right-0 top-0 flex h-full w-12 items-center justify-center rounded-md text-muted transition-colors hover:text-neon-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-blue"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
          <path d={visible ? EYE_OFF : EYE} />
        </svg>
      </button>
    </div>
  );
}
