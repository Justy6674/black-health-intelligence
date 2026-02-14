import type { Metadata } from "next";
import { Inter, Chakra_Petch } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const dynamic = 'force-dynamic'

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
});

const chakraPetch = Chakra_Petch({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: '--font-chakra',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blackhealthintelligence.com';
const baseTitle = "Black Health Intelligence";
const baseDescription = "Medicare-compliant telehealth intelligence, clinical portfolio insights, and disaster-ready data for Australian healthcare teams.";

export const metadata: Metadata = {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: {
        default: `${baseTitle} | Healthcare Innovation Portfolio`,
        template: `%s | ${baseTitle}`,
    },
    description: baseDescription,
    keywords: [
        "healthcare",
        "health technology",
        "medical innovation",
        "telehealth",
        "Medicare telehealth",
        "disaster support",
        "weight loss clinic",
    ],
    openGraph: {
        title: `${baseTitle} | Healthcare Innovation Portfolio`,
        description: baseDescription,
        url: siteUrl,
        siteName: baseTitle,
        type: "website",
        images: [
            {
                url: "/opengraph-image",
                width: 1200,
                height: 630,
                alt: "Black Health Intelligence - Healthcare Innovation Portfolio",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: `${baseTitle} | Healthcare Innovation Portfolio`,
        description: baseDescription,
        images: ["/opengraph-image"],
    },
    icons: {
        icon: "/FAVICON.png",
        shortcut: "/FAVICON.png",
        apple: "/FAVICON.png",
    },
    alternates: {
        canonical: "/",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className={`${inter.variable} ${chakraPetch.variable} antialiased`}>
                {children}
                <Analytics />
            </body>
        </html>
    );
}
