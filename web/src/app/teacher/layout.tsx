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

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation(['teacher', 'common']);
  const [user, setUser] = useState<any>(null);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = authService.getStoredUser();

      if (!storedUser) {
        router.push('/auth/login');
        return;
      }

      if (storedUser.role !== 'teacher') {
        router.push('/');
        return;
      }

      setUser(storedUser);

      // Fetch teacher profile to get imageUrl
      try {
        const profile: any = await apiClient.get('/teachers/me');
        setTeacherProfile(profile.teacher);
      } catch (error) {
        console.error('Failed to fetch teacher profile:', error);
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
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 md:py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/teacher/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
              <Image
                src="/logo.png"
                alt="Core Studio Pilates"
                width={96}
                height={96}
                className="object-contain w-20 h-20 md:w-24 md:h-24"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              <Link
                href="/teacher/dashboard"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/teacher/my-calendar"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.myCalendar')}
              </Link>
              <Link
                href="/teacher/students"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              >
                {t('nav.students')}
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 md:gap-4">
              <LanguageSwitcher />
              <NotificationBell />

              {/* Profile */}
              <Link
                href="/teacher/profile"
                className="hidden md:flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 font-medium rounded-lg transition-all border-l border-gray-200 ml-2 pl-5"
              >
                {teacherProfile?.imageUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${teacherProfile.imageUrl}`}
                    alt={user?.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-purple-200">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden xl:inline font-semibold">{user?.name}</span>
              </Link>

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
                className="lg:hidden p-2.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
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
            <nav className="lg:hidden mt-5 pb-4 border-t border-gray-200 pt-5 space-y-2">
              <Link
                href="/teacher/dashboard"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/teacher/my-calendar"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.myCalendar')}
              </Link>
              <Link
                href="/teacher/students"
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.students')}
              </Link>
              <Link
                href="/teacher/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {teacherProfile?.imageUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${teacherProfile.imageUrl}`}
                    alt={user?.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-purple-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-purple-200">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {t('nav.profile')}
              </Link>
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
