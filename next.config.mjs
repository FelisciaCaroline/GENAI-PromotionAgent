/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
    outputFileTracingIncludes: { "/api/**/*": ["./data/**/*", "./assets/**/*"] },
  },
};

export default nextConfig;