'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = authService.getStoredUser();

      if (!storedUser) {
        router.push('/auth/login');
        return;
      }

      if (storedUser.role !== 'customer') {
        router.push('/');
        return;
      }

      setUser(storedUser);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/customer/dashboard">
              <div className="text-2xl font-bold text-primary-600">Core Studio</div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/customer/dashboard"
                className="text-gray-600 hover:text-primary-600"
              >
                Dashboard
              </Link>
              <Link
                href="/customer/packages"
                className="text-gray-600 hover:text-primary-600"
              >
                Packages
              </Link>
              <Link
                href="/customer/teachers"
                className="text-gray-600 hover:text-primary-600"
              >
                Teachers
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link
                href="/customer/profile"
                className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Hi, {user?.name}
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
