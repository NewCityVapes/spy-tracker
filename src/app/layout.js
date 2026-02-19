import './globals.css'

export const metadata = {
  title: 'SPY Tracker',
  description: 'Professional SPY day trading journal and analytics',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
