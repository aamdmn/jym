import type { Metadata } from "next";
import { Geist_Mono, Outfit } from "next/font/google";
import localFont from "next/font/local";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";
import { AutumnWrapper } from "@/components/AutumnProvider";

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
      path: "../fonts/Fontspring-DEMO-rocgrotesk-light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/Fontspring-DEMO-rocgrotesk-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Fontspring-DEMO-rocgrotesk-medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Fontspring-DEMO-rocgrotesk-bold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/Fontspring-DEMO-rocgrotesk-extrabold.otf",
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
        className={`${outfit.variable} ${geistMono.variable} ${rockGrotesk.variable} font-sans antialiased`}
      >
        <ConvexClientProvider>
          <AutumnWrapper>{children}</AutumnWrapper>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
