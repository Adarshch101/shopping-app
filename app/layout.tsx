import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppContextProvider } from "@/components/providers/app-context";
import Header from "@/components/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopNow | Premium E-Commerce Store",
  description: "Browse high-quality electronics, accessories, lifestyle, and footwear items with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50 font-sans">
        <AppContextProvider>
          <Header />
          <main className="flex-grow flex flex-col">{children}</main>
          <footer className="w-full border-t border-zinc-100 bg-white py-6 dark:border-zinc-900 dark:bg-black mt-auto">
            <div className="mx-auto max-w-7xl px-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
              <p>&copy; {new Date().getFullYear()} ShopNow Inc. All rights reserved.</p>
              <p className="mt-1">Built with Next.js, Tailwind CSS, Supabase, and local database API routing.</p>
            </div>
          </footer>
        </AppContextProvider>
      </body>
    </html>
  );
}
