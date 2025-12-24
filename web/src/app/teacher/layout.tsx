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

  useEffect(() => {
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
    const fetchProfile = async () => {
      try {
        const profile: any = await apiClient.get('/teachers/me');
        setTeacherProfile(profile.teacher);
      } catch (error) {
        console.error('Failed to fetch teacher profile:', error);
      }
    };
    fetchProfile();
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
            <Link href="/teacher/dashboard">
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
                href="/teacher/dashboard"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/teacher/my-calendar"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                {t('nav.myCalendar')}
              </Link>
              <Link
                href="/teacher/students"
                className="text-gray-600 hover:text-primary-600 font-medium"
              >
                {t('nav.students')}
              </Link>
              <div className="flex items-center gap-3 border-l pl-6">
                <LanguageSwitcher />
                <NotificationBell />
                <Link
                  href="/teacher/profile"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 font-medium cursor-pointer"
                >
                  {teacherProfile?.imageUrl ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${teacherProfile.imageUrl}`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{user.name}</span>
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  {t('common:logout', { ns: 'common' })}
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
