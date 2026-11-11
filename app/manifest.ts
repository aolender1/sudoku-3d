import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KUBIK Sudoku — 3D & 2D Clásico',
    short_name: 'KUBIK Sudoku',
    description:
      'Juego de Sudoku táctil en 3D (Three.js) y 2D clásico con 6 niveles de dificultad, modo notas, pistas inteligentes y soporte sin conexión.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0e131f',
    theme_color: '#1d4ed8',
    lang: 'es',
    categories: ['games', 'puzzle', 'education'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
