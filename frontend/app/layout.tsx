import type { Metadata } from "next";
import "./globals.css";

// Using system fonts as fallback when Google Fonts cannot be fetched
// Original fonts: Geist and Geist Mono from Google Fonts
// Fallback: System UI fonts for better compatibility

export const metadata: Metadata = {
  title: "Pixelhub - Collaborative Pixel Art Canvas",
  description:
    "Collaborative pixel art canvas connected to a cloud-native serverless API gateway.",
  metadataBase: new URL("https://pixless.local"),
  applicationName: "Pixelhub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full bg-canvas-bg text-foreground"
    >
      <body
        className="flex min-h-full flex-col bg-canvas-bg text-foreground font-sans text-base antialiased"
        style={{
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
