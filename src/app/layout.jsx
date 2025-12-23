import './globals.css'

export const metadata = {
  title: 'Liftly',
  description: 'AI Powered Calorie Tracker',
  appleWebApp: {
    capable: true,
    title: 'Liftly',
    statusBarStyle: 'default',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
