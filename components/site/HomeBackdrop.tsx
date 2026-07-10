import Image from "next/image";

/**
 * The home page's animated GIF backdrop: slightly blurred and dimmed. On first load
 * it flies up from the bottom (the `.intro-flyup` class passed in), masked by the
 * Eddie section's `overflow-hidden`.
 */
export function HomeBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className ?? ""}`}
    >
      <Image
        src="/gaming/background.gif"
        alt=""
        fill
        sizes="100vw"
        className="scale-105 object-cover blur-sm"
      />
      {/* Dimming scrim — keeps the foreground readable */}
      <div className="absolute inset-0 bg-bg/70" />
      {/* Fade into the next section along the bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
