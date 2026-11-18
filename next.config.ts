import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first: the generated gradient posters compress far better than as WebP.
    formats: ['image/avif', 'image/webp'],
    qualities: [70, 75],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
