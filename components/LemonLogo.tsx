interface LemonLogoProps {
  className?: string;
}

/**
 * Monochrome Lemonpay mark — a lemon wedge rendered in greyscale so it
 * adapts to light/dark surroundings without a brand accent color.
 */
export function LemonLogo({ className }: LemonLogoProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {/* Outer wedge */}
      <path
        d="M20 4 a16 16 0 1 1 0 32 a16 16 0 0 1 0 -32 z"
        fill="currentColor"
        opacity="0.08"
      />
      <path
        d="M20 4 a16 16 0 1 1 0 32 a16 16 0 0 1 0 -32 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {/* Inner segments */}
      <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.7">
        <line x1="20" y1="8" x2="20" y2="32" />
        <line x1="8" y1="20" x2="32" y2="20" />
        <line x1="11.5" y1="11.5" x2="28.5" y2="28.5" />
        <line x1="28.5" y1="11.5" x2="11.5" y2="28.5" />
      </g>
      {/* Center pip */}
      <circle cx="20" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}
