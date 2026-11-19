/**
 * Static stand-in for the hero's glass D (mobile, reduced motion, no WebGL2, and
 * the moment before the WebGL scene fades in). Same outline as the 3D geometry in
 * GlassD.tsx: a stem plus a half-disc bowl with a matching counter, so the swap
 * reads as the same object. No animation, no JS.
 */
export function StaticD() {
  return (
    <>
      <div className="bg-room absolute inset-0" />
      <svg
        viewBox="-1.05 -1.25 2.3 2.5"
        className="absolute left-1/2 top-[24%] w-[62vw] max-w-[460px] -translate-x-1/2 md:left-auto md:right-[12%] md:top-[26%] md:w-[34vw] md:translate-x-0"
      >
        <defs>
          <linearGradient id="d-fill" x1="0" y1="-1" x2="0.4" y2="1" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#8b74ff" stopOpacity="0.32" />
            <stop offset="0.55" stopColor="#3b24b8" stopOpacity="0.18" />
            <stop offset="1" stopColor="#6fb7ff" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="d-edge" x1="-0.8" y1="-1" x2="1" y2="1" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="0.5" stopColor="#a594ff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.6" />
          </linearGradient>
          <filter id="d-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.12" />
          </filter>
        </defs>
        <path
          d="M-0.75 -1 L0 -1 A1 1 0 0 1 0 1 L-0.75 1 Z M-0.32 -0.56 L0 -0.56 A0.56 0.56 0 0 1 0 0.56 L-0.32 0.56 Z"
          fill="#5b3df5"
          fillRule="evenodd"
          opacity="0.35"
          filter="url(#d-glow)"
        />
        <path
          d="M-0.75 -1 L0 -1 A1 1 0 0 1 0 1 L-0.75 1 Z M-0.32 -0.56 L0 -0.56 A0.56 0.56 0 0 1 0 0.56 L-0.32 0.56 Z"
          fill="url(#d-fill)"
          fillRule="evenodd"
          stroke="url(#d-edge)"
          strokeWidth="0.018"
        />
      </svg>
    </>
  );
}
