import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pixless - Collaborative Pixel Art Canvas",
  description:
    "Collaborative pixel art canvas connected to a cloud-native serverless API gateway.",
  metadataBase: new URL("https://pixless.local"),
  applicationName: "Pixless",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full bg-canvas-bg text-slate-900 dark:text-slate-100"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-full flex-col bg-canvas-bg font-sans text-base antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
