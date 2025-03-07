/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['api.thalesmarket.io', 'overtimemarkets.xyz', 'www.svgrepo.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify')
    };
    return config;
  },
}

module.exports = nextConfig
