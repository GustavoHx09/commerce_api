import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './context/AuthContext';

export const metadata: Metadata = {
  title: 'Commerce API',
  description: 'Frontend do monorepo commerce API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
