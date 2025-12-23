export default function manifest() {
  return {
    name: 'Liftly',
    short_name: 'Liftly',
    description: 'AI Powered Calorie Tracker',
    start_url: '/',
    display: 'standalone',
    background_color: '#3B3042',
    theme_color: '#3B3042',
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
