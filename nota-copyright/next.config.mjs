/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",  // for specimen uploads
    },
  },
  transpilePackages: ["@nota-lawyer/shared"],
  // Allow Supabase storage URLs for next/image
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
