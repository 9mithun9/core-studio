'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { authService } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import '@/lib/i18n';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation(['customer', 'common']);
  const [user, setUser] = useState<any>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/customer/dashboard" className="flex items-center gap-2 md:gap-3">
              <Image
                src="/logo.png"
                alt="Core Studio Pilates"
                width={40}
                height={40}
                className="object-contain w-8 h-8 md:w-10 md:h-10"
              />
              <div className="text-lg md:text-2xl font-bold text-primary-600 hidden sm:block">
                Core Studio Pilates
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link
                href="/customer/dashboard"
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/customer/packages"
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                {t('nav.packages')}
              </Link>
              <Link
                href="/customer/teachers"
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                {t('nav.teachers')}
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              <LanguageSwitcher />
              <NotificationBell />

              {/* Profile */}
              <Link
                href="/customer/profile"
                className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 font-medium cursor-pointer transition-colors border-l pl-3 md:pl-4"
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
                <span className="hidden xl:inline">{user?.name}</span>
              </Link>

              {/* Desktop Logout */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex text-sm"
              >
                {t('common:logout', { ns: 'common' })}
              </Button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-primary-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden mt-4 pb-4 border-t pt-4 space-y-3">
              <Link
                href="/customer/dashboard"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/customer/packages"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.packages')}
              </Link>
              <Link
                href="/customer/teachers"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.teachers')}
              </Link>
              <Link
                href="/customer/profile"
                className="block py-2 text-gray-600 hover:text-primary-600 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {customerProfile?.profilePhoto ? (
                  customerProfile.profilePhoto.startsWith('http') ? (
                    <img
                      src={customerProfile.profilePhoto}
                      alt={user?.name}
                      className="w-6 h-6 rounded-full object-cover border border-primary-200"
                    />
                  ) : (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${customerProfile.profilePhoto}`}
                      alt={user?.name}
                      className="w-6 h-6 rounded-full object-cover border border-primary-200"
                    />
                  )
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {t('nav.profile')}
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full mt-2"
              >
                {t('common:logout', { ns: 'common' })}
              </Button>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
