import './globals.css'
import { Barlow_Condensed } from 'next/font/google'

const barlowCondensed = Barlow_Condensed({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

export const metadata = {
  title: 'Liftly',
  description: 'The lifting app where nutrition serves your training',
  appleWebApp: {
    capable: true,
    title: 'Liftly',
    statusBarStyle: 'default',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={barlowCondensed.variable}>
      <body>{children}</body>
    </html>
  )
}
