import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import UserNav from "@/components/UserNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Northeastern Data Club",
  description: "Music preference analysis and group formation platform",
};

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
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl font-bold text-purple-600">🎵</div>
                    <h1 className="text-xl font-semibold text-gray-900">
                      Northeastern Data Club
                    </h1>
                  </div>
                  <UserNav />
                </div>
              </div>
            </nav>
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
