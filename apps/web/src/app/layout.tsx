import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import localFont from "next/font/local";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const serif = localFont({
  variable: "--font-instrument-serif",
  src: [
    {
      path: "../fonts/Erode-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/Erode-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Erode-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Erode-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/Erode-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "JYM | adaptive fitness coach",
  description: "adaptive fitness coach",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${geistMono.variable} ${serif.variable} antialiased`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
