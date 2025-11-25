import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: "Black Health Intelligence | Healthcare Innovation Portfolio",
    description: "Building the future of healthcare technology. Explore our portfolio of clinical practices and health SaaS solutions.",
    keywords: ["healthcare", "health technology", "medical innovation", "telehealth", "weight loss clinic"],
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
