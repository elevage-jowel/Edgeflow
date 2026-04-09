/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1'

const nextConfig = {
  // Sur Vercel : pas de static export (Vercel gère Next.js nativement)
  // Sur OVH : static export activé
  ...(isVercel ? {} : { output: 'export' }),
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

module.exports = nextConfig
