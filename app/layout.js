import { Inter } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import { headers } from 'next/headers';
import LogoutButton from './LogoutButton';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Article Tracker Platform",
  description: "Monitor article publications across all your platforms",
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-[#18181b] text-gray-200`} suppressHydrationWarning>
        {!isLoginPage && (
          <nav className="bg-[#18181b] border-b border-[#3f3f46] sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
              <Link href="/dashboard" className="text-base font-bold text-white">
                HG Agency Article Tracker
              </Link>
              <div className="flex items-center gap-6">
                <div className="flex gap-6 font-medium text-sm text-gray-400">
                  <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                  <Link href="/sites" className="hover:text-white transition-colors">Manage Sites</Link>
                </div>
                <LogoutButton />
              </div>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
