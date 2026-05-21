// next.config.ts — Configuración de Next.js para GymBase (dominio de gimnasios)
import type { NextConfig } from 'next';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

// Headers de seguridad aplicados a todas las rutas
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // camera=(self) porque el escáner QR necesita acceso a la cámara del dispositivo
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-inline necesario para Tailwind; unsafe-eval solo en dev (requerido por Next.js HMR)
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // blob: para previews de fotos; data: para avatares inline; supabase para storage
      "img-src 'self' data: blob: https://*.supabase.co",
      // YouTube y Vimeo para embeds de contenido
      "media-src 'self' https://www.youtube.com https://player.vimeo.com",
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
      // wss: para el canal realtime de Supabase
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Turbopack detecta el workspace root desde lockfiles — apuntarlo al monorepo correcto
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  experimental: {
    // Aumentar el límite del body para Server Actions — necesario para uploads de comprobantes (hasta 5MB)
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
