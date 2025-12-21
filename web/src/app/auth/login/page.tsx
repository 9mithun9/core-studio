'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/lib/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t, ready } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      // Redirect based on role
      switch (response.user.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'teacher':
          router.push('/teacher/dashboard');
          break;
        case 'customer':
          router.push('/customer/dashboard');
          break;
        default:
          router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader className="text-center space-y-2 pb-6">
            <Link href="/" className="inline-block">
              <div className="text-2xl md:text-3xl font-bold text-primary-600 mb-2 hover:text-primary-700 transition-colors">
                Core Studio
              </div>
            </Link>
            <CardTitle className="text-xl md:text-2xl">{t('login.title')}</CardTitle>
            <CardDescription className="text-sm md:text-base">{t('login.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  {t('login.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                  placeholder={t('login.emailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  {t('login.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                className="w-full text-sm md:text-base py-2 md:py-2.5"
                disabled={loading}
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">{t('login.noAccount')} </span>
              <Link href="/auth/register" className="text-primary-600 hover:underline font-medium">
                {t('login.signUpLink')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
