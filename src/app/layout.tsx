import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vendero Admin',
  description: 'Operations, moderation, growth, and platform oversight for Vendero.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
