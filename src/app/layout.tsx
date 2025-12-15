import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * SEO metadata for VibeRecipe.
 */
export const metadata: Metadata = {
  title: "VibeRecipe - Transform Chaos Into Delicious Structure",
  description: "Extract recipes from URLs, screenshots, or text using AI. Convert to structured JSON-LD format and import directly to Tandoor Recipes.",
  keywords: ["recipe", "extractor", "AI", "Tandoor", "JSON-LD", "cooking"],
  authors: [{ name: "VibeRecipe" }],
  openGraph: {
    title: "VibeRecipe",
    description: "Transform chaos into delicious structure. Extract recipes with AI.",
    type: "website",
  },
};

/**
 * Root layout component for the application.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
