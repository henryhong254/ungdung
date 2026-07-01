import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM",
  description: "Quản lý khách hàng",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6" style={{ background: "var(--bg-page)" }}>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
