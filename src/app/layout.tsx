import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CultureOS | The Forge",
  description: "Intellectual and Financial Life Command System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased`}>
        {/* Kita bungkus seluruh aplikasi dengan ThemeProvider untuk fitur Dark Mode */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Perhatikan: Tidak ada pemanggilan <Sidebar /> di sini.
            Isi (children) ini akan langsung digantikan oleh halaman Login, 
            atau digantikan oleh Layout (culture-lifestyle) yang sudah punya Sidebar-nya sendiri.
          */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}