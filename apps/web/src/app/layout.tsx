import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import localFont from "next/font/local";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";
import { AutumnWrapper } from "@/components/AutumnProvider";
import { Toaster } from "@/components/ui/sonner";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rockGrotesk = localFont({
  variable: "--font-rock-grotesk",
  src: [
    {
      path: "../fonts/Kostic - Roc Grotesk Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/Kostic - Roc Grotesk Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Kostic - Roc Grotesk Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Kostic - Roc Grotesk Bold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/Kostic - Roc Grotesk ExtraBold.otf",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "jym.coach | adaptive fitness coach",
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
        className={`${outfit.variable} ${geistMono.variable} ${rockGrotesk.variable} font-sans antialiased`}
      >
        <ConvexClientProvider>
          <AutumnWrapper>
            {children}
            <Toaster />
          </AutumnWrapper>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
