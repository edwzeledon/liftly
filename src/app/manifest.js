export default function manifest() {
  return {
    name: 'Liftly',
    short_name: 'Liftly',
    description: 'The lifting app where nutrition serves your training',
    start_url: '/',
    display: 'standalone',
    background_color: '#4f46e5',
    theme_color: '#4f46e5',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  }
}
