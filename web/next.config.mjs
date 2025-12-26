/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  // Enable static export for Capacitor builds when CAPACITOR_BUILD is set
  ...(process.env.CAPACITOR_BUILD === 'true' && {
    output: 'export',
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;
