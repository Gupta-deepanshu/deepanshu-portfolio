import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="container-x flex min-h-svh flex-col justify-center outline-none">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-display text-[clamp(3rem,10vw,8rem)] leading-none">This reel is blank.</h1>
      <p className="mt-6 max-w-md text-muted">The page you were looking for doesn’t exist, or it moved.</p>
      <Link href="/" className="mt-10 w-fit rounded-full bg-fg px-5 py-3 text-sm font-medium text-bg transition-colors hover:bg-accent">
        Back to the home page
      </Link>
    </main>
  );
}
