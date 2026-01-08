'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
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
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Well-being Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, top: '-100px', bottom: 0 }}>
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/background-1.jpg"
            alt="Background"
            fill
            className="object-cover blur-sm"
            priority
            quality={100}
          />
        </div>
        {/* Falling snowflakes - actual snowflake shapes */}
        <svg className="absolute top-0 left-[5%] w-8 h-8 text-purple-400/70 animate-fall-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L13 8L12 11L11 8L12 0ZM12 13L13 16L12 24L11 16L12 13ZM0 12L8 11L11 12L8 13L0 12ZM13 12L16 11L24 12L16 13L13 12ZM4 4L9 9L7 11L4 8L2 11L4 4ZM15 13L17 15L20 20L15 17L13 15L15 13ZM20 4L18 7L15 10L17 13L20 20L22 13L15 10L18 7L20 4Z"/>
        </svg>
        <svg className="absolute top-0 left-[15%] w-7 h-7 text-blue-300/60 animate-fall-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L12.5 10L12 12L11.5 10L12 2ZM12 14L12.5 16L12 22L11.5 16L12 14ZM2 12L10 11.5L12 12L10 12.5L2 12ZM14 12L16 11.5L22 12L16 12.5L14 12ZM5 5L10 10L8 12L5 9L3 12L5 5ZM16 12L18 14L19 19L16 16L14 14L16 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[25%] w-6 h-6 text-pink-400/65 animate-fall-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L12.5 9L12 11L11.5 9L12 1ZM12 13L12.5 15L12 23L11.5 15L12 13ZM1 12L9 11.5L11 12L9 12.5L1 12ZM13 12L15 11.5L23 12L15 12.5L13 12ZM4 4L9.5 9.5L7.5 11.5L4 8L2 11.5L4 4Z"/>
        </svg>
        <svg className="absolute top-0 left-[35%] w-7 h-7 text-purple-300/55 animate-fall-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L12.5 8L12 11L11.5 8L12 0ZM12 13L12.5 16L12 24L11.5 16L12 13ZM0 12L8 11L11 12L8 13L0 12ZM13 12L16 11L24 12L16 13L13 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[45%] w-8 h-8 text-indigo-400/65 animate-fall-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L12.5 10L12 12L11.5 10L12 2ZM12 14L12.5 16L12 22L11.5 16L12 14ZM2 12L10 11.5L12 12L10 12.5L2 12ZM14 12L16 11.5L22 12L16 12.5L14 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[55%] w-6 h-6 text-blue-400/60 animate-fall-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L12.5 9L12 11L11.5 9L12 1ZM12 13L12.5 15L12 23L11.5 15L12 13ZM1 12L9 11.5L11 12L9 12.5L1 12ZM13 12L15 11.5L23 12L15 12.5L13 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[65%] w-7 h-7 text-pink-300/65 animate-fall-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L12.5 8L12 11L11.5 8L12 0ZM12 13L12.5 16L12 24L11.5 16L12 13ZM0 12L8 11L11 12L8 13L0 12ZM13 12L16 11L24 12L16 13L13 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[75%] w-6 h-6 text-purple-400/60 animate-fall-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L12.5 9L12 11L11.5 9L12 1ZM12 13L12.5 15L12 23L11.5 15L12 13ZM1 12L9 11.5L11 12L9 12.5L1 12ZM13 12L15 11.5L23 12L15 12.5L13 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[85%] w-8 h-8 text-blue-300/65 animate-fall-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L12.5 10L12 12L11.5 10L12 2ZM12 14L12.5 16L12 22L11.5 16L12 14ZM2 12L10 11.5L12 12L10 12.5L2 12ZM14 12L16 11.5L22 12L16 12.5L14 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[95%] w-6 h-6 text-indigo-300/60 animate-fall-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L12.5 9L12 11L11.5 9L12 1ZM12 13L12.5 15L12 23L11.5 15L12 13ZM1 12L9 11.5L11 12L9 12.5L1 12ZM13 12L15 11.5L23 12L15 12.5L13 12Z"/>
        </svg>
      </div>

      {/* Floating Header */}
      <header className="relative z-50">
        <div className="container mx-auto px-4 pt-6">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/teacher/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
              <Image
                src="/logo-2.png"
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
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/teacher/dashboard'
                    ? 'text-orange-600'
                    : 'text-gray-700 hover:text-orange-600'
                }`}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/teacher/my-calendar"
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/teacher/my-calendar'
                    ? 'text-orange-600'
                    : 'text-gray-700 hover:text-orange-600'
                }`}
              >
                {t('nav.myCalendar')}
              </Link>
              <Link
                href="/teacher/students"
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/teacher/students'
                    ? 'text-orange-600'
                    : 'text-gray-700 hover:text-orange-600'
                }`}
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
                className="hidden md:flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:text-orange-600 hover:bg-orange-50 font-medium rounded-lg transition-all border-l border-gray-200 ml-2 pl-5"
              >
                {teacherProfile?.imageUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${teacherProfile.imageUrl}`}
                    alt={user?.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-orange-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold ring-2 ring-orange-200">
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
                className="hidden md:flex text-sm font-medium border-gray-300 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
              >
                {t('common:logout', { ns: 'common' })}
              </Button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
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
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/teacher/dashboard'
                    ? 'text-orange-600'
                    : 'text-gray-700 hover:text-orange-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/teacher/my-calendar"
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/teacher/my-calendar'
                    ? 'text-orange-600'
                    : 'text-gray-700 hover:text-orange-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.myCalendar')}
              </Link>
              <Link
                href="/teacher/students"
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/teacher/students'
                    ? 'text-orange-600'
                    : 'text-gray-700 hover:text-orange-600'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.students')}
              </Link>
              <Link
                href="/teacher/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {teacherProfile?.imageUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${teacherProfile.imageUrl}`}
                    alt={user?.name}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-orange-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold ring-2 ring-orange-200">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {t('nav.profile')}
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full mt-3 font-medium border-gray-300 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
              >
                {t('common:logout', { ns: 'common' })}
              </Button>
            </nav>
          )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-6 md:py-8" style={{ zIndex: 1 }}>{children}</main>
    </div>
  );
}
