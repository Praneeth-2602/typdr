/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose NEXTAUTH_URL to the client so redirects work on all hosts
  // (Vercel sets NEXTAUTH_URL automatically via the environment.)
  experimental: {
    serverComponentsExternalPackages: ["mongodb"],
  },
};

export default nextConfig;
