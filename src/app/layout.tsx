import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OTracker | The Command Center for Modern Businesses",
    template: "%s | OTracker",
  },
  description: "The ultimate management portal for tailoring, hair, and logistics brands. Oversee your operations remotely, manage orders, and build radical trust with real-time tracking.",
  metadataBase: new URL("https://www.otracker.net"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "OTracker - The International Business Dashboard",
    description: "Empowering vendors to manage production and shipments from anywhere. The #1 tool for business oversight and customer transparency.",
    url: "https://www.otracker.net",
    siteName: "OTracker",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OTracker Business Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OTracker - Business Command Center",
    description: "Professional management and tracking for modern global brands.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/og-image.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"

      appearance={{
        variables: { colorPrimary: '#191A43' }
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "Person",
                    "@id": "https://www.otracker.net/#person",
                    "name": "Angela Adjei",
                    "jobTitle": "Founder & Full-stack Developer",
                    "url": "https://www.otracker.net",
                    "worksFor": { "@id": "https://www.otracker.net/#organization" },
                    "sameAs": [
                      "https://www.linkedin.com/in/angela-adjei-otracker",
                      "https://github.com/naatswei",
                      "https://www.instagram.com/iam.angie_aa"
                    ]
                  },
                  {
                    "@type": "Organization",
                    "@id": "https://www.otracker.net/#organization",
                    "name": "OTracker",
                    "url": "https://www.otracker.net",
                    "logo": "https://www.otracker.net/og-image.png",
                    "contactPoint": {
                      "@type": "ContactPoint",
                      "contactType": "customer service",
                      "email": "support@otracker.net"
                    },
                    "founder": { "@id": "https://www.otracker.net/#person" }
                  }
                ]
              })
            }}
          />
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}

