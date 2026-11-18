import { ImageResponse } from 'next/og';

interface PosterOptions {
  title: string;
  subtitle: string;
  kicker: string;
  corner: string;
  accent: string;
  width: number;
  height: number;
}

/**
 * Shared renderer for generated images: project posters (/posters/<slug>), the
 * site Open Graph image and per-project OG images. Rendered at build time by
 * next/og; no image assets are needed until real screenshots exist.
 */
export function renderPoster({ title, subtitle, kicker, corner, accent: a, width, height }: PosterOptions) {
  const s = width / 1600;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80 * s,
          color: '#EDEAE4',
          backgroundColor: '#0B0B0D',
          backgroundImage: [
            `radial-gradient(circle at 78% 22%, ${a}cc 0%, ${a}33 26%, transparent 55%)`,
            `radial-gradient(circle at 12% 95%, ${a}55 0%, transparent 45%)`,
            'linear-gradient(160deg, #15151A 0%, #0B0B0D 60%)',
          ].join(', '),
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30 * s, letterSpacing: 4 * s, opacity: 0.75 }}>
          <span>{kicker}</span>
          <span>{corner}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 * s }}>
          <div style={{ fontSize: 150 * s, fontWeight: 700, letterSpacing: -6 * s, lineHeight: 1 }}>{title}</div>
          <div style={{ fontSize: 40 * s, opacity: 0.72, maxWidth: 1150 * s }}>{subtitle}</div>
          <div style={{ display: 'flex', width: 160 * s, height: 6 * s, backgroundColor: a, marginTop: 16 * s }} />
        </div>
      </div>
    ),
    { width, height },
  );
}
