'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = authService.getStoredUser();
    if (!storedUser) {
      router.push('/auth/login');
      return;
    }
    if (storedUser.role !== 'admin') {
      router.push('/');
      return;
    }
    setUser(storedUser);
  }, [router]);

  const handleLogout = () => {
    authService.clearAuth();
    router.push('/');
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin/dashboard">
              <Image
                src="/logo.png"
                alt="Core Studio Pilates"
                width={200}
                height={80}
                className="h-16 w-auto"
                priority
              />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/admin/dashboard"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/registrations"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                Registrations
              </Link>
              <Link
                href="/admin/bookings"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                Bookings
              </Link>
              <Link
                href="/admin/customers"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                Customers
              </Link>
              <Link
                href="/admin/teachers"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                Teachers
              </Link>
              <Link
                href="/admin/schedule"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                Schedule
              </Link>
              <Link
                href="/admin/calendar"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                Calendar Sync
              </Link>
              <Link
                href="/admin/finance"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                Finance
              </Link>
              <div className="flex items-center gap-3 border-l pl-6">
                <NotificationBell />
                <span className="text-sm text-gray-600">
                  {user.name}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
