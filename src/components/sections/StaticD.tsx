/**
 * Static stand-in for the hero's glass D (phones, reduced motion, no WebGL2). Same
 * outline as the 3D geometry in GlassD.tsx (stem + half-disc bowl with a matching
 * counter), centred behind the name. No animation, no JS.
 */
export function StaticD() {
  const d = 'M-0.75 -1 L0 -1 A1 1 0 0 1 0 1 L-0.75 1 Z M-0.4 -0.64 L0 -0.64 A0.64 0.64 0 0 1 0 0.64 L-0.4 0.64 Z';
  return (
    <div className="static-d absolute inset-0">
      <div className="bg-room absolute inset-0" />
      <svg
        viewBox="-1.05 -1.25 2.3 2.5"
        className="absolute left-1/2 top-[47%] w-[58vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 md:w-[30vw]"
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
        <path d={d} fill="#5b3df5" fillRule="evenodd" opacity="0.35" filter="url(#d-glow)" />
        <path d={d} fill="url(#d-fill)" fillRule="evenodd" stroke="url(#d-edge)" strokeWidth="0.018" />
      </svg>
    </div>
  );
}
