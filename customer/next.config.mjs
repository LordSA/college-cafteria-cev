const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    agentUpgrade: 'security',
  },
};

export default nextConfig;
