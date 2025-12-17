'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
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

      // Fetch customer profile to get profilePhoto
      try {
        const profile: any = await apiClient.get('/customers/me/overview');
        setCustomerProfile(profile.customer);
      } catch (error) {
        console.error('Failed to fetch customer profile:', error);
      }

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
            <Link href="/customer/dashboard" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Core Studio Pilates"
                width={40}
                height={40}
                className="object-contain"
              />
              <div className="text-2xl font-bold text-primary-600">Core Studio Pilates</div>
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

            <div className="flex items-center gap-3 border-l pl-6">
              <NotificationBell />
              <Link
                href="/customer/profile"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 font-medium cursor-pointer"
              >
                {customerProfile?.profilePhoto ? (
                  customerProfile.profilePhoto.startsWith('http') ? (
                    <img
                      src={customerProfile.profilePhoto}
                      alt={user?.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-200"
                    />
                  ) : (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${customerProfile.profilePhoto}`}
                      alt={user?.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-200"
                    />
                  )
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{user?.name}</span>
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
