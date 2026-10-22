import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Free Digital Marketing Consultation | Prasidhika Shakya",
  description:
    "Book a free one-hour AI-powered digital marketing consultation and leave with a personalized plan for your business.",
  openGraph: {
    title: "Get a Free Digital Marketing Plan Made for Your Business",
    description:
      "Book a free one-hour AI marketing consultation and get a plan you can start using right away.",
    type: "website",
    siteName: "Prasidhika Shakya — Digital Marketing Strategy",
  },
  twitter: {
    card: "summary",
    title: "Free Digital Marketing Consultation | Prasidhika Shakya",
    description: "Get a personalized digital marketing plan for your business.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
