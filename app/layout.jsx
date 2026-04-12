import "./globals.css";
import { Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import { SettingsProvider } from "@/context/SettingsContext";
import { Analytics } from "@vercel/analytics/next";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-barlow",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-code",
  display: "swap",
});

export const metadata = {
  title: "Needle - Tesla Cam Viewer",
  description:
    "View dashcam footage locally in your browser with complete privacy",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NeedleCam",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={`${barlowCondensed.variable} ${jetbrainsMono.variable}`}>
        <SettingsProvider>{children}</SettingsProvider>
        <Analytics />
      </body>
    </html>
  );
}
