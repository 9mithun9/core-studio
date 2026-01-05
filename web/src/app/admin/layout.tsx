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
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
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
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 md:py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/admin/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
              <Image
                src="/logo.png"
                alt="Core Studio Pilates"
                width={96}
                height={96}
                className="object-contain w-20 h-20 md:w-24 md:h-24"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-2">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/admin/registrations"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.registrations')}
              </Link>
              <Link
                href="/admin/customers"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.customers')}
              </Link>
              <Link
                href="/admin/teachers"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.teachers')}
              </Link>
              <Link
                href="/admin/schedule"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.schedule')}
              </Link>
              <Link
                href="/admin/finance"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.finance')}
              </Link>
              <Link
                href="/admin/reports"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.reports')}
              </Link>
              <Link
                href="/admin/marketing"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.marketing')}
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 md:gap-4">
              <LanguageSwitcher />
              <NotificationBell />

              {/* Admin Profile */}
              <div className="hidden md:flex items-center gap-3 px-3 py-2 text-sm text-gray-700 font-medium border-l border-gray-200 ml-2 pl-5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-purple-200">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden xl:inline font-semibold">{user?.name}</span>
              </div>

              {/* Desktop Logout */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex text-sm font-medium border-gray-300 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50"
              >
                {t('common:logout', { ns: 'common' })}
              </Button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
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
            <nav className="xl:hidden mt-5 pb-4 border-t border-gray-200 pt-5 space-y-2">
              <Link
                href="/admin/dashboard"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/admin/registrations"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.registrations')}
              </Link>
              <Link
                href="/admin/customers"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.customers')}
              </Link>
              <Link
                href="/admin/teachers"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.teachers')}
              </Link>
              <Link
                href="/admin/schedule"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.schedule')}
              </Link>
              <Link
                href="/admin/finance"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.finance')}
              </Link>
              <Link
                href="/admin/reports"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.reports')}
              </Link>
              <Link
                href="/admin/marketing"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.marketing')}
              </Link>
              <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 mt-3 pt-3 border-t border-gray-200">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-purple-200">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <span>{user?.name}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full mt-3 font-medium border-gray-300 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50"
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
