import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
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
                url: "/master_logo.png",
                width: 500,
                height: 500,
                alt: "Black Health Intelligence logo",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: `${baseTitle} | Healthcare Innovation Portfolio`,
        description: baseDescription,
        images: ["/master_logo.png"],
    },
    icons: {
        icon: "/master_logo.png",
        shortcut: "/master_logo.png",
        apple: "/master_logo.png",
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
            <body className={`${inter.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
