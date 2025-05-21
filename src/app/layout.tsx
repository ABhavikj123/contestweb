import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProvider from "../components/ClientProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import CommonLayout from "../components/CommonLayout";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from "@vercel/analytics/next"
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contest App",
  description: "Contest's detail",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientProvider>
          <ThemeProvider>
            <CommonLayout>{children}
            <SpeedInsights />
            <Analytics />
            </CommonLayout>
          </ThemeProvider>
        </ClientProvider>
      </body>
    </html>
  );
}