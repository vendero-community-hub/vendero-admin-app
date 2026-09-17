import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

const umamiScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim()
const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim()
const umamiDomains = process.env.NEXT_PUBLIC_UMAMI_DOMAINS?.trim()

export const metadata: Metadata = {
  title: 'Vendero Admin',
  description: 'Operations, moderation, growth, and platform oversight for Vendero.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        {umamiScriptUrl && umamiWebsiteId ? (
          <Script
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
            data-domains={umamiDomains || undefined}
            data-exclude-search="true"
            data-exclude-hash="true"
            data-do-not-track="true"
            data-performance="true"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  )
}
