import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'canvas'],
  images: {
    // Hotfix: cota de Image Optimization da Vercel esgotada (/_next/image
    // respondia 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED e as fotos
    // quebravam). Com unoptimized, todo <Image> usa a URL original do
    // Supabase direto. Rever na fase de performance (loader do Supabase).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
