
import SupabaseProvider from '@/providers/supabase-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import './globals.css';
import Navbar from '@/components/Navbar';
import type { Metadata } from "next";
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: "Bookify",
  description: "A personal library app for tracking books and discovering new reads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <link rel="icon" href="https://raw.githubusercontent.com/hridaya423/bookify/refs/heads/master/Bookify_logo-removebg-preview.png" sizes="any" />
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <SupabaseProvider>
            <Navbar />
            {children}
            <Toaster />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}