const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: {
    root: './',
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
