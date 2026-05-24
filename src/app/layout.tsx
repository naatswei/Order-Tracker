import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "OTracker | The Command Center for Modern Businesses",
    template: "%s | OTracker",
  },
  description: "The ultimate management portal for all businesses. Oversee your operations remotely, manage orders and inventory, and build radical trust with real-time tracking.",
  metadataBase: new URL("https://www.otracker.net"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "OTracker - The International Business Dashboard",
    description: "Empowering businesses to manage operations, inventory, and orders from anywhere. The #1 tool for business oversight and customer transparency.",
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
    description: "Professional operations and inventory management for modern global brands.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "any" },
      { url: "/og-image.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    google: "c8dc2732d1cfb512", // Matched with public/googlec8dc2732d1cfb512.html
    other: {
      me: ["support@otracker.net"],
      "msvalidate.01": ["7358BA483273947D2982C260D411B51E"],
      "google-merchant-verification": ["YOUR_MERCHANT_CENTER_CODE"], // Add your code here from Google Merchant Center
    },
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
                      "founder": { "@id": "https://www.otracker.net/#person" },
                      "sameAs": [
                        "https://www.instagram.com/otracker_net",
                        "https://www.linkedin.com/company/otracker"
                      ]
                    },
                    {
                      "@type": "SoftwareApplication",
                      "name": "OTracker",
                      "operatingSystem": "All",
                      "applicationCategory": "BusinessApplication",
                      "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "GHS"
                      },
                      "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": "5",
                        "reviewCount": "24"
                      }
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

