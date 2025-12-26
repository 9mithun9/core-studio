'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { authService } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import '@/lib/i18n';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation(['admin', 'common']);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/admin/dashboard" className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Core Studio Pilates"
                width={80}
                height={80}
                className="object-contain w-16 h-16 md:w-20 md:h-20"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-4 lg:gap-6">
              <Link
                href="/admin/dashboard"
                className="text-sm lg:text-base text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/admin/registrations"
                className="text-sm lg:text-base text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {t('nav.registrations')}
              </Link>
              <Link
                href="/admin/customers"
                className="text-sm lg:text-base text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {t('nav.customers')}
              </Link>
              <Link
                href="/admin/teachers"
                className="text-sm lg:text-base text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {t('nav.teachers')}
              </Link>
              <Link
                href="/admin/schedule"
                className="text-sm lg:text-base text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {t('nav.schedule')}
              </Link>
              <Link
                href="/admin/finance"
                className="text-sm lg:text-base text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {t('nav.finance')}
              </Link>
              <Link
                href="/admin/marketing"
                className="text-sm lg:text-base text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {t('nav.marketing')}
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              <LanguageSwitcher />
              <NotificationBell />
              <span className="hidden lg:inline text-sm text-gray-600 border-l pl-3">
                {user.name}
              </span>
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
                className="xl:hidden p-2 text-gray-600 hover:text-primary-600"
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
            <nav className="xl:hidden mt-4 pb-4 border-t pt-4 space-y-3">
              <Link
                href="/admin/dashboard"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/admin/registrations"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.registrations')}
              </Link>
              <Link
                href="/admin/customers"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.customers')}
              </Link>
              <Link
                href="/admin/teachers"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.teachers')}
              </Link>
              <Link
                href="/admin/schedule"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.schedule')}
              </Link>
              <Link
                href="/admin/finance"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.finance')}
              </Link>
              <Link
                href="/admin/marketing"
                className="block py-2 text-gray-600 hover:text-primary-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.marketing')}
              </Link>
              <div className="pt-3 border-t">
                <div className="text-sm text-gray-600 mb-2">{user.name}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  {t('common:logout', { ns: 'common' })}
                </Button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
