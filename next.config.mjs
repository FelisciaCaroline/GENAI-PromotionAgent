/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
    // Pastikan CSV contoh ikut ter-bundle di Vercel
    outputFileTracingIncludes: { "/api/**/*": ["./data/**/*", "./assets/**/*"] },
  },
};
export default nextConfig;
